/* ================================================================
   ADMIN.JS  –  BackToMe · Panel de Administración
   Gestiona usuarios y publicaciones: tabs, filtro y render.
   ================================================================ */

// Configuración de Supabase
const supabaseUrl = 'https://nspadsjyeeakerarojsm.supabase.co';
const supabaseKey = 'sb_publishable_hW1N-mn5qgGRrt4DXgz1Zg_eqS2N4Th'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

/* ----------------------------------------------------------------
   PROTECCIÓN DE RUTA
   Solo permite acceso a usuarios con rol 'admin'
   ---------------------------------------------------------------- */
function checkAdminAccess() {
  const user = JSON.parse(localStorage.getItem('userLogged'));
  
  if (!user || !user.email) {
    // No hay sesión → redirigir a login
    window.location.href = 'login.html';
    return false;
  }
  
  if (user.rol !== 'admin') {
    // No es admin → redirigir a inicio
    alert('⛔ Acceso restringido. Solo administradores.');
    window.location.href = 'index.html';
    return false;
  }
  
  return true;
}

/* ----------------------------------------------------------------
   ESTADO GLOBAL DEL PANEL
   ---------------------------------------------------------------- */
let tipoActual = 'usuarios'; // Tab activo: 'usuarios' | 'publicaciones'
let usuariosData = [];
let publicacionesData = [];

/* ----------------------------------------------------------------
   INICIALIZACIÓN
   ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar acceso de administrador
  if (!checkAdminAccess()) return;
  
  // Cargar datos desde Supabase
  await cargarDatos();
  
  actualizarEstadisticas();
  render();
  initLogout();
});

/* ----------------------------------------------------------------
   CARGAR DATOS DESDE SUPABASE
   ---------------------------------------------------------------- */
async function cargarDatos() {
  try {
    // Cargar usuarios
    const { data: usuarios, error: errorUsuarios } = await supabaseClient
      .from('usuario')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (errorUsuarios) throw errorUsuarios;
    usuariosData = usuarios || [];
    
    // Cargar publicaciones
    const { data: publicaciones, error: errorPublicaciones } = await supabaseClient
      .from('publicaciones')
      .select('*');
    
    if (errorPublicaciones) throw errorPublicaciones;
    publicacionesData = publicaciones || [];
    
    console.log('✅ Datos cargados:', usuariosData.length, 'usuarios,', publicacionesData.length, 'publicaciones');
    
  } catch (err) {
    console.error('❌ Error cargando datos:', err);
    alert('Error al cargar datos. Revisa la consola.');
  }
}

/* ----------------------------------------------------------------
   ESTADÍSTICAS – Actualiza los contadores del panel
   ---------------------------------------------------------------- */
function actualizarEstadisticas() {
  setStatValue('statUsuarios',      usuariosData.length);
  setStatValue('statPublicaciones', publicacionesData.length);
  setStatValue('statNuevos',        0); // TODO: filtrar por fecha de hoy
  setStatValue('statReportes',      0); // TODO: tabla de reportes en Supabase
}

/**
 * Actualiza el texto de un elemento de estadística.
 * @param {string} id    - ID del elemento.
 * @param {number} valor - Valor a mostrar.
 */
