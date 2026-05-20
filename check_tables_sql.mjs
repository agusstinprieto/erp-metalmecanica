import pg from 'pg';
const { Client } = pg;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connectionString = 'postgresql://postgres:Supabase_2026%21@db.kfdbgvyeomoewzmhkbsn.supabase.co:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function run() {
  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!');

    console.log('\n--- PUBLIC TABLES ---');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const res = await client.query(tablesQuery);
    const tableNames = res.rows.map(r => r.table_name);
    console.log('Tables found:', tableNames.join(', '));

    const checkTables = ['payrolls', 'nominas', 'work_orders', 'ordenes_trabajo', 'employees', 'empleados', 'engineering_projects'];
    for (const t of checkTables) {
      const exists = tableNames.includes(t);
      console.log(`- ${t}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      if (exists) {
        // Query some details
        const columnsRes = await client.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1;
        `, [t]);
        const cols = columnsRes.rows.map(c => `${c.column_name} (${c.data_type}, nullable=${c.is_nullable})`).join(', ');
        console.log(`  Columns: ${cols}`);
      }
    }

    console.log('\n--- SAMPLE ROWS ordenes_trabajo ---');
    const otRes = await client.query('SELECT * FROM ordenes_trabajo LIMIT 5;');
    console.log(otRes.rows);

    console.log('\n--- SAMPLE ROWS engineering_projects ---');
    const epRes = await client.query('SELECT * FROM engineering_projects LIMIT 5;');
    console.log(epRes.rows);

    await client.end();
  } catch (err) {
    console.error('❌ ERROR:', err.message);
  }
}

run();
