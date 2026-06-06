/* ================================================================
   MIS PUBLICACIONES - BackToMe
   ================================================================ */

let usuarioActual = null;
let publicacionesUsuario = [];
let publicacionesFiltradas = [];

document.addEventListener('DOMContentLoaded', () => {
  usuarioActual = getCurrentUser();

  if (!usuarioActual?.cedula) {
    window.location.href = 'login.html';
    return;
  }

  initUI();
  cargarMisPublicaciones();
});

function initUI() {
  const email = usuarioActual.email || usuarioActual.correo || usuarioActual.cedula;
  const emailNode = document.getElementById('menuUserEmail');
  if (emailNode) emailNode.textContent = email;

  document.getElementById('btnLogout')?.addEventListener('click', () => {
    localStorage.removeItem('userLogged');
    window.location.href = 'login.html';
  });

  document.getElementById('btnRecargarMis')?.addEventListener('click', () => {
    cargarMisPublicaciones();
  });

  document.getElementById('buscarMisPublicaciones')?.addEventListener('input', aplicarFiltros);
  document.getElementById('filtroMisPublicaciones')?.addEventListener('change', aplicarFiltros);
  document.getElementById('editarPublicacionForm')?.addEventListener('submit', guardarCambiosPublicacion);

  document.getElementById('misPublicacionesLista')?.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;

    const cacheId = actionButton.dataset.cacheId;
    if (actionButton.dataset.action === 'edit') abrirModalEdicion(cacheId);
    if (actionButton.dataset.action === 'delete') eliminarPublicacion(cacheId);
  });
}

