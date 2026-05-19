const { createClient } = require('@supabase/supabase-js');
const url = 'https://rtfxxonlpzgtxkrirwrl.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0Znh4b25scHpndHhrcmlyd3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTkwMzg1MDIsImV4cCI6MjA5NDYxNDUwMn0.HZiyyCfW-uWZhx6iioNHWOQD9bHaeP2713zQsehHPgo';

const supabase = createClient(url, key);

async function check() {
  console.log('🔄 Buscando Viajero 40124710.01 en erp-industrial-pro...');
  const { data: traveler, error: travErr } = await supabase
    .from('viajeros')
    .select('*')
    .eq('id', '40124710.01')
    .single();

  if (travErr) {
    console.error('❌ Error buscando viajero:', travErr.message);
    return;
  }

  console.log('✅ Viajero encontrado:', traveler.id);

  console.log('🔄 Buscando Materiales...');
  const { data: materials, error: matErr } = await supabase
    .from('viajero_materiales')
    .select('*')
    .eq('viajero_id', '40124710.01');

  if (matErr) {
    console.error('❌ Error buscando materiales:', matErr.message);
    return;
  }

  console.log(`✅ Materiales encontrados (${materials.length}):`);
  materials.forEach((m, i) => {
    console.log(`  [${i+1}] Desc: ${m.descripcion} | Clave: ${m.clave} | es_recogida: ${m.es_recogida} | Type: ${typeof m.es_recogida}`);
  });
}

check();
