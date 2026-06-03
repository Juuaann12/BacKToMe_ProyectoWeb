/* ================================================================
   ADMIN.JS  –  BackToMe · Panel de Administración
   Gestiona usuarios y publicaciones: tabs, filtro y render.
   ================================================================ */
// Configuración de Supabase
// Verificamos si el cliente ya existe en el objeto window para no sobreescribirlo
if (!window.supabaseClient) {
  var supabaseUrl = 'https://nspadsjyeeakerarojsm.supabase.co';
  var supabaseKey = 'sb_publishable_hW1N-mn5qgGRrt4DXgz1Zg_eqS2N4Th'; 
  window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
}
var supabaseClient = window.supabaseClient;

/* ----------------------------------------------------------------
   PROTECCIÓN DE RUTA
   Solo permite acceso a usuarios con rol 'admin'
   ---------------------------------------------------------------- */
function checkAdminAccess() {
  const user = JSON.parse(localStorage.getItem('userLogged'));
  
  if (!user || !user.email) {
    window.location.href = 'login.html';
    return false;
  }
  
  if (user.rol !== 'admin') {
    alert('⛔ Acceso restringido. Solo administradores.');
    window.location.href = 'index.html';
    return false;
  }
  
  return true;
}

/* ----------------------------------------------------------------
   ESTADO GLOBAL DEL PANEL
   ---------------------------------------------------------------- */
let tipoActual = 'usuarios';
let usuariosData = [];
let publicacionesData = [];

/* ----------------------------------------------------------------
   INICIALIZACIÓN
   ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAdminAccess()) return;
  
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
    const { data: usuarios, error: errorUsuarios } = await supabaseClient
      .from('usuario')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (errorUsuarios) throw errorUsuarios;
    usuariosData = usuarios || [];
    
    const { data: publicaciones, error: errorPublicaciones } = await supabaseClient
      .from('publicaciones')
      .select('*');
    
    if (errorPublicaciones) throw errorPublicaciones;

    const { data: reportes, error: errorReportes } = await supabaseClient
      .from('reportes')
      .select('*');
    
    if (errorReportes) throw errorReportes;

    publicacionesData = [
      ...(publicaciones || []).map(pub => ({
        ...pub,
        adminTipo: 'encontrado',
        adminTabla: 'publicaciones'
      })),
      ...(reportes || []).map(rep => ({
        ...rep,
        adminTipo: 'perdido',
        adminTabla: 'reportes',
        ubicacion: rep.sector,
        fecha_encontrado: rep.fecha_perdida
      }))
    ].sort((a, b) => new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0));
    
    console.log('✅ Datos cargados:', usuariosData.length, 'usuarios,', publicacionesData.length, 'publicaciones');
    
  } catch (err) {
    console.error('❌ Error cargando datos:', err);
    alert('Error al cargar datos. Revisa la consola.');
  }
}

/* ----------------------------------------------------------------
   ESTADÍSTICAS
   ---------------------------------------------------------------- */
function actualizarEstadisticas() {
  const totalReportes = publicacionesData.filter(pub => pub.adminTipo === 'perdido').length;

  setStatValue('statUsuarios',      usuariosData.length);
  setStatValue('statPublicaciones', publicacionesData.length);
  setStatValue('statNuevos',        0);
  setStatValue('statReportes',      totalReportes);
}

function setStatValue(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

/* ----------------------------------------------------------------
   CAMBIAR TAB
   ---------------------------------------------------------------- */
function cambiarTab(tipo, btn) {
  tipoActual = tipo;

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');

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

  lista.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      eliminar(idx);
    });
  });
}

/* ----------------------------------------------------------------
   BUILD USUARIO HTML  ✅ FOTOS VISIBLES
   ---------------------------------------------------------------- */
