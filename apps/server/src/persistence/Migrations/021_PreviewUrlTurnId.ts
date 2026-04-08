import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as Effect from "effect/Effect";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    ALTER TABLE preview_urls ADD COLUMN turn_id TEXT
  `;

  yield* sql`
    CREATE INDEX IF NOT EXISTS idx_preview_urls_turn_id ON preview_urls(turn_id)
  `;
});
