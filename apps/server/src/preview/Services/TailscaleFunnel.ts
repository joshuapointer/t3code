/**
 * TailscaleFunnel - Service for managing Tailscale Funnel port exposures.
 *
 * Runs `tailscale funnel --bg <port>` to expose a local port publicly via
 * Tailscale Funnel, and derives the public HTTPS URL from `tailscale status`.
 *
 * @module TailscaleFunnel
 */
import { Effect, Layer, ServiceMap } from "effect";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class TailscaleFunnelError extends Error {
  readonly _tag = "TailscaleFunnelError";
  constructor(message: string) {
    super(message);
    this.name = "TailscaleFunnelError";
  }
}

// ---------------------------------------------------------------------------
// Service shape
// ---------------------------------------------------------------------------

export interface TailscaleFunnelShape {
  /**
   * Expose a local port via Tailscale Funnel in the background.
   * Returns the public HTTPS URL for the port (e.g. https://jarch-linux.tail291dc.ts.net/port).
   *
   * If Tailscale Funnel is not available or fails, throws TailscaleFunnelError.
   */
  readonly expose: (port: number, label?: string) => Effect.Effect<string, TailscaleFunnelError>;

  /**
   * Stop exposing a previously funneled port.
   * Runs `tailscale funnel reset` — note: this resets ALL funnels on this host.
   */
  readonly reset: () => Effect.Effect<void, TailscaleFunnelError>;
}

// ---------------------------------------------------------------------------
// Service tag
// ---------------------------------------------------------------------------

export class TailscaleFunnel extends ServiceMap.Service<TailscaleFunnel, TailscaleFunnelShape>()(
  "t3/preview/Services/TailscaleFunnel",
) {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function spawnCommand(
  cmd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const { spawn } = require("node:child_process") as typeof import("node:child_process");
    const proc = spawn(cmd, args);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    proc.on("close", (exitCode: number | null) =>
      resolve({ stdout, stderr, exitCode: exitCode ?? 1 }),
    );
  });
}

async function getTailscaleDnsName(): Promise<string | null> {
  try {
    const result = await spawnCommand("tailscale", ["status", "--json"]);
    if (result.exitCode !== 0) return null;
    const status = JSON.parse(result.stdout) as { Self?: { DNSName?: string } };
    const dnsName = status.Self?.DNSName;
    if (!dnsName) return null;
    // DNSName has a trailing dot: "jarch-linux.tail291dc.ts.net."
    return dnsName.replace(/\.$/, "");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const makeTailscaleFunnel = Effect.sync(() => {
  const expose: TailscaleFunnelShape["expose"] = (port, _label) =>
    Effect.tryPromise({
      try: async () => {
        // Run tailscale funnel in background mode
        const result = await spawnCommand("tailscale", ["funnel", "--bg", String(port)]);
        if (result.exitCode !== 0) {
          throw new TailscaleFunnelError(
            `tailscale funnel failed (exit ${result.exitCode}): ${result.stderr.trim() || result.stdout.trim()}`,
          );
        }

        // Derive the public URL from the DNS name
        const dnsName = await getTailscaleDnsName();
        if (!dnsName) {
          throw new TailscaleFunnelError("Could not determine Tailscale DNS name from status");
        }

        // Tailscale Funnel exposes on standard HTTPS port (443) — the URL is just https://<hostname>
        // For non-80/443 ports, Tailscale routes via the port path if using serve,
        // but funnel directly exposes the port as the root. The public URL is simply:
        // https://<hostname> (port 443) which proxies to localhost:<port>
        //
        // If multiple ports are funneled, they each get their own path segment via `tailscale serve`.
        // With `tailscale funnel <port>`, the port IS the HTTPS root.
        return `https://${dnsName}`;
      },
      catch: (cause) =>
        cause instanceof TailscaleFunnelError
          ? cause
          : new TailscaleFunnelError(
              cause instanceof Error ? cause.message : "Unknown tailscale funnel error",
            ),
    });

  const reset: TailscaleFunnelShape["reset"] = () =>
    Effect.tryPromise({
      try: async () => {
        const result = await spawnCommand("tailscale", ["funnel", "reset"]);
        if (result.exitCode !== 0) {
          throw new TailscaleFunnelError(
            `tailscale funnel reset failed: ${result.stderr.trim() || result.stdout.trim()}`,
          );
        }
      },
      catch: (cause) =>
        cause instanceof TailscaleFunnelError
          ? cause
          : new TailscaleFunnelError(
              cause instanceof Error ? cause.message : "Unknown tailscale funnel reset error",
            ),
    });

  return { expose, reset } satisfies TailscaleFunnelShape;
});

// ---------------------------------------------------------------------------
// Layer
// ---------------------------------------------------------------------------

export const TailscaleFunnelLive = Layer.effect(TailscaleFunnel, makeTailscaleFunnel);