function buildUsuarioHTML(usuario, index) {
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

        <!-- ✅ FOTOS VISIBLES -->
        <div class="col-12">
          <div class="row g-3">

            <div class="col-6">
              <small class="text-muted d-block mb-1">Foto de perfil</small>
              ${usuario.foto_perfil
                ? `<a href="${usuario.foto_perfil}" target="_blank" title="Clic para ver en tamaño completo">
                     <img src="${usuario.foto_perfil}"
                       alt="Foto de perfil de ${usuario.nombre || ''}"
                       class="img-thumbnail"
                       style="width: 120px; height: 120px; object-fit: cover; cursor: pointer;">
                   </a>`
                : '<span class="text-muted small">Sin foto de perfil</span>'
              }
            </div>

            <div class="col-6">
              <small class="text-muted d-block mb-1">Foto de cédula</small>
              ${usuario.foto_cedula
                ? `<a href="${usuario.foto_cedula}" target="_blank" title="Clic para ver en tamaño completo">
                     <img src="${usuario.foto_cedula}"
                       alt="Foto de cédula de ${usuario.nombre || ''}"
                       class="img-thumbnail"
                       style="width: 120px; height: 120px; object-fit: cover; cursor: pointer;">
                   </a>`
                : '<span class="text-muted small">Sin foto de cédula</span>'
              }
            </div>

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

/* ----------------------------------------------------------------
   BUILD PUBLICACIÓN HTML
   ---------------------------------------------------------------- */
function buildPublicacionHTML(pub, index) {
  const tipo = pub.adminTipo || pub.tipo || pub.tipopublicacion || 'publicacion';
  const badgeClass = tipo === 'perdido' ? 'bg-danger' : 'bg-success';
  const autor = pub.autor || pub.usuario || pub.email || pub.cedula_usuario || 'Anonimo';
  const titulo = pub.titulo || pub.titulo_publicacion || `Objeto perdido: ${pub.categoria || 'Sin categoria'}`;
  const ubicacion = pub.ubicacion || pub.sector || 'N/A';

  return `
    <div>
      <strong>${titulo}</strong>
      <p class="text-muted small mb-1">Autor: ${autor}</p>
      <p class="text-muted small mb-1">Ubicacion: ${ubicacion}</p>
      <span class="badge ${badgeClass}">${tipo}</span>
    </div>
    <button
      class="btn btn-danger btn-sm btn-eliminar"
      data-index="${index}"
      aria-label="Eliminar publicacion ${titulo}">
      <i class="bi bi-trash" aria-hidden="true"></i>
    </button>
  `;
}

/* ----------------------------------------------------------------
   ELIMINAR
   ---------------------------------------------------------------- */
async function eliminar(index) {
  const dato = tipoActual === 'usuarios' ? usuariosData[index] : publicacionesData[index];
  if (!dato) return;

  const nombreItem = tipoActual === 'usuarios'
    ? `usuario ${dato.nombre || dato.cedula || ''}`
    : `publicacion ${dato.titulo || dato.categoria || ''}`;
  const confirmar = confirm(`Seguro que quieres eliminar este ${nombreItem}? Esta accion tambien se borrara de Supabase.`);
  if (!confirmar) return;

  try {
    if (tipoActual === 'usuarios') {
      await eliminarUsuarioCompleto(dato.cedula);
      usuariosData.splice(index, 1);
      publicacionesData = publicacionesData.filter(pub => pub.cedula_usuario !== dato.cedula);
    } else {
      await eliminarPublicacionCompleta(dato);
      publicacionesData.splice(index, 1);
    }

    actualizarEstadisticas();
    render();
    alert('Eliminado correctamente en Supabase');
  } catch (err) {
    console.error('Error al eliminar en Supabase:', err);
    alert(`Error al eliminar en Supabase: ${err.message || 'Revisa la consola.'}`);
  }
}

async function eliminarUsuarioCompleto(cedula) {
  if (!cedula) throw new Error('El usuario no tiene cedula asociada.');

  const { data: publicaciones, error: errorPublicaciones } = await supabaseClient
    .from('publicaciones')
    .select('id')
    .eq('cedula_usuario', cedula);
  if (errorPublicaciones) throw errorPublicaciones;

  const { data: reportes, error: errorReportes } = await supabaseClient
    .from('reportes')
    .select('id')
    .eq('cedula_usuario', cedula);
  if (errorReportes) throw errorReportes;

  for (const pub of publicaciones || []) {
    await eliminarPublicacionEncontrada(pub.id, cedula);
  }

  for (const rep of reportes || []) {
    await eliminarReporte(rep.id, cedula);
  }

  const { data, error } = await supabaseClient
    .from('usuario')
    .delete()
    .eq('cedula', cedula)
    .select('cedula');
  if (error) throw error;
  asegurarFilasAfectadas(data, 'No se elimino ningun usuario en Supabase.');
}

async function eliminarPublicacionCompleta(pub) {
  if (pub.adminTabla === 'reportes' || pub.adminTipo === 'perdido') {
    await eliminarReporte(pub.id, pub.cedula_usuario);
    return;
  }
  await eliminarPublicacionEncontrada(pub.id, pub.cedula_usuario);
}

async function eliminarPublicacionEncontrada(id, cedulaUsuario) {
  const { error: imgError } = await supabaseClient
    .from('imagenes_publicaciones')
    .delete()
    .eq('id_publicacion', id);
  if (imgError) throw imgError;

  let query = supabaseClient
    .from('publicaciones')
    .delete()
    .eq('id', id);

  if (cedulaUsuario) query = query.eq('cedula_usuario', cedulaUsuario);

  const { data, error } = await query.select('id');
  if (error) throw error;
  asegurarFilasAfectadas(data, 'No se elimino ninguna publicacion en Supabase.');
}

async function eliminarReporte(id, cedulaUsuario) {
  const { error: imgError } = await supabaseClient
    .from('imagenes_reportes')
    .delete()
    .eq('id_reporte', id);
  if (imgError) throw imgError;

  let query = supabaseClient
    .from('reportes')
    .delete()
    .eq('id', id);

  if (cedulaUsuario) query = query.eq('cedula_usuario', cedulaUsuario);

  const { data, error } = await query.select('id');
  if (error) throw error;
  asegurarFilasAfectadas(data, 'No se elimino ningun reporte en Supabase.');
}

function asegurarFilasAfectadas(data, mensaje) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`${mensaje} Verifica que el registro exista y que Supabase permita DELETE para esta tabla.`);
  }
}

/* ----------------------------------------------------------------
   FILTRO
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