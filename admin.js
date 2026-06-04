/* ================================================================
   ADMIN.JS  –  BackToMe · Panel de Administración
   Gestiona usuarios y publicaciones: tabs, filtro y render.
   ================================================================ */

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

    // Cargar imágenes de publicaciones
    const { data: imagenesPub, error: errorImagenesPub } = await supabaseClient
      .from('imagenes_publicaciones')
      .select('id_publicacion, url');
    if (errorImagenesPub) console.warn('⚠️ Error cargando imágenes de publicaciones:', errorImagenesPub);

    // Cargar imágenes de reportes
    const { data: imagenesRep, error: errorImagenesRep } = await supabaseClient
      .from('imagenes_reportes')
      .select('id_reporte, url');
    if (errorImagenesRep) console.warn('⚠️ Error cargando imágenes de reportes:', errorImagenesRep);

    // Agrupar imágenes por ID
    const mapaImagenesPub = {};
    (imagenesPub || []).forEach(img => {
      if (!mapaImagenesPub[img.id_publicacion]) mapaImagenesPub[img.id_publicacion] = [];
      mapaImagenesPub[img.id_publicacion].push(img.url);
    });

    const mapaImagenesRep = {};
    (imagenesRep || []).forEach(img => {
      if (!mapaImagenesRep[img.id_reporte]) mapaImagenesRep[img.id_reporte] = [];
      mapaImagenesRep[img.id_reporte].push(img.url);
    });

    publicacionesData = [
      ...(publicaciones || []).map(pub => ({
        ...pub,
        adminTipo: 'encontrado',
        adminTabla: 'publicaciones',
        imagenes: mapaImagenesPub[pub.id] || []
      })),
      ...(reportes || []).map(rep => ({
        ...rep,
        adminTipo: 'perdido',
        adminTabla: 'reportes',
        ubicacion: rep.sector,
        fecha_encontrado: rep.fecha_perdida,
        imagenes: mapaImagenesRep[rep.id] || []
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

  if (tipoActual === 'publicaciones') {
    // Agrupar publicaciones por usuario
    const publicacionesPorUsuario = agruparPublicacionesPorUsuario(datos);
    
    Object.entries(publicacionesPorUsuario).forEach(([cedulaUsuario, pubsDelUsuario]) => {
      const usuario = usuariosData.find(u => u.cedula === cedulaUsuario);
      const grupoDiv = document.createElement('div');
      grupoDiv.className = 'usuario-grupo mb-4';
      grupoDiv.innerHTML = buildEncabezadoUsuario(usuario);
      
      pubsDelUsuario.forEach((pub, idxPub) => {
        const item = document.createElement('div');
        item.className = 'item';
        item.setAttribute('role', 'listitem');
        const idxGlobal = publicacionesData.findIndex(p => p.id === pub.id && p.cedula_usuario === cedulaUsuario);
        item.innerHTML = buildPublicacionHTML(pub, idxGlobal);
        grupoDiv.appendChild(item);
      });
      
      fragment.appendChild(grupoDiv);
    });
  } else {
    // Renderizar usuarios sin agrupar
    datos.forEach((dato, index) => {
      const item = document.createElement('div');
      item.className = 'item';
      item.setAttribute('role', 'listitem');
      item.innerHTML = buildUsuarioHTML(dato, index);
      fragment.appendChild(item);
    });
  }

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
   AGRUPAR PUBLICACIONES POR USUARIO
   ---------------------------------------------------------------- */
function agruparPublicacionesPorUsuario(publicaciones) {
  const grupos = {};
  publicaciones.forEach(pub => {
    const cedula = pub.cedula_usuario || 'sin-usuario';
    if (!grupos[cedula]) grupos[cedula] = [];
    grupos[cedula].push(pub);
  });
  return grupos;
}

/* ----------------------------------------------------------------
   BUILD ENCABEZADO USUARIO (Grupo de publicaciones)
   ---------------------------------------------------------------- */
function buildEncabezadoUsuario(usuario) {
  if (!usuario) {
    return `
      <div class="encabezado-usuario p-3 mb-3 border-start border-4 border-warning bg-light rounded">
        <p class="text-muted mb-0">⚠️ Usuario no encontrado</p>
      </div>
    `;
  }
  
  return `
    <div class="encabezado-usuario p-3 mb-3 border-start border-4 border-primary bg-light rounded">
      <div class="row g-2">
        <div class="col-md-6">
          <p class="mb-1"><strong>👤 ${escapeHTML(usuario.nombre || 'N/A')}</strong></p>
          <small class="text-muted d-block">📋 Cédula: ${escapeHTML(usuario.cedula || 'N/A')}</small>
        </div>
        <div class="col-md-6">
          <small class="text-muted d-block">📧 Correo: ${escapeHTML(usuario.correo || 'N/A')}</small>
          <small class="text-muted d-block">📱 Celular: ${escapeHTML(usuario.celular || 'N/A')}</small>
        </div>
      </div>
    </div>
  `;
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
   BUILD PUBLICACIÓN HTML (MEJORADO CON FOTOS Y DETALLES)
   ---------------------------------------------------------------- */
function buildPublicacionHTML(pub, index) {
  const tipo = pub.adminTipo || pub.tipo || pub.tipopublicacion || 'publicacion';
  const badgeClass = tipo === 'perdido' ? 'bg-danger' : 'bg-success';
  const autor = pub.autor || pub.usuario || pub.email || pub.cedula_usuario || 'Anonimo';
  const titulo = escapeHTML(pub.titulo || pub.titulo_publicacion || `Objeto ${tipo}: ${pub.categoria || 'Sin categoria'}`);
  const ubicacion = escapeHTML(pub.ubicacion || pub.sector || 'N/A');
  const categoria = escapeHTML(pub.categoria || 'N/A');
  const descripcion = escapeHTML(pub.descripcion || pub.descripcion_reporte || 'Sin descripción');
  const imagenes = pub.imagenes || [];
  const fechaCreacion = pub.fecha_creacion ? formatDate(pub.fecha_creacion) : 'N/A';

  let galeriaHTML = '';
  if (imagenes.length > 0) {
    galeriaHTML = `
      <div class="mt-3">
        <strong class="d-block mb-2">📷 Fotos de la publicación:</strong>
        <div class="row g-2">
          ${imagenes.map(url => `
            <div class="col-auto">
              <a href="${url}" target="_blank" title="Ver en tamaño completo">
                <img src="${url}" alt="Foto publicación" 
                     class="img-thumbnail" 
                     style="width: 100px; height: 100px; object-fit: cover; cursor: pointer;">
              </a>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="publicacion-admin-card p-3 border rounded-2 bg-white">
      <div class="row g-2">
        <div class="col-12">
          <h5 class="mb-2">${titulo}</h5>
          <span class="badge ${badgeClass} mb-2">${tipo.toUpperCase()}</span>
        </div>
      </div>
      
      <div class="row g-2 mb-2 small">
        <div class="col-md-6">
          <p class="mb-1"><strong>Categoría:</strong> ${categoria}</p>
          <p class="mb-1"><strong>Ubicación:</strong> ${ubicacion}</p>
        </div>
        <div class="col-md-6">
          <p class="mb-1"><strong>Fecha:</strong> ${fechaCreacion}</p>
          <p class="mb-1"><strong>Estado:</strong> <span class="badge bg-info">Activo</span></p>
        </div>
      </div>

      <div class="mb-2">
        <strong>Descripción:</strong>
        <p class="text-muted mb-0 small">${descripcion}</p>
      </div>

      ${galeriaHTML}
    </div>
    
    <button
      class="btn btn-danger btn-sm btn-eliminar mt-2"
      data-index="${index}"
      aria-label="Eliminar publicación ${titulo}">
      <i class="bi bi-trash" aria-hidden="true"></i> Eliminar
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