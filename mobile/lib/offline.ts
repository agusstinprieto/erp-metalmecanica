import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const QUEUE_STORAGE_KEY   = '@mcvill_sync_queue';
const ID_MAP_STORAGE_KEY  = '@mcvill_id_translation_map';

export interface QueueItem {
  id: string; // local temporary uuid or id
  table: string; // e.g. 'time_attendance', 'viajero_operaciones', 'quality_inspections'
  action: 'insert' | 'update';
  payload: any; // payload to write to supabase
  filterField?: string; // field to filter for updates (e.g. 'id')
  filterValue?: string; // value to match for updates
  photoUri?: string; // local file URI of photo to upload
  photoField?: string; // field to store the uploaded image URL in (e.g. 'foto_url')
  photoBucket?: string; // bucket name (e.g. 'mcvill-fotos')
  photoFolder?: string; // e.g. 'viajeros' or 'calidad'
  createdAt: string;
}

// Generador de UUIDs temporales ligero para modo offline
export function generateTempId(): string {
  return 'temp_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Verifica la conectividad real con ping ligero
export async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('https://clients3.google.com/generate_204', {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    clearTimeout(timeout);
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}

// Obtener cola actual de AsyncStorage
export async function getSyncQueue(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[Offline] Error reading sync queue:', e);
    return [];
  }
}

// Guardar cola actual en AsyncStorage
export async function saveSyncQueue(queue: QueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[Offline] Error saving sync queue:', e);
  }
}

// Encolar una nueva operación de escritura
export async function enqueueAction(
  item: Omit<QueueItem, 'id' | 'createdAt'>
): Promise<string> {
  const tempId = generateTempId();
  const queue = await getSyncQueue();
  
  const newItem: QueueItem = {
    ...item,
    id: tempId,
    createdAt: new Date().toISOString()
  };
  
  queue.push(newItem);
  await saveSyncQueue(queue);
  console.log(`[Offline] Action enqueued for table ${item.table} (Temp ID: ${tempId})`);
  return tempId;
}

// Sube una foto local a Supabase Storage
async function uploadLocalPhoto(uri: string, bucket: string, path: string): Promise<string | null> {
  try {
    const ext = uri.split('.').pop() ?? 'jpg';
    const resp = await fetch(uri);
    const blob = await resp.blob();
    
    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      contentType: `image/${ext}`,
      upsert: true
    });
    
    if (error) {
      console.error('[Offline] Supabase Storage upload error:', error.message);
      return null;
    }
    
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error('[Offline] Exception uploading photo:', e);
    return null;
  }
}

