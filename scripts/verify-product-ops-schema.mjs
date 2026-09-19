import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const requiredColumns = new Map([
    ["product_catalog_profiles", ["short_pitch","phone_pitch","d2d_pitch","b2b_pitch","whatsapp_template","email_template","social_ideas"]],
    ["employee_training_completions", ["certificate_code"]],
  ]);
  for (const [table, required] of requiredColumns) {
    const result = await pool.query(
      "select column_name from information_schema.columns where table_schema='public' and table_name=$1",
      [table],
    );
    const columns = new Set(result.rows.map((row) => row.column_name));
    for (const column of required) {
      if (!columns.has(column)) throw new Error(`Missing ${table}.${column}`);
    }
  }

  const reads = await pool.query("select to_regclass('public.product_update_reads') as name");
  if (!reads.rows[0]?.name) throw new Error("Missing product_update_reads table");

  const certificateIndex = await pool.query(
    "select indexname from pg_indexes where schemaname='public' and tablename='employee_training_completions' and indexname='employee_training_certificate_code_unique'",
  );
  if (!certificateIndex.rowCount) throw new Error("Missing unique training certificate index");

  console.log("Product knowledge, read receipts and training proof schema verified.");
} finally {
  await pool.end();
}