async function cargarMisPublicaciones() {
  const lista = document.getElementById('misPublicacionesLista');
  if (!lista) return;

  lista.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="text-muted mt-3 mb-0">Cargando tus publicaciones...</p>
    </div>
  `;

  try {
    const [encontradasResp, perdidasResp] = await Promise.all([
      supabaseClient
        .from('publicaciones')
        .select('*, imagenes_publicaciones(url)')
        .eq('cedula_usuario', usuarioActual.cedula)
        .order('fecha_creacion', { ascending: false }),
      supabaseClient
        .from('reportes')
        .select('*, imagenes_reportes(url)')
        .eq('cedula_usuario', usuarioActual.cedula)
        .order('fecha_creacion', { ascending: false })
    ]);

    if (encontradasResp.error) throw encontradasResp.error;
    if (perdidasResp.error) throw perdidasResp.error;

    const encontradas = (encontradasResp.data || []).map(pub => ({
      cacheId: `encontrado-${pub.id}`,
      id: pub.id,
      tipo: 'encontrado',
      titulo: pub.titulo,
      categoria: pub.categoria,
      descripcion: pub.descripcion,
      lugar: pub.ubicacion,
      fecha: pub.fecha_encontrado,
      fecha_creacion: pub.fecha_creacion,
      imagenes: normalizarImagenes(pub.imagenes_publicaciones) || ['imagenes/logo.png']
    }));

    const perdidas = (perdidasResp.data || []).map(rep => ({
      cacheId: `perdido-${rep.id}`,
      id: rep.id,
      tipo: 'perdido',
      titulo: rep.titulo || `Objeto perdido: ${rep.categoria}`,
      categoria: rep.categoria,
      descripcion: rep.descripcion,
      lugar: rep.sector,
      fecha: rep.fecha_perdida,
      fecha_creacion: rep.fecha_creacion,
      imagenes: normalizarImagenes(rep.imagenes_reportes) || ['imagenes/logo.png']
    }));

    publicacionesUsuario = [...encontradas, ...perdidas]
      .sort((a, b) => new Date(b.fecha_creacion || b.fecha) - new Date(a.fecha_creacion || a.fecha));

    aplicarFiltros();
  } catch (error) {
    console.error('Error al cargar publicaciones:', error);
    lista.innerHTML = `
      <div class="alert alert-danger mb-0">
        No se pudieron cargar tus publicaciones. Intenta nuevamente.
      </div>
    `;
  }
}

function aplicarFiltros() {
  const texto = document.getElementById('buscarMisPublicaciones')?.value.trim().toLowerCase() || '';
  const tipo = document.getElementById('filtroMisPublicaciones')?.value || 'todos';

  publicacionesFiltradas = publicacionesUsuario.filter(pub => {
    const coincideTipo = tipo === 'todos' || pub.tipo === tipo;
    const contenido = [
      pub.titulo,
      pub.categoria,
      pub.descripcion,
      pub.lugar
    ].join(' ').toLowerCase();
    return coincideTipo && contenido.includes(texto);
  });

  renderMisPublicaciones();
  actualizarStats();
}

function renderMisPublicaciones() {
  const lista = document.getElementById('misPublicacionesLista');
  if (!lista) return;

  if (publicacionesUsuario.length === 0) {
    lista.innerHTML = `
      <div class="mis-publicaciones-empty">
        <i class="bi bi-file-earmark-plus" aria-hidden="true"></i>
        <h3 class="h5 fw-bold">Aun no tienes publicaciones</h3>
        <p class="text-muted mb-3">Cuando publiques o reportes un objeto, aparecera aqui.</p>
        <a href="index.html" class="btn btn-primary">Crear publicacion</a>
      </div>
    `;
    return;
  }

  if (publicacionesFiltradas.length === 0) {
    lista.innerHTML = `
      <div class="alert alert-info mb-0">
        No hay publicaciones que coincidan con los filtros.
      </div>
    `;
    return;
  }

  lista.innerHTML = publicacionesFiltradas.map(buildPublicacionItemHTML).join('');
}

function buildPublicacionItemHTML(pub) {
  const badgeClass = pub.tipo === 'perdido' ? 'bg-danger' : 'bg-success';
  const badgeLabel = pub.tipo === 'perdido' ? 'Perdido' : 'Encontrado';
  const imagen = pub.imagenes[0] || 'imagenes/logo.png';

  return `
    <article class="mis-publicacion-item">
      <div class="mis-publicacion-thumb">
        <img src="${escapeHTML(imagen)}" alt="${escapeHTML(pub.titulo)}"
          onerror="this.src='imagenes/logo.png'">
        <span><i class="bi bi-images" aria-hidden="true"></i> ${pub.imagenes.length}</span>
      </div>
      <div class="mis-publicacion-content">
        <div class="d-flex flex-wrap align-items-start gap-2 mb-2">
          <h3 class="h5 fw-bold mb-0">${escapeHTML(pub.titulo)}</h3>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
        </div>
        <p class="text-muted small mb-2">${escapeHTML(pub.descripcion || 'Sin descripcion')}</p>
        <div class="mis-publicacion-meta">
          <span><i class="bi bi-tag" aria-hidden="true"></i>${escapeHTML(pub.categoria || 'Sin categoria')}</span>
          <span><i class="bi bi-geo-alt" aria-hidden="true"></i>${escapeHTML(pub.lugar || 'Sin ubicacion')}</span>
          <span><i class="bi bi-calendar3" aria-hidden="true"></i>${formatDate(pub.fecha)}</span>
        </div>
      </div>
      <div class="mis-publicacion-actions">
        <button class="btn btn-outline-primary btn-sm" type="button"
          data-action="edit" data-cache-id="${pub.cacheId}">
          <i class="bi bi-pencil-square me-1" aria-hidden="true"></i>Editar
        </button>
        <button class="btn btn-outline-danger btn-sm" type="button"
          data-action="delete" data-cache-id="${pub.cacheId}">
          <i class="bi bi-trash me-1" aria-hidden="true"></i>Eliminar
        </button>
      </div>
    </article>
  `;
}

function abrirModalEdicion(cacheId) {
  const pub = publicacionesUsuario.find(item => item.cacheId === cacheId);
  const modalEl = document.getElementById('editarPublicacionModal');
  if (!pub) {
    console.error('No se encontró la publicación para editar:', cacheId);
    return;
  }
  if (!modalEl) {
    console.error('No se encontró el modal de edición de publicaciones');
    return;
  }

  document.getElementById('editCacheId').value = pub.cacheId;
  document.getElementById('editTipo').value = pub.tipo;
  document.getElementById('editTitulo').value = pub.titulo || '';

  const categoriaInput = document.getElementById('editCategoria');
  if (categoriaInput) {
    const normalizedCat = String(pub.categoria || '').trim();
    if (!setSelectValueIgnoreCase(categoriaInput, normalizedCat)) {
      categoriaInput.value = '';
    }
  }

  document.getElementById('editDescripcion').value = pub.descripcion || '';
  document.getElementById('editLugar').value = pub.lugar || '';
  document.getElementById('editFecha').value = formatDateInput(pub.fecha);
  document.getElementById('editarPublicacionTipo').textContent = pub.tipo === 'perdido'
    ? 'Objeto perdido'
    : 'Objeto encontrado';

  const fotos = document.getElementById('editFotosActuales');
  fotos.innerHTML = pub.imagenes.map((url, index) => `
    <a href="${escapeHTML(url)}" target="_blank" rel="noopener"
      class="mis-publicacion-photo-link">
      <img src="${escapeHTML(url)}" alt="Foto ${index + 1}"
        onerror="this.src='imagenes/logo.png'">
    </a>
  `).join('');

  const form = document.getElementById('editarPublicacionForm');
  form.classList.remove('was-validated');
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function guardarCambiosPublicacion(event) {
  event.preventDefault();

  const form = event.currentTarget;
  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }

  const cacheId = document.getElementById('editCacheId').value;
  const pub = publicacionesUsuario.find(item => item.cacheId === cacheId);
  if (!pub) return;

  const datosBase = {
    titulo: document.getElementById('editTitulo').value.trim(),
    categoria: document.getElementById('editCategoria').value,
    descripcion: document.getElementById('editDescripcion').value.trim()
  };

  const datos = pub.tipo === 'perdido'
    ? {
        ...datosBase,
        sector: document.getElementById('editLugar').value.trim(),
        fecha_perdida: document.getElementById('editFecha').value
      }
    : {
        ...datosBase,
        ubicacion: document.getElementById('editLugar').value.trim(),
        fecha_encontrado: document.getElementById('editFecha').value
      };

  setSubmitLoading(true);

  try {
    const tabla = pub.tipo === 'perdido' ? 'reportes' : 'publicaciones';
    const { data, error } = await supabaseClient
      .from(tabla)
      .update(datos)
      .eq('id', pub.id)
      .select('id');

    if (error) throw error;
    asegurarFilasAfectadas(data, 'No se actualizo ninguna fila en Supabase.');

    bootstrap.Modal.getInstance(document.getElementById('editarPublicacionModal'))?.hide();
    showSuccess('Publicación actualizada correctamente.');
    await cargarMisPublicaciones();
  } catch (error) {
    console.error('Error al actualizar:', error);
    showError('No se pudo actualizar la publicación.');
  } finally {
    setSubmitLoading(false);
  }
}

async function eliminarPublicacion(cacheId) {
  const pub = publicacionesUsuario.find(item => item.cacheId === cacheId);
  if (!pub) return;

  const confirmar = confirm(`Seguro que quieres eliminar "${pub.titulo}"? Esta accion no se puede deshacer.`);
  if (!confirmar) return;

  try {
    if (pub.tipo === 'perdido') {
      await eliminarReporte(pub.id);
    } else {
      await eliminarPublicacionEncontrada(pub.id);
    }

    showSuccess('Publicación eliminada correctamente.');
    publicacionesUsuario = publicacionesUsuario.filter(item => item.cacheId !== cacheId);
    aplicarFiltros();
  } catch (error) {
    console.error('Error al eliminar:', error);
    showError('No se pudo eliminar la publicación.');
  }
}

async function eliminarPublicacionEncontrada(id) {
  const { error: imgError } = await supabaseClient
    .from('imagenes_publicaciones')
    .delete()
    .eq('id_publicacion', id);
  if (imgError) throw imgError;

  const { data, error } = await supabaseClient
    .from('publicaciones')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw error;
  asegurarFilasAfectadas(data, 'No se elimino ninguna publicacion en Supabase.');
}

async function eliminarReporte(id) {
  const { error: imgError } = await supabaseClient
    .from('imagenes_reportes')
    .delete()
    .eq('id_reporte', id);
  if (imgError) throw imgError;

  const { data, error } = await supabaseClient
    .from('reportes')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw error;
  asegurarFilasAfectadas(data, 'No se elimino ningun reporte en Supabase.');
}



function actualizarStats() {
  const encontradas = publicacionesUsuario.filter(pub => pub.tipo === 'encontrado').length;
  const perdidas = publicacionesUsuario.filter(pub => pub.tipo === 'perdido').length;

  setText('statMisTotal', publicacionesUsuario.length);
  setText('statMisEncontradas', encontradas);
  setText('statMisPerdidas', perdidas);
}

function setSubmitLoading(loading) {
  const btn = document.querySelector('#editarPublicacionForm button[type="submit"]');
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...'
    : '<i class="bi bi-save me-1" aria-hidden="true"></i>Guardar cambios';
}

/* ================================================================
   HELPER LOCAL: Formatear fecha para input
   ================================================================ */
function formatDateInput(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) {
    return String(value).slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function setSelectValueIgnoreCase(select, value) {
  if (!select || typeof value !== 'string') return false;
  const normalizedValue = value.trim().toLowerCase();
  for (const option of Array.from(select.options)) {
    if (String(option.value).trim().toLowerCase() === normalizedValue ||
        String(option.text).trim().toLowerCase() === normalizedValue) {
      select.value = option.value;
      return true;
    }
  }
  return false;
}

function asegurarFilasAfectadas(data, mensaje) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`${mensaje} Verifica que el registro exista y que Supabase permita UPDATE/DELETE para esta tabla.`);
  }
}
