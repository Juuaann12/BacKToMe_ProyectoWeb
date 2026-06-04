/**
 * supabase-client.js
 * Cliente centralizado de Supabase para toda la aplicación
 * Evita duplicaciones y centraliza configuración
 */

const SUPABASE_CONFIG = {
  url: 'https://nspadsjyeeakerarojsm.supabase.co',
  key: 'sb_publishable_hW1N-mn5qgGRrt4DXgz1Zg_eqS2N4Th'
};

// Crear cliente una sola vez
const supabaseClient = window.supabase.createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.key
);

// Exportar para acceso global
window.supabaseClient = supabaseClient;
