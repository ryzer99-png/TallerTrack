import { isSupabaseConfigured } from '../config.js';
import { DEMO_TECHS_KEY, generateUuid, readDemoTechnicians } from './demoStore.js';
import { getSupabaseClient } from './supabaseClient.js';

export async function listTechnicians() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return readDemoTechnicians();
  }

  const { data, error } = await supabase
    .from('tecnicos')
    .select('id, nombre, color, activo')
    .eq('activo', true)
    .order('created_at', { ascending: true });

  if (error) {
    // Fallback silencioso si aún no se ejecutó migration_tecnicos_pendientes.sql
    return [];
  }
  return data || [];
}

export async function createTechnician({ nombre, color }) {
  const cleanName = String(nombre || '').trim();
  const cleanColor = String(color || '#1d4ed8').trim();
  if (!cleanName) throw new Error('Ingresa el nombre del técnico.');

  const supabase = getSupabaseClient();
  if (!supabase) {
    const list = readDemoTechnicians();
    const created = {
      id: generateUuid(),
      nombre: cleanName,
      color: cleanColor,
      activo: true,
    };
    list.push(created);
    localStorage.setItem(DEMO_TECHS_KEY, JSON.stringify(list));
    return created;
  }

  const { data, error } = await supabase
    .from('tecnicos')
    .insert([{ nombre: cleanName, color: cleanColor, activo: true }])
    .select()
    .single();

  if (error) throw error;
  return data;
}
