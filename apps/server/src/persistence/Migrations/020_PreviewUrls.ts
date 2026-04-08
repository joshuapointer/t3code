import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as Effect from "effect/Effect";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE IF NOT EXISTS preview_urls (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      url TEXT NOT NULL,
      label TEXT,
      spawned_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      expires_at TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}'
    )
  `;

  yield* sql`
    CREATE INDEX IF NOT EXISTS idx_preview_urls_thread_id ON preview_urls(thread_id)
  `;

  yield* sql`
    CREATE INDEX IF NOT EXISTS idx_preview_urls_project_id ON preview_urls(project_id)
  `;

  yield* sql`
    CREATE INDEX IF NOT EXISTS idx_preview_urls_created_at ON preview_urls(created_at)
  `;
});
