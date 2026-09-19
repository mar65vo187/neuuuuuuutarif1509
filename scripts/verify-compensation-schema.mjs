import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const tables = await pool.query(
    "select tablename from pg_tables where schemaname='public' and tablename = any($1::text[])",
    [["employee_compensation_profiles","compensation_history"]],
  );
  const present = new Set(tables.rows.map((row) => row.tablename));
  for (const table of ["employee_compensation_profiles","compensation_history"]) {
    if (!present.has(table)) throw new Error("Missing table: " + table);
  }

  const columns = await pool.query(
    "select column_name from information_schema.columns where table_schema='public' and table_name='employee_compensation_profiles'",
  );
  const names = new Set(columns.rows.map((row) => row.column_name));
  for (const name of ["employee_id","payout_percent","reserve_percent","savings_percent","loyalty_started_at","loyalty_vesting_years","team_level","note"]) {
    if (!names.has(name)) throw new Error("Missing compensation column: " + name);
  }

  const employee = await pool.query(
    "insert into employees (name,email,password_hash,role) values ('Comp Test','comp-test@example.invalid','scrypt$00000000000000000000000000000000$00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000','berater') returning id",
  );
  const id = employee.rows[0].id;
  await pool.query("insert into employee_compensation_profiles (employee_id) values ($1)", [id]);
  const profile = await pool.query("select payout_percent,reserve_percent,loyalty_vesting_years from employee_compensation_profiles where employee_id=$1", [id]);
  if (Number(profile.rows[0].payout_percent) !== 82) throw new Error("Default payout must be 82");
  if (Number(profile.rows[0].reserve_percent) !== 8) throw new Error("Default reserve must be 8");
  if (Number(profile.rows[0].loyalty_vesting_years) !== 10) throw new Error("Default loyalty term must be 10 years");

  let invalidRejected = false;
  try {
    await pool.query("update employee_compensation_profiles set payout_percent=83 where employee_id=$1", [id]);
  } catch {
    invalidRejected = true;
  }
  if (!invalidRejected) throw new Error("Invalid payout tier was not rejected");

  console.log("Compensation schema and constraints verified.");
} finally {
  await pool.end();
}
