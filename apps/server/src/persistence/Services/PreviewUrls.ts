/**
 * PreviewUrlRepository - Repository interface for dev preview hub URLs.
 *
 * Owns persistence operations for preview URL records spawned by agents
 * or users during development sessions.
 *
 * @module PreviewUrlRepository
 */
import { IsoDateTime, ProjectId, ThreadId, TurnId } from "@t3tools/contracts";
import { Option, Schema, ServiceMap } from "effect";
import type { Effect } from "effect";

import type { ProjectionRepositoryError } from "../Errors.ts";

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

export const CreatePreviewUrlInput = Schema.Struct({
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
export type CreatePreviewUrlInput = typeof CreatePreviewUrlInput.Type;

export const UpdatePreviewUrlStatusInput = Schema.Struct({
  id: Schema.String,
  status: Schema.Literals(["active", "expired", "removed"]),
});
export type UpdatePreviewUrlStatusInput = typeof UpdatePreviewUrlStatusInput.Type;

export const GetPreviewUrlInput = Schema.Struct({
  id: Schema.String,
});
export type GetPreviewUrlInput = typeof GetPreviewUrlInput.Type;

export const ListPreviewUrlsByThreadInput = Schema.Struct({
  threadId: ThreadId,
});
export type ListPreviewUrlsByThreadInput = typeof ListPreviewUrlsByThreadInput.Type;

export const ListPreviewUrlsByProjectInput = Schema.Struct({
  projectId: ProjectId,
});
export type ListPreviewUrlsByProjectInput = typeof ListPreviewUrlsByProjectInput.Type;

export const ListPreviewUrlsByTurnInput = Schema.Struct({
  turnId: TurnId,
});
export type ListPreviewUrlsByTurnInput = typeof ListPreviewUrlsByTurnInput.Type;

export const DeletePreviewUrlInput = Schema.Struct({
  id: Schema.String,
});
export type DeletePreviewUrlInput = typeof DeletePreviewUrlInput.Type;

/**
 * PreviewUrlRepositoryShape - Service API for preview URL records.
 */
export interface PreviewUrlRepositoryShape {
  /**
   * Insert a new preview URL record.
   */
  readonly create: (input: CreatePreviewUrlInput) => Effect.Effect<void, ProjectionRepositoryError>;

  /**
   * Read a preview URL record by id.
   */
  readonly getById: (
    input: GetPreviewUrlInput,
  ) => Effect.Effect<Option.Option<PreviewUrl>, ProjectionRepositoryError>;

  /**
   * Update the status of a preview URL record.
   */
  readonly updateStatus: (
    input: UpdatePreviewUrlStatusInput,
  ) => Effect.Effect<void, ProjectionRepositoryError>;

  /**
   * List preview URLs for a thread.
   *
   * Returned in deterministic creation order.
   */
  readonly listByThreadId: (
    input: ListPreviewUrlsByThreadInput,
  ) => Effect.Effect<ReadonlyArray<PreviewUrl>, ProjectionRepositoryError>;

  /**
   * List preview URLs for a project.
   *
   * Returned in deterministic creation order.
   */
  readonly listByProjectId: (
    input: ListPreviewUrlsByProjectInput,
  ) => Effect.Effect<ReadonlyArray<PreviewUrl>, ProjectionRepositoryError>;

  /**
   * List preview URLs for a specific turn.
   *
   * Returned in deterministic creation order.
   */
  readonly listByTurnId: (
    input: ListPreviewUrlsByTurnInput,
  ) => Effect.Effect<ReadonlyArray<PreviewUrl>, ProjectionRepositoryError>;

  /**
   * Delete a preview URL record by id.
   */
  readonly deleteById: (
    input: DeletePreviewUrlInput,
  ) => Effect.Effect<void, ProjectionRepositoryError>;
}

/**
 * PreviewUrlRepository - Service tag for preview URL persistence.
 */
export class PreviewUrlRepository extends ServiceMap.Service<
  PreviewUrlRepository,
  PreviewUrlRepositoryShape
>()("t3/persistence/Services/PreviewUrls/PreviewUrlRepository") {}
