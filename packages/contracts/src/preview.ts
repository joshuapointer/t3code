import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";

import { IsoDateTime, ProjectId, ThreadId, TurnId } from "./baseSchemas";

// ---------------------------------------------------------------------------
// Core schemas
// ---------------------------------------------------------------------------

export const PreviewUrl = Schema.Struct({
  id: Schema.String,
  threadId: ThreadId,
  projectId: ProjectId,
  turnId: Schema.NullOr(TurnId),
  url: Schema.String,
  label: Schema.NullOr(Schema.String),
  spawnedBy: Schema.Literals(["agent", "user"]),
  status: Schema.Literals(["active", "expired", "removed"]),
  createdAt: IsoDateTime,
  expiresAt: Schema.NullOr(IsoDateTime),
  metadataJson: Schema.String,
});
export type PreviewUrl = typeof PreviewUrl.Type;

export const RegisterPreviewUrlInput = Schema.Struct({
  id: Schema.String,
  threadId: ThreadId,
  projectId: ProjectId,
  turnId: Schema.NullOr(TurnId),
  url: Schema.String,
  label: Schema.NullOr(Schema.String),
  spawnedBy: Schema.Literals(["agent", "user"]),
  expiresAt: Schema.NullOr(IsoDateTime),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});
export type RegisterPreviewUrlInput = typeof RegisterPreviewUrlInput.Type;

export const UpdatePreviewUrlStatusInput = Schema.Struct({
  id: Schema.String,
  status: Schema.Literals(["active", "expired", "removed"]),
});
export type UpdatePreviewUrlStatusInput = typeof UpdatePreviewUrlStatusInput.Type;

export class PreviewHubError extends Schema.TaggedErrorClass<PreviewHubError>()("PreviewHubError", {
  message: Schema.String,
}) {}

// ---------------------------------------------------------------------------
// WS method names
// ---------------------------------------------------------------------------

export const PREVIEW_WS_METHODS = {
  registerPreviewUrl: "preview.register",
  listPreviewUrlsByThread: "preview.listByThread",
  listPreviewUrlsByProject: "preview.listByProject",
  listPreviewUrlsByTurn: "preview.listByTurn",
  updatePreviewUrlStatus: "preview.updateStatus",
  deletePreviewUrl: "preview.delete",
  subscribePreviewEvents: "preview.subscribe",
} as const;

// ---------------------------------------------------------------------------
// Preview event for streaming
// ---------------------------------------------------------------------------

export const PreviewEvent = Schema.Union([
  Schema.Struct({ type: Schema.Literal("preview.registered"), preview: PreviewUrl }),
  Schema.Struct({
    type: Schema.Literal("preview.statusUpdated"),
    id: Schema.String,
    status: Schema.Literals(["active", "expired", "removed"]),
  }),
  Schema.Struct({ type: Schema.Literal("preview.deleted"), id: Schema.String }),
]);
export type PreviewEvent = typeof PreviewEvent.Type;

// ---------------------------------------------------------------------------
// Individual Rpc definitions
// ---------------------------------------------------------------------------

export const RegisterPreviewUrlRpc = Rpc.make(PREVIEW_WS_METHODS.registerPreviewUrl, {
  payload: RegisterPreviewUrlInput,
  success: PreviewUrl,
  error: PreviewHubError,
});

export const ListPreviewUrlsByThreadRpc = Rpc.make(PREVIEW_WS_METHODS.listPreviewUrlsByThread, {
  payload: Schema.Struct({ threadId: ThreadId }),
  success: Schema.Array(PreviewUrl),
  error: PreviewHubError,
});

export const ListPreviewUrlsByProjectRpc = Rpc.make(PREVIEW_WS_METHODS.listPreviewUrlsByProject, {
  payload: Schema.Struct({ projectId: ProjectId }),
  success: Schema.Array(PreviewUrl),
  error: PreviewHubError,
});

export const ListPreviewUrlsByTurnRpc = Rpc.make(PREVIEW_WS_METHODS.listPreviewUrlsByTurn, {
  payload: Schema.Struct({ turnId: TurnId }),
  success: Schema.Array(PreviewUrl),
  error: PreviewHubError,
});

export const UpdatePreviewUrlStatusRpc = Rpc.make(PREVIEW_WS_METHODS.updatePreviewUrlStatus, {
  payload: UpdatePreviewUrlStatusInput,
  error: PreviewHubError,
});

export const DeletePreviewUrlRpc = Rpc.make(PREVIEW_WS_METHODS.deletePreviewUrl, {
  payload: Schema.Struct({ id: Schema.String }),
  error: PreviewHubError,
});

export const SubscribePreviewEventsRpc = Rpc.make(PREVIEW_WS_METHODS.subscribePreviewEvents, {
  payload: Schema.Struct({ projectId: Schema.NullishOr(ProjectId) }),
  success: PreviewEvent,
  stream: true,
});
