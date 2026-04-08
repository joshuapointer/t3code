/**
 * PreviewHub - Service for managing dev preview URLs with pub/sub broadcast.
 *
 * Wraps PreviewUrlRepository and adds a PubSub-based event bus so clients
 * can stream live preview registration, status, and deletion events.
 *
 * @module PreviewHub
 */
import {
  type PreviewEvent,
  PreviewHubError,
  type RegisterPreviewUrlInput,
  type UpdatePreviewUrlStatusInput,
} from "@t3tools/contracts";
import { Effect, Layer, PubSub, ServiceMap, Stream } from "effect";
import type { ProjectId, ThreadId, TurnId } from "@t3tools/contracts";

import { PreviewUrlRepository } from "../../persistence/Services/PreviewUrls.ts";
import type { PreviewUrl } from "../../persistence/Services/PreviewUrls.ts";

// ---------------------------------------------------------------------------
// Service shape
// ---------------------------------------------------------------------------

export interface PreviewHubShape {
  readonly register: (input: RegisterPreviewUrlInput) => Effect.Effect<PreviewUrl, PreviewHubError>;
  readonly listByThread: (input: {
    threadId: ThreadId;
  }) => Effect.Effect<ReadonlyArray<PreviewUrl>, PreviewHubError>;
  readonly listByProject: (input: {
    projectId: ProjectId;
  }) => Effect.Effect<ReadonlyArray<PreviewUrl>, PreviewHubError>;
  readonly listByTurn: (input: {
    turnId: TurnId;
  }) => Effect.Effect<ReadonlyArray<PreviewUrl>, PreviewHubError>;
  readonly updateStatus: (
    input: UpdatePreviewUrlStatusInput,
  ) => Effect.Effect<void, PreviewHubError>;
  readonly delete: (input: { id: string }) => Effect.Effect<void, PreviewHubError>;
  readonly subscribe: (
    projectId: ProjectId | null | undefined,
  ) => Stream.Stream<PreviewEvent, PreviewHubError>;
}

// ---------------------------------------------------------------------------
// Service tag
// ---------------------------------------------------------------------------

export class PreviewHub extends ServiceMap.Service<PreviewHub, PreviewHubShape>()(
  "t3/preview/Services/PreviewHub",
) {}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const wrapRepoError =
  (context: string) =>
  (cause: unknown): PreviewHubError =>
    new PreviewHubError({
      message: cause instanceof Error ? `${context}: ${cause.message}` : context,
    });

const makePreviewHub = Effect.gen(function* () {
  const repo = yield* PreviewUrlRepository;
  const pubsub = yield* PubSub.unbounded<PreviewEvent>();

  const register: PreviewHubShape["register"] = (input) =>
    Effect.gen(function* () {
      const createdAt = new Date().toISOString();
      const metadataJson = JSON.stringify(input.metadata ?? {});

      const record: PreviewUrl = {
        id: input.id,
        threadId: input.threadId,
        projectId: input.projectId,
        turnId: input.turnId,
        url: input.url,
        label: input.label,
        spawnedBy: input.spawnedBy,
        status: "active",
        createdAt,
        expiresAt: input.expiresAt,
        metadataJson,
      };

      yield* repo.create(record);
      yield* PubSub.publish(pubsub, { type: "preview.registered", preview: record });
      return record;
    }).pipe(Effect.mapError(wrapRepoError("PreviewHub.register")));

  const listByThread: PreviewHubShape["listByThread"] = (input) =>
    repo
      .listByThreadId({ threadId: input.threadId })
      .pipe(Effect.mapError(wrapRepoError("PreviewHub.listByThread")));

  const listByProject: PreviewHubShape["listByProject"] = (input) =>
    repo
      .listByProjectId({ projectId: input.projectId })
      .pipe(Effect.mapError(wrapRepoError("PreviewHub.listByProject")));

  const listByTurn: PreviewHubShape["listByTurn"] = (input) =>
    repo
      .listByTurnId({ turnId: input.turnId })
      .pipe(Effect.mapError(wrapRepoError("PreviewHub.listByTurn")));

  const updateStatus: PreviewHubShape["updateStatus"] = (input) =>
    Effect.gen(function* () {
      yield* repo.updateStatus({ id: input.id, status: input.status });
      yield* PubSub.publish(pubsub, {
        type: "preview.statusUpdated",
        id: input.id,
        status: input.status,
      });
    }).pipe(Effect.mapError(wrapRepoError("PreviewHub.updateStatus")));

  const deletePreview: PreviewHubShape["delete"] = (input) =>
    Effect.gen(function* () {
      yield* repo.deleteById({ id: input.id });
      yield* PubSub.publish(pubsub, { type: "preview.deleted", id: input.id });
    }).pipe(Effect.mapError(wrapRepoError("PreviewHub.delete")));

  const subscribe: PreviewHubShape["subscribe"] = (projectId) => {
    const stream = Stream.fromPubSub(pubsub);
    if (projectId == null) {
      return stream;
    }
    return stream.pipe(
      Stream.filter((event) => {
        if (event.type === "preview.registered") {
          return event.preview.projectId === projectId;
        }
        // statusUpdated and deleted events don't carry projectId —
        // broadcast them to all subscribers and let the client filter.
        return true;
      }),
    );
  };

  return {
    register,
    listByThread,
    listByProject,
    listByTurn,
    updateStatus,
    delete: deletePreview,
    subscribe,
  } satisfies PreviewHubShape;
});

// ---------------------------------------------------------------------------
// Layer
// ---------------------------------------------------------------------------

export const PreviewHubLive = Layer.effect(PreviewHub, makePreviewHub);
