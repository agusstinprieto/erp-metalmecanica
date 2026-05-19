const { createClient } = require('@supabase/supabase-js');
const url = 'https://kfdbgvyeomoewzmhkbsn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZGJndnllb21vZXd6bWhrYnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc4MjIxOCwiZXhwIjoyMDkyMzU4MjE4fQ.Fiv_FSMBniNAeY26aJAPvxXYQCaNlHnPr88ZaqmJFv4';

const supabase = createClient(url, key);

async function run() {
  console.log('🔄 Buscando materiales del Viajero 40124710.01...');
  const { data: materials, error: getErr } = await supabase
    .from('viajero_materiales')
    .select('*')
    .eq('viajero_id', '40124710.01');

  if (getErr || !materials || materials.length === 0) {
    console.error('❌ Error o sin materiales:', getErr);
    return;
  }

  const targetMat = materials[0];
  console.log(`🎯 Material a actualizar: "${targetMat.descripcion}" (ID: ${targetMat.id})`);
  console.log(`   Valor actual es_recogida: ${targetMat.es_recogida}`);

  console.log('🔄 Modificando a true...');
  const { error: updErr } = await supabase
    .from('viajero_materiales')
    .update({ es_recogida: true })
    .eq('id', targetMat.id);

  if (updErr) {
    console.error('❌ Error al actualizar:', updErr.message);
    return;
  }

  console.log('✅ Actualización exitosa. Comprobando nuevo estado...');
  const { data: updatedMat, error: checkErr } = await supabase
    .from('viajero_materiales')
    .select('*')
    .eq('id', targetMat.id)
    .single();

  if (checkErr) {
    console.error('❌ Error al comprobar:', checkErr.message);
    return;
  }

  console.log(`🎉 es_recogida en DB ahora es: ${updatedMat.es_recogida}`);
}

run();
