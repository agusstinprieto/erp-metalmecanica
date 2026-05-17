import pg from 'pg';

const { Client } = pg;

const sql = `SELECT * FROM tenants;`;

async function run() {
  const client = new Client({
    host: "db.kfdbgvyeomoewzmhkbsn.supabase.co",
    port: 5432,
    user: "postgres",
    password: "lamismadesiempre",
    database: "postgres",
  });

  try {
    await client.connect();
    console.log("Connected to DB");
    const res = await client.query(sql);
    console.log("SQL Executed Successfully");
    console.table(res.rows);
  } catch (err) {
    console.error("Error executing SQL:", err.message);
  } finally {
    await client.end();
  }
}

run();
