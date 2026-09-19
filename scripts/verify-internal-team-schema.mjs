import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const employeeColumns = await pool.query(
    "select column_name from information_schema.columns where table_schema='public' and table_name='employees'",
  );
  const columns = new Set(employeeColumns.rows.map((row) => row.column_name));
  for (const name of ["age", "address", "note", "advisory_areas", "image_url"]) {
    if (!columns.has(name)) throw new Error(`Missing employees column: ${name}`);
  }

  const channel = await pool.query(
    "select column_name from information_schema.columns where table_schema='public' and table_name='team_messages' and column_name='channel'",
  );
  if (!channel.rowCount) throw new Error("Missing team_messages.channel");

  const images = await pool.query("select to_regclass('public.employee_images') as table_name");
  if (!images.rows[0]?.table_name) throw new Error("Missing employee_images table");

  await pool.query("insert into team_messages (body, channel) values ('team test', 'all'), ('admin test', 'admins')");
  const counts = await pool.query("select channel, count(*)::int as count from team_messages group by channel order by channel");
  if (counts.rows.length !== 2) throw new Error("Chat channels could not both be stored.");

  console.log("Internal employee profile and chat schema verified.");
} finally {
  await pool.end();
}
