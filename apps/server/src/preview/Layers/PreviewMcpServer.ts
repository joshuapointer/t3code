/**
 * PreviewMcpServer - In-process MCP server exposing `register_preview_url` to agents.
 *
 * Uses the Claude Agent SDK's `createSdkMcpServer` to define an in-process MCP server.
 * The tool accepts a local port, runs `tailscale funnel --bg <port>` to expose it
 * publicly, registers the resulting URL in the PreviewHub, and returns the public URL.
 *
 * Inject the returned config into `queryOptions.mcpServers` when starting a session.
 *
 * @module PreviewMcpServer
 */
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { Effect, Layer, ServiceMap } from "effect";
import { z } from "zod";

import { PreviewHub } from "../Services/PreviewHub.ts";
import { TailscaleFunnel } from "../Services/TailscaleFunnel.ts";

// ---------------------------------------------------------------------------
// Type alias so callers don't need to import from the SDK
// ---------------------------------------------------------------------------
type McpSdkServerConfig = ReturnType<typeof createSdkMcpServer>;

// ---------------------------------------------------------------------------
// Service shape
// ---------------------------------------------------------------------------

export interface PreviewMcpServerShape {
  /**
   * Build an MCP server config for a specific agent session.
   * `getProjectId` is called lazily at tool-use time.
   */
  readonly buildMcpServerConfig: (opts: {
    readonly threadId: string;
    readonly getProjectId: () => Promise<string>;
    readonly getTurnId: () => string | null;
  }) => McpSdkServerConfig;
}

// ---------------------------------------------------------------------------
// Service tag
// ---------------------------------------------------------------------------

export class PreviewMcpServer extends ServiceMap.Service<PreviewMcpServer, PreviewMcpServerShape>()(
  "t3/preview/Layers/PreviewMcpServer",
) {}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const makePreviewMcpServer = Effect.gen(function* () {
  const previewHub = yield* PreviewHub;
  const tailscaleFunnel = yield* TailscaleFunnel;

  const services = yield* Effect.services();
  const runPromise = Effect.runPromiseWith(services);

  const buildMcpServerConfig: PreviewMcpServerShape["buildMcpServerConfig"] = ({
    threadId,
    getProjectId,
    getTurnId,
  }) =>
    createSdkMcpServer({
      name: "t3-preview-hub",
      version: "1.0.0",
      tools: [
        tool(
          "register_preview_url",
          "Expose a local dev server port publicly via Tailscale Funnel and register it in the T3 Preview Hub so the user can track it. Call this whenever you start a local web server the user should view. Returns the public HTTPS URL.",
          {
            port: z
              .number()
              .int()
              .min(1)
              .max(65535)
              .describe("The local port your dev server is listening on"),
            label: z.string().optional().describe("Optional label (e.g. 'Next.js dev server')"),
          },
          async ({ port, label }) => {
            const resolvedProjectId = await getProjectId();
            const resolvedTurnId = getTurnId();

            let publicUrl: string;
            try {
              publicUrl = await runPromise(tailscaleFunnel.expose(port, label));
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              return {
                content: [{ type: "text" as const, text: `Failed to expose port ${port}: ${msg}` }],
                isError: true,
              };
            }

            await runPromise(
              previewHub
                .register({
                  id: crypto.randomUUID(),
                  threadId: threadId as any,
                  projectId: resolvedProjectId as any,
                  turnId: (resolvedTurnId as any) ?? null,
                  url: publicUrl,
                  label: label ?? null,
                  spawnedBy: "agent",
                  expiresAt: null,
                  metadata: { port },
                })
                .pipe(Effect.ignore),
            );

            return {
              content: [
                {
                  type: "text" as const,
                  text: `Preview registered: ${publicUrl}\n\nPort ${port} is now publicly accessible at ${publicUrl}. The user can view it in the T3 Preview Hub.`,
                },
              ],
            };
          },
        ),
      ],
    });

  return { buildMcpServerConfig } satisfies PreviewMcpServerShape;
});

// ---------------------------------------------------------------------------
// Layer
// ---------------------------------------------------------------------------

export const PreviewMcpServerLive = Layer.effect(PreviewMcpServer, makePreviewMcpServer);