// Sincroniza la cola local de pendientes contra Supabase
export async function syncQueue(): Promise<{ successCount: number; failedCount: number }> {
  const isOnline = await checkConnectivity();
  if (!isOnline) {
    console.log('[Offline] Network is offline. Postponing sync.');
    return { successCount: 0, failedCount: 0 };
  }

  const queue = await getSyncQueue();
  if (queue.length === 0) {
    return { successCount: 0, failedCount: 0 };
  }

  console.log(`[Offline] Starting sync for ${queue.length} pending items...`);
  
  let successCount = 0;
  let failedCount = 0;
  
  // Tabla de traducción de IDs temporales a reales
  // (Resuelve la relación offline Check-In -> Check-Out)
  // Load persisted ID map so cross-session checkout→check-in links still resolve
  let idTranslationTable: Record<string, string> = {};
  try {
    const raw = await AsyncStorage.getItem(ID_MAP_STORAGE_KEY);
    if (raw) idTranslationTable = JSON.parse(raw);
  } catch {}

  const activeQueue = [...queue];
  const remainingQueue: QueueItem[] = [];

  for (const item of activeQueue) {
    try {
      // 1. Traducir valores relacionales de IDs temporales a reales si existen
      let resolvedPayload = { ...item.payload };
      
      // Resolver filterValue sin mutar el item original de la cola
      const resolvedFilterValue = item.filterValue && idTranslationTable[item.filterValue]
        ? idTranslationTable[item.filterValue]
        : item.filterValue;
      
      for (const key of Object.keys(resolvedPayload)) {
        const val = resolvedPayload[key];
        if (typeof val === 'string' && idTranslationTable[val]) {
          resolvedPayload[key] = idTranslationTable[val];
        }
      }

      // 2. Subir foto si está adjunta en la acción offline
      if (item.photoUri && item.photoField && item.photoBucket && item.photoFolder) {
        const fileExt = item.photoUri.split('.').pop() ?? 'jpg';
        const storagePath = `${item.photoFolder}/${item.id}_sync_${Date.now()}.${fileExt}`;
        
        console.log(`[Offline] Uploading queued photo for ${item.table}...`);
        const remoteUrl = await uploadLocalPhoto(item.photoUri, item.photoBucket, storagePath);
        
        if (remoteUrl) {
          resolvedPayload[item.photoField] = remoteUrl;
        } else {
          console.warn('[Offline] Photo upload failed. Syncing record without photo.');
        }
      }

      // 3. Ejecutar la acción Supabase correspondiente
      if (item.action === 'insert') {
        const { data, error } = await supabase
          .from(item.table)
          .insert(resolvedPayload)
          .select()
          .single();

        if (error) throw error;

        // Registrar traducción de ID temporal a real si fue retornado
        if (data && data.id) {
          idTranslationTable[item.id] = String(data.id);
        }
        
      } else if (item.action === 'update') {
        const filterField = item.filterField || 'id';
        const filterVal = resolvedFilterValue || resolvedPayload.id;

        const { error } = await supabase
          .from(item.table)
          .update(resolvedPayload)
          .eq(filterField, filterVal);

        if (error) throw error;
      }

      console.log(`[Offline] Successfully synchronized item ${item.id} (${item.table})`);
      successCount++;
    } catch (e: any) {
      console.error(`[Offline] Sync failed for item ${item.id} on table ${item.table}:`, e.message || e);
      // Mantener en cola si falla por razones ajenas a la lógica de negocio (e.g. desconexión abrupta)
      remainingQueue.push(item);
      failedCount++;
    }
  }

  // Guardar elementos fallidos para reintentar después
  await saveSyncQueue(remainingQueue);
  // Persist ID map so future sessions can resolve temp→real IDs for pending checkouts
  try {
    await AsyncStorage.setItem(ID_MAP_STORAGE_KEY, JSON.stringify(idTranslationTable));
  } catch {}
  console.log(`[Offline] Sync finished. Successes: ${successCount}, Retained in queue: ${failedCount}`);
  
  return { successCount, failedCount };
}

// Cachea empleados activos localmente para modo offline Kiosco
export async function cacheEmployees(): Promise<void> {
  try {
    const isOnline = await checkConnectivity();
    if (!isOnline) return;

    const { data } = await supabase
      .from('employees')
      .select('id, employee_number, first_name, last_name, status')
      .eq('status', 'active');

    if (data) {
      await AsyncStorage.setItem('@mcvill_employees_cache', JSON.stringify(data));
      console.log(`[Offline] Cached ${data.length} active employees locally.`);
    }
  } catch (e) {
    console.error('[Offline] Error caching employees:', e);
  }
}

// Busca un empleado en la caché local
export async function getCachedEmployee(employeeNumber: string): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem('@mcvill_employees_cache');
    if (!raw) return null;
    const emps = JSON.parse(raw);
    return emps.find((e: any) => e.employee_number.trim() === employeeNumber.trim()) || null;
  } catch {
    return null;
  }
}

// Consulta si hay checadas locales hoy en la cola de sincronización para Kiosco
export async function getTodayLocalPunches(
  employeeNumber: string
): Promise<{ check_in: string | null; check_out: string | null; id: string | null }> {
  try {
    const dateStr = new Date().toISOString().split('T')[0];
    const queue = await getSyncQueue();
    
    const checkInItem = queue.find(
      (item) =>
        item.table === 'time_attendance' &&
        item.action === 'insert' &&
        item.payload.employee_id === employeeNumber &&
        item.payload.date === dateStr
    );

    const checkOutItem = queue.find(
      (item) =>
        item.table === 'time_attendance' &&
        item.action === 'update' &&
        item.filterValue === checkInItem?.id
    );

    return {
      check_in: checkInItem ? checkInItem.payload.check_in : null,
      check_out: checkOutItem ? checkOutItem.payload.check_out : null,
      id: checkInItem ? checkInItem.id : null,
    };
  } catch {
    return { check_in: null, check_out: null, id: null };
  }
}
