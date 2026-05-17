import fetch from 'node-fetch';
import fs from 'fs';

const PROJECT_ID = 'kfdbgvyeomoewzmhkbsn';
const ACCESS_TOKEN = 'sbp_a01cded7bbc34829760c4c75e6ca3591b9e4389e';

async function runMigration() {
    const sql = fs.readFileSync('supabase/migrations/20260424_core_admin_modules.sql', 'utf8');
    
    console.log('Aplicando migración a Supabase via Management API...');
    
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/queries`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: sql
        })
    });

    const data = await response.json();
    
    if (response.ok) {
        console.log('✅ Migración aplicada con éxito.');
        console.log(data);
    } else {
        console.error('❌ Error al aplicar migración:', data);
    }
}

runMigration();
