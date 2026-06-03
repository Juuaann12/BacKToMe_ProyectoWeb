/**
 * modal-buscar.js
 * Lógica del modal para buscar objetos encontrados y reportados
 */

if (!window.supabaseClient) {
  var supabaseUrl = 'https://nspadsjyeeakerarojsm.supabase.co';
  var supabaseKey = 'sb_publishable_hW1N-mn5qgGRrt4DXgz1Zg_eqS2N4Th';
  window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
}
var supabaseClient = window.supabaseClient;

document.addEventListener('DOMContentLoaded', function() {
  initBuscador();
});

/**
 * Inicializa el buscador
 */
function initBuscador() {
  const btnBuscar        = document.getElementById('btnBuscar');
  const searchInput      = document.getElementById('searchInput');
  const btnLimpiar       = document.getElementById('btnLimpiarBusca');
  const btnAplicarFiltros = document.getElementById('btnAplicarFiltrosBusca');
  const ordenarSelect    = document.getElementById('ordenarBusca');

  if (!btnBuscar || !searchInput) {
    console.warn('Elementos del buscador no encontrados');
    return;
  }

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') ejecutarBusqueda();
  });

  btnBuscar.addEventListener('click', ejecutarBusqueda);
  if (btnLimpiar)        btnLimpiar.addEventListener('click', limpiarBusqueda);
  if (btnAplicarFiltros) btnAplicarFiltros.addEventListener('click', ejecutarBusqueda);
  if (ordenarSelect)     ordenarSelect.addEventListener('change', ejecutarBusqueda);
}

/**
 * Ejecuta la búsqueda consultando Supabase (con imágenes)
 */