function setStatValue(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

/* ----------------------------------------------------------------
   CAMBIAR TAB
   Llama desde el atributo onclick del HTML.
   @param {string}      tipo - 'usuarios' | 'publicaciones'
   @param {HTMLElement} btn  - Botón clicado (para actualizar clase active)
   ---------------------------------------------------------------- */
function cambiarTab(tipo, btn) {
  tipoActual = tipo;

  /* Actualizar clases y aria-selected en todos los tabs */
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');

  /* Actualizar placeholder del buscador */
  const buscador = document.getElementById('buscador');
  if (buscador) {
    buscador.value = '';
    buscador.placeholder = tipo === 'usuarios'
      ? 'Buscar usuarios...'
      : 'Buscar publicaciones...';
  }

  render();
}

/* ----------------------------------------------------------------
   RENDER
   Genera los items de la lista según el tab activo.
   ---------------------------------------------------------------- */
function render() {
  const lista = document.getElementById('lista');
  if (!lista) return;

  const datos = tipoActual === 'usuarios' ? usuariosData : publicacionesData;

  if (datos.length === 0) {
    lista.innerHTML = `
      <p class="text-muted text-center py-4">
        No hay ${tipoActual} registrados aún.
      </p>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  datos.forEach((dato, index) => {
    const item = document.createElement('div');
    item.className = 'item';
    item.setAttribute('role', 'listitem');
    item.innerHTML = tipoActual === 'usuarios'
      ? buildUsuarioHTML(dato, index)
      : buildPublicacionHTML(dato, index);
    fragment.appendChild(item);
  });

  lista.innerHTML = '';
  lista.appendChild(fragment);

  /* Registrar eventos de eliminación */
  lista.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      eliminar(idx);
    });
  });
}

/**
 * HTML de un item de usuario.
 * @param {Object} usuario
 * @param {number} index
 * @returns {string}
 */
function buildUsuarioHTML(usuario, index) {
  // Mostrar todos los datos del usuario
  return `
    <div class="usuario-card p-3 border rounded-3 bg-white shadow-sm mb-3">
      <div class="row g-3">
        <div class="col-md-6">
          <div class="row">
            <div class="col-6">
              <small class="text-muted d-block">Cédula</small>
              <strong>${usuario.cedula || 'N/A'}</strong>
            </div>
            <div class="col-6">
              <small class="text-muted d-block">Nombre</small>
              <strong>${usuario.nombre || 'N/A'}</strong>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="row">
            <div class="col-6">
              <small class="text-muted d-block">Correo</small>
              <span>${usuario.correo || 'N/A'}</span>
            </div>
            <div class="col-6">
              <small class="text-muted d-block">Celular</small>
              <span>${usuario.celular || 'N/A'}</span>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="row">
            <div class="col-6">
              <small class="text-muted d-block">Contraseña</small>
              <span class="text-muted">••••••••</span>
            </div>
            <div class="col-6">
              <small class="text-muted d-block">Rol</small>
              <span class="badge bg-primary">${usuario.rol || 'usuario'}</span>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <small class="text-muted d-block">Fotos</small>
          <div class="d-flex gap-2">
            ${usuario.foto_perfil 
              ? `<a href="${usuario.foto_perfil}" target="_blank" class="btn btn-sm btn-outline-secondary">Perfil</a>` 
              : '<span class="text-muted small">Sin foto</span>'}
            ${usuario.foto_cedula 
              ? `<a href="${usuario.foto_cedula}" target="_blank" class="btn btn-sm btn-outline-secondary">Cédula</a>` 
              : '<span class="text-muted small">Sin foto</span>'}
          </div>
        </div>
      </div>
    </div>
    <button
      class="btn btn-danger btn-sm btn-eliminar"
      data-index="${index}"
      aria-label="Eliminar usuario ${usuario.nombre}">
      <i class="bi bi-trash" aria-hidden="true"></i>
    </button>
  `;
}

/**
 * HTML de un item de publicación.
 * @param {Object} pub
 * @param {number} index
 * @returns {string}
 */
function buildPublicacionHTML(pub, index) {
  // Detectar tipo (puede ser 'tipo' o 'tipopublicacion')
  const tipo = pub.tipo || pub.tipopublicacion || 'publicacion';
  const badgeClass = tipo === 'perdido' ? 'bg-danger' : 'bg-success';
  
  // Detectar autor (puede ser 'autor', 'usuario', 'email')
  const autor = pub.autor || pub.usuario || pub.email || 'Anónimo';
  
  // Detectar título
  const titulo = pub.titulo || pub.titulo_publicacion || 'Sin título';
  
  return `
    <div>
      <strong>${titulo}</strong>
      <p class="text-muted small mb-1">Autor: ${autor}</p>
      <span class="badge ${badgeClass}">${tipo}</span>
    </div>
    <button
      class="btn btn-danger btn-sm btn-eliminar"
      data-index="${index}"
      aria-label="Eliminar publicación ${titulo}">
      <i class="bi bi-trash" aria-hidden="true"></i>
    </button>
  `;
}

/* ----------------------------------------------------------------
   ELIMINAR
   Elimina de Supabase y actualiza la vista.
   ---------------------------------------------------------------- */
async function eliminar(index) {
  const dato = tipoActual === 'usuarios' ? usuariosData[index] : publicacionesData[index];
  
  if (!dato) return;
  
  const confirmar = confirm(`¿Estás seguro de eliminar este ${tipoActual === 'usuarios' ? 'usuario' : 'publicación'}?`);
  if (!confirmar) return;
  
  try {
    let tabla = tipoActual === 'usuarios' ? 'usuario' : 'publicaciones';
    let idCampo = tipoActual === 'usuarios' ? 'cedula' : 'id';
    
    const { error } = await supabaseClient
      .from(tabla)
      .delete()
      .eq(idCampo, dato[idCampo]);
    
    if (error) throw error;
    
    // Actualizar array local
    if (tipoActual === 'usuarios') {
      usuariosData.splice(index, 1);
      setStatValue('statUsuarios', usuariosData.length);
    } else {
      publicacionesData.splice(index, 1);
      setStatValue('statPublicaciones', publicacionesData.length);
    }
    
    render();
    alert('✅ Eliminado correctamente');
    
  } catch (err) {
    console.error('❌ Error al eliminar:', err);
    alert('Error al eliminar. Revisa la consola.');
  }
}

/* ----------------------------------------------------------------
   FILTRO – Búsqueda en tiempo real sobre los items renderizados
   ---------------------------------------------------------------- */
function filtrar() {
  const texto = document.getElementById('buscador')?.value.toLowerCase() ?? '';
  document.querySelectorAll('#lista .item').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(texto)
      ? 'flex'
      : 'none';
  });
}

/* ----------------------------------------------------------------
   LOGOUT
   TODO: reemplazar con supabase.auth.signOut() y redirect a login.
   ---------------------------------------------------------------- */
function initLogout() {
  const btn = document.getElementById('btnLogout');
  btn?.addEventListener('click', () => {
    localStorage.removeItem('userLogged');
    window.location.href = 'login.html';
  });
}
