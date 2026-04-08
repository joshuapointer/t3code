import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";
import { Effect, Layer } from "effect";

import { toPersistenceSqlError } from "../Errors.ts";
import {
  CreatePreviewUrlInput,
  DeletePreviewUrlInput,
  GetPreviewUrlInput,
  ListPreviewUrlsByProjectInput,
  ListPreviewUrlsByThreadInput,
  ListPreviewUrlsByTurnInput,
  PreviewUrl,
  PreviewUrlRepository,
  UpdatePreviewUrlStatusInput,
  type PreviewUrlRepositoryShape,
} from "../Services/PreviewUrls.ts";

const makePreviewUrlRepository = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const insertPreviewUrlRow = SqlSchema.void({
    Request: CreatePreviewUrlInput,
    execute: (row) =>
      sql`
        INSERT INTO preview_urls (
          id,
          thread_id,
          project_id,
          turn_id,
          url,
          label,
          spawned_by,
          status,
          created_at,
          expires_at,
          metadata_json
        )
        VALUES (
          ${row.id},
          ${row.threadId},
          ${row.projectId},
          ${row.turnId},
          ${row.url},
          ${row.label},
          ${row.spawnedBy},
          ${row.status},
          ${row.createdAt},
          ${row.expiresAt},
          ${row.metadataJson}
        )
      `,
  });

  const getPreviewUrlRow = SqlSchema.findOneOption({
    Request: GetPreviewUrlInput,
    Result: PreviewUrl,
    execute: ({ id }) =>
      sql`
        SELECT
          id,
          thread_id AS "threadId",
          project_id AS "projectId",
          turn_id AS "turnId",
          url,
          label,
          spawned_by AS "spawnedBy",
          status,
          created_at AS "createdAt",
          expires_at AS "expiresAt",
          metadata_json AS "metadataJson"
        FROM preview_urls
        WHERE id = ${id}
      `,
  });

  const updatePreviewUrlStatusRow = SqlSchema.void({
    Request: UpdatePreviewUrlStatusInput,
    execute: ({ id, status }) =>
      sql`
        UPDATE preview_urls
        SET status = ${status}
        WHERE id = ${id}
      `,
  });

  const listPreviewUrlsByThreadRows = SqlSchema.findAll({
    Request: ListPreviewUrlsByThreadInput,
    Result: PreviewUrl,
    execute: ({ threadId }) =>
      sql`
        SELECT
          id,
          thread_id AS "threadId",
          project_id AS "projectId",
          turn_id AS "turnId",
          url,
          label,
          spawned_by AS "spawnedBy",
          status,
          created_at AS "createdAt",
          expires_at AS "expiresAt",
          metadata_json AS "metadataJson"
        FROM preview_urls
        WHERE thread_id = ${threadId}
        ORDER BY created_at ASC, id ASC
      `,
  });

  const listPreviewUrlsByProjectRows = SqlSchema.findAll({
    Request: ListPreviewUrlsByProjectInput,
    Result: PreviewUrl,
    execute: ({ projectId }) =>
      sql`
        SELECT
          id,
          thread_id AS "threadId",
          project_id AS "projectId",
          turn_id AS "turnId",
          url,
          label,
          spawned_by AS "spawnedBy",
          status,
          created_at AS "createdAt",
          expires_at AS "expiresAt",
          metadata_json AS "metadataJson"
        FROM preview_urls
        WHERE project_id = ${projectId}
        ORDER BY created_at ASC, id ASC
      `,
  });

  const listPreviewUrlsByTurnRows = SqlSchema.findAll({
    Request: ListPreviewUrlsByTurnInput,
    Result: PreviewUrl,
    execute: ({ turnId }) =>
      sql`
        SELECT
          id,
          thread_id AS "threadId",
          project_id AS "projectId",
          turn_id AS "turnId",
          url,
          label,
          spawned_by AS "spawnedBy",
          status,
          created_at AS "createdAt",
          expires_at AS "expiresAt",
          metadata_json AS "metadataJson"
        FROM preview_urls
        WHERE turn_id = ${turnId}
        ORDER BY created_at ASC, id ASC
      `,
  });

  const deletePreviewUrlRow = SqlSchema.void({
    Request: DeletePreviewUrlInput,
    execute: ({ id }) =>
      sql`
        DELETE FROM preview_urls
        WHERE id = ${id}
      `,
  });

  const create: PreviewUrlRepositoryShape["create"] = (input) =>
    insertPreviewUrlRow(input).pipe(
      Effect.mapError(toPersistenceSqlError("PreviewUrlRepository.create:query")),
    );

  const getById: PreviewUrlRepositoryShape["getById"] = (input) =>
    getPreviewUrlRow(input).pipe(
      Effect.mapError(toPersistenceSqlError("PreviewUrlRepository.getById:query")),
    );

  const updateStatus: PreviewUrlRepositoryShape["updateStatus"] = (input) =>
    updatePreviewUrlStatusRow(input).pipe(
      Effect.mapError(toPersistenceSqlError("PreviewUrlRepository.updateStatus:query")),
    );

  const listByThreadId: PreviewUrlRepositoryShape["listByThreadId"] = (input) =>
    listPreviewUrlsByThreadRows(input).pipe(
      Effect.mapError(toPersistenceSqlError("PreviewUrlRepository.listByThreadId:query")),
    );

  const listByProjectId: PreviewUrlRepositoryShape["listByProjectId"] = (input) =>
    listPreviewUrlsByProjectRows(input).pipe(
      Effect.mapError(toPersistenceSqlError("PreviewUrlRepository.listByProjectId:query")),
    );

  const listByTurnId: PreviewUrlRepositoryShape["listByTurnId"] = (input) =>
    listPreviewUrlsByTurnRows(input).pipe(
      Effect.mapError(toPersistenceSqlError("PreviewUrlRepository.listByTurnId:query")),
    );

  const deleteById: PreviewUrlRepositoryShape["deleteById"] = (input) =>
    deletePreviewUrlRow(input).pipe(
      Effect.mapError(toPersistenceSqlError("PreviewUrlRepository.deleteById:query")),
    );

  return {
    create,
    getById,
    updateStatus,
    listByThreadId,
    listByProjectId,
    listByTurnId,
    deleteById,
  } satisfies PreviewUrlRepositoryShape;
});

export const PreviewUrlRepositoryLive = Layer.effect(
  PreviewUrlRepository,
  makePreviewUrlRepository,
);