async function ejecutarBusqueda() {
  const termino        = document.getElementById('searchInput').value.trim();
  const filtroTipo     = document.getElementById('filtroTipoBusca').value;
  const filtroCategoria = document.getElementById('filtroCategoriaB').value;
  const ordenar        = document.getElementById('ordenarBusca').value;

  if (!termino) {
    mostrarMensaje('Ingresa un término de búsqueda');
    return;
  }

  const contenedor = document.getElementById('contenedorResultadosBusca');
  const contador   = document.getElementById('resultadosCountBusca');

  contenedor.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Buscando...</span>
      </div>
      <p class="text-muted mt-2">Buscando resultados...</p>
    </div>
  `;

  try {
    let resultados = [];

    // ── Publicaciones encontradas ──────────────────────────────
    if (!filtroTipo || filtroTipo === 'encontrados') {
      let query = supabaseClient
        .from('publicaciones')
        .select('*, imagenes_publicaciones(url)')
        .or(`titulo.ilike.%${termino}%,descripcion.ilike.%${termino}%,categoria.ilike.%${termino}%,ubicacion.ilike.%${termino}%`);

      if (filtroCategoria) query = query.eq('categoria', filtroCategoria);

      const { data, error } = await query;
      if (error) throw error;

      const encontrados = (data || []).map(p => ({
        id:          p.id,
        titulo:      p.titulo,
        tipo:        'encontrado',
        categoria:   p.categoria,
        descripcion: p.descripcion,
        lugar:       p.ubicacion || 'N/A',
        fecha:       p.fecha_encontrado,
        fecha_iso:   p.fecha_creacion,
        fecha_creacion: p.fecha_creacion,
        contacto:    p.contacto || p.telefono || p.email || '',
        imagenes:    normalizarImagenes(p.imagenes_publicaciones)
      }));

      resultados = [...resultados, ...encontrados];
    }

    // ── Reportes perdidos ──────────────────────────────────────
    if (!filtroTipo || filtroTipo === 'reportados') {
      let query = supabaseClient
        .from('reportes')
        .select('*, imagenes_reportes(url)')
        .or(`titulo.ilike.%${termino}%,descripcion.ilike.%${termino}%,categoria.ilike.%${termino}%,sector.ilike.%${termino}%`);

      if (filtroCategoria) query = query.eq('categoria', filtroCategoria);

      const { data, error } = await query;
      if (error) throw error;

      const perdidos = (data || []).map(r => ({
        id:          r.id,
        titulo:      r.titulo || `Objeto Perdido: ${r.categoria}`,
        tipo:        'perdido',
        categoria:   r.categoria,
        descripcion: r.descripcion,
        lugar:       r.sector || 'N/A',
        fecha:       r.fecha_perdida,
        fecha_iso:   r.fecha_creacion,
        fecha_creacion: r.fecha_creacion,
        contacto:    r.contacto || r.telefono || r.email || '',
        imagenes:    normalizarImagenes(r.imagenes_reportes)
      }));

      resultados = [...resultados, ...perdidos];
    }

    // ── Ordenar ────────────────────────────────────────────────
    if (ordenar === 'antiguo') {
      resultados.sort((a, b) => new Date(a.fecha_iso) - new Date(b.fecha_iso));
    } else if (ordenar === 'nombre') {
      resultados.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
    } else {
      resultados.sort((a, b) => new Date(b.fecha_iso) - new Date(a.fecha_iso));
    }

    // Agregar al cache global para que abrirDetallePublicacion() los encuentre
    if (!window.publicacionesCache) window.publicacionesCache = [];
    resultados.forEach(r => {
      r.imagen = r.imagenes[0] || 'imagenes/logo.png';
      // Añadir al cache si no existe ya
      const yaExiste = window.publicacionesCache.some(c => `${c.tipo}-${c.id}` === `${r.tipo}-${r.id}`);
      if (!yaExiste) window.publicacionesCache.push(r);
    });

    // ── Renderizar ─────────────────────────────────────────────
    contador.textContent = resultados.length;

    if (resultados.length === 0) {
      contenedor.innerHTML = `
        <div class="alert alert-info text-center" role="alert">
          <i class="bi bi-info-circle me-2"></i>
          No se encontraron resultados para "<strong>${termino}</strong>"
        </div>
      `;
      return;
    }

    contenedor.innerHTML = resultados.map(r => {
      const badgeClass  = r.tipo === 'perdido' ? 'bg-danger' : 'bg-success';
      const badgeLabel  = r.tipo === 'perdido' ? 'Perdido' : 'Encontrado';
      const fotosLabel  = r.imagenes.length === 1 ? '1 foto' : `${r.imagenes.length} fotos`;
      const cacheId     = `${r.tipo}-${r.id}`;

      return `
        <div class="resultado-item p-3 border rounded-3 bg-white shadow-sm mb-3 d-flex align-items-center gap-3"
          role="button" tabindex="0" style="cursor: pointer;"
          data-busca-id="${cacheId}"
          aria-label="Ver detalles de ${escapeHTML(r.titulo)}">

          <!-- Miniatura -->
          <div class="flex-shrink-0 position-relative" style="width: 80px; height: 80px;">
            <img src="${escapeHTML(r.imagen)}"
              alt="${escapeHTML(r.titulo)}"
              class="rounded-2"
              style="width: 80px; height: 80px; object-fit: cover;"
              onerror="this.src='imagenes/logo.png'">
            ${r.imagenes.length > 1 ? `
              <span class="position-absolute bottom-0 end-0 badge bg-dark opacity-75" style="font-size: 0.65rem;">
                <i class="bi bi-images"></i> ${fotosLabel}
              </span>` : ''}
          </div>

          <!-- Info -->
          <div class="flex-grow-1 min-w-0">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <h6 class="mb-1 text-truncate">${escapeHTML(r.titulo)}</h6>
              <span class="badge ${badgeClass} flex-shrink-0">${badgeLabel}</span>
            </div>
            <span class="badge bg-secondary me-1" style="font-size: 0.7rem;">${escapeHTML(r.categoria || 'Sin categoría')}</span>
            <p class="small text-muted mb-0 mt-1 text-truncate">
              <i class="bi bi-geo-alt me-1"></i>${escapeHTML(r.lugar)}
              &nbsp;·&nbsp;
              <i class="bi bi-calendar me-1"></i>${formatearFecha(r.fecha)}
            </p>
            ${r.descripcion ? `<p class="small text-muted mb-0 mt-1 text-truncate">${escapeHTML(r.descripcion)}</p>` : ''}
          </div>

          <i class="bi bi-chevron-right text-muted flex-shrink-0"></i>
        </div>
      `;
    }).join('');

    // Registrar eventos de clic en cada resultado
    contenedor.querySelectorAll('[data-busca-id]').forEach(el => {
      const abrir = () => abrirDetallePublicacion(el.dataset.buscaId);
      el.addEventListener('click', abrir);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          abrir();
        }
      });
    });

  } catch (err) {
    console.error('Error en búsqueda:', err);
    contenedor.innerHTML = `
      <div class="alert alert-danger text-center" role="alert">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Error al buscar. Intenta de nuevo.
      </div>
    `;
  }
}

/**
 * Limpia la búsqueda
 */
function limpiarBusqueda() {
  document.getElementById('searchInput').value = '';
  document.getElementById('filtroTipoBusca').value = '';
  document.getElementById('filtroCategoriaB').value = '';
  document.getElementById('ordenarBusca').value = 'reciente';

  const contenedor = document.getElementById('contenedorResultadosBusca');
  const contador   = document.getElementById('resultadosCountBusca');

  contador.textContent = '0';
  contenedor.innerHTML = `
    <p class="text-muted text-center py-4">
      <i class="bi bi-search me-2"></i>Realiza una búsqueda para ver resultados
    </p>
  `;
}

/**
 * Muestra un mensaje al usuario
 */
function mostrarMensaje(mensaje, tipo = 'warning') {
  const alertHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert"
      style="position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
      ${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  const alertElement = document.createElement('div');
  alertElement.innerHTML = alertHTML;
  document.body.appendChild(alertElement.firstElementChild);

  setTimeout(() => {
    const alert = document.body.querySelector('.alert');
    if (alert) alert.remove();
  }, 4000);
}

/**
 * Formatea una fecha en formato legible
 */
function formatearFecha(fechaString) {
  if (!fechaString) return 'Fecha desconocida';
  const fecha = new Date(fechaString);
  const hoy   = new Date();
  const ayer  = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  if (fecha.toDateString() === hoy.toDateString()) return 'Hoy';
  if (fecha.toDateString() === ayer.toDateString()) return 'Ayer';
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}