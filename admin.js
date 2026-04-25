/* ================================================================
   ADMIN.JS  –  BackToMe · Panel de Administración
   Gestiona usuarios y publicaciones: tabs, filtro y render.
   CONEXIÓN: Supabase - Tablas usuario y publicaciones
   ================================================================ */

// Configuración de Supabase
const supabaseUrl = 'https://nspadsjyeeakerarojsm.supabase.co';
const supabaseKey = 'sb_publishable_hW1N-mn5qgGRrt4DXgz1Zg_eqS2N4Th'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

/* ----------------------------------------------------------------
   ESTADO GLOBAL DEL PANEL
   ---------------------------------------------------------------- */
let tipoActual = 'usuarios'; // Tab activo: 'usuarios' | 'publicaciones'
let usuarios = [];
let publicaciones = [];

/* ----------------------------------------------------------------
   INICIALIZACIÓN
   ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
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
    // Cargar usuarios de la tabla 'usuario'
    const { data: dataUsuarios, error: errorUsuarios } = await supabaseClient
      .from('usuario')
      .select('*')
      .order('nombre', { ascending: true });

    if (errorUsuarios) {
      console.error('Error cargando usuarios:', errorUsuarios);
    } else {
      usuarios = dataUsuarios || [];
    }

    // Cargar publicaciones de la tabla 'publicaciones'
    const { data: dataPublicaciones, error: errorPublicaciones } = await supabaseClient
      .from('publicaciones')
      .select('*')
      .order('fecha', { ascending: false });

    if (errorPublicaciones) {
      console.error('Error cargando publicaciones:', errorPublicaciones);
    } else {
      publicaciones = dataPublicaciones || [];
    }

    console.log('✅ Datos cargados:', { usuarios: usuarios.length, publicaciones: publicaciones.length });

  } catch (err) {
    console.error('Error en cargarDatos:', err);
  }
}

/* ----------------------------------------------------------------
   ESTADÍSTICAS – Actualiza los contadores del panel
   ---------------------------------------------------------------- */
function actualizarEstadisticas() {
  setStatValue('statUsuarios',      usuarios.length);
  setStatValue('statPublicaciones', publicaciones.length);
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

  const datos = tipoActual === 'usuarios' ? usuarios : publicaciones;

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
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id, 10);
      await eliminar(id);
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
  return `
    <div>
      <strong>${usuario.nombre || 'Sin nombre'}</strong>
      <p class="text-muted small mb-1">${usuario.correo || 'Sin correo'}</p>
      <span class="badge-role">${usuario.rol || 'usuario'}</span>
    </div>
    <button
      class="btn btn-danger btn-sm btn-eliminar"
      data-id="${usuario.id}"
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
  const badgeClass = pub.tipo === 'perdido' ? 'bg-danger' : 'bg-success';
  return `
    <div>
      <strong>${pub.titulo || 'Sin título'}</strong>
      <p class="text-muted small mb-1">Autor: ${pub.usuario || 'Anónimo'}</p>
      <span class="badge ${badgeClass}">${pub.tipo || 'publicación'}</span>
    </div>
    <button
      class="btn btn-danger btn-sm btn-eliminar"
      data-id="${pub.id}"
      aria-label="Eliminar publicación ${pub.titulo}">
      <i class="bi bi-trash" aria-hidden="true"></i>
    </button>
  `;
}

/* ----------------------------------------------------------------
   ELIMINAR
   Elimina de Supabase y actualiza la vista.
   ---------------------------------------------------------------- */
async function eliminar(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este elemento?')) {
    return;
  }

  try {
    let tabla = tipoActual === 'usuarios' ? 'usuario' : 'publicaciones';
    
    const { error } = await supabaseClient
      .from(tabla)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar. Intenta de nuevo.');
      return;
    }

    // Recargar datos después de eliminar
    await cargarDatos();
    actualizarEstadisticas();
    render();
    alert('✅ Elemento eliminado correctamente');

  } catch (err) {
    console.error('Error en eliminar:', err);
    alert('Error al eliminar. Intenta de nuevo.');
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
   ---------------------------------------------------------------- */
function initLogout() {
  const btn = document.getElementById('btnLogout');
  btn?.addEventListener('click', () => {
    localStorage.removeItem('userLogged');
    window.location.href = 'login.html';
  });
}
