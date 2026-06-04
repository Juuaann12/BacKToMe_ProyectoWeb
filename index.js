/* ================================================================
   INDEX.JS – BackToMe
   Versión optimizada usando funciones compartidas
   ================================================================ */

/* ----------------------------------------------------------------
   ESTADO GLOBAL
   ---------------------------------------------------------------- */
let filtroActivo = 'todos';
let publicacionesCache = [];

/* ----------------------------------------------------------------
   INIT
   ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 BackToMe Iniciado');
  
  renderPublicaciones();
  initFiltrosMenu();
  initAuthUI();        
  initLogout();
  initAuthButtons();
  initNavbarActive();  
});

/* ================================================================
   🔹 RENDER PUBLICACIONES
   ================================================================ */
async function renderPublicaciones() {
  const container = document.getElementById('publicacionesRecientes');
  if (!container) return;

  container.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div><p>Cargando anuncios...</p></div>';

  try {
    let rawData = [];

    // 1. Cargar "Encontrados" — join con usuario para traer celular
    if (filtroActivo === 'todos' || filtroActivo === 'encontrado') {
      const { data, error } = await supabaseClient
        .from('publicaciones')
        .select('*, imagenes_publicaciones(url), usuario(celular)')
        .order('fecha_creacion', { ascending: false });
      
      if (error) throw error;
      rawData = [...rawData, ...(data || []).map(p => ({
        id:          p.id,
        titulo:      p.titulo,
        tipo:        'encontrado',
        lugar:       p.ubicacion,
        fecha:       p.fecha_encontrado,
        fecha_iso:   p.fecha_creacion,
        fecha_creacion: p.fecha_creacion,
        categoria:   p.categoria,
        descripcion: p.descripcion,
        contacto:    p.usuario?.celular || 'No disponible',
        imagenes:    normalizarImagenes(p.imagenes_publicaciones)
      }))];
    }

    // 2. Cargar "Perdidos" — join con usuario para traer celular
    if (filtroActivo === 'todos' || filtroActivo === 'perdido') {
      const { data, error } = await supabaseClient
        .from('reportes')
        .select('*, imagenes_reportes(url), usuario(celular)')
        .order('fecha_creacion', { ascending: false });
      
      if (error) throw error;
      rawData = [...rawData, ...(data || []).map(r => ({
        id:          r.id,
        titulo:      r.titulo || `Objeto Perdido: ${r.categoria}`,
        tipo:        'perdido',
        categoria:   r.categoria,
        descripcion: r.descripcion,
        lugar:       r.sector,
        fecha:       r.fecha_perdida,
        fecha_iso:   r.fecha_creacion,
        fecha_creacion: r.fecha_creacion,
        contacto:    r.usuario?.celular || 'No disponible',
        imagenes:    normalizarImagenes(r.imagenes_reportes)
      }))];
    }

    // Ordenar por los más nuevos
    rawData.sort((a, b) => new Date(b.fecha_iso) - new Date(a.fecha_iso));
    publicacionesCache = rawData.map(pub => ({
      ...pub,
      imagen: pub.imagenes[0] || 'imagenes/logo.png'
    }));

    container.innerHTML = '';
    if (publicacionesCache.length === 0) {
      container.innerHTML = '<p class="text-center py-5">No hay publicaciones disponibles.</p>';
      return;
    }

    // Usar DocumentFragment para evitar reflows
    const fragment = document.createDocumentFragment();
    publicacionesCache.slice(0, 6).forEach(pub => {
      const col = document.createElement('div');
      col.className = 'col-lg-4 col-md-6';
      col.innerHTML = buildCardHTML(pub);
      fragment.appendChild(col);
    });
    container.appendChild(fragment);
    initPublicacionCards();

  } catch (err) {
    console.error('Error al cargar datos:', err);
    container.innerHTML = '<p class="text-danger text-center py-5">Error al conectar con la base de datos.</p>';
  }
}

function buildCardHTML(pub) {
  const badgeClass = pub.tipo === 'perdido' ? 'bg-danger' : 'bg-success';
  const badgeLabel = pub.tipo === 'perdido' ? 'Perdido' : 'Encontrado';
  const fotosLabel = pub.imagenes.length === 1 ? '1 foto' : `${pub.imagenes.length} fotos`;

  return `
    <article class="card h-100 shadow-sm hover-card publicacion-card" tabindex="0"
      role="button" data-publicacion-id="${pub.tipo}-${pub.id}"
      aria-label="Ver detalles de ${escapeHTML(pub.titulo)}">
      <div class="publicacion-card-media">
        <img src="${escapeHTML(pub.imagen)}" class="card-img-top"
          alt="${escapeHTML(pub.titulo)}"
          onerror="this.src='imagenes/logo.png'">
        <span class="publicacion-photo-count">
          <i class="bi bi-images" aria-hidden="true"></i> ${fotosLabel}
        </span>
      </div>
      <div class="card-body">
        <div class="d-flex justify-content-between gap-2 mb-2">
          <h6 class="publicacion-card-title">${escapeHTML(pub.titulo)}</h6>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
        </div>
        <small class="text-muted d-block text-truncate">
          <i class="bi bi-geo-alt-fill me-1" aria-hidden="true"></i>${escapeHTML(pub.lugar || 'Sin ubicacion')}
        </small>
        <small class="text-muted d-block">
          <i class="bi bi-calendar3 me-1" aria-hidden="true"></i>${formatDate(pub.fecha)}
        </small>
      </div>
    </article>
  `;
}

function initPublicacionCards() {
  document.querySelectorAll('.publicacion-card').forEach(card => {
    const abrir = () => abrirDetallePublicacion(card.dataset.publicacionId);
    card.addEventListener('click', abrir);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        abrir();
      }
    });
  });
}

function abrirDetallePublicacion(cacheId) {
  const pub = publicacionesCache.find(item => `${item.tipo}-${item.id}` === cacheId);
  const modalEl = document.getElementById('detallePublicacionModal');
  if (!pub || !modalEl) return;

  const badgeClass = pub.tipo === 'perdido' ? 'bg-danger' : 'bg-success';
  const badgeLabel = pub.tipo === 'perdido' ? 'Objeto perdido' : 'Objeto encontrado';

  document.getElementById('detallePublicacionTitulo').textContent    = pub.titulo || 'Publicacion';
  document.getElementById('detallePublicacionBadge').className       = `badge ${badgeClass}`;
  document.getElementById('detallePublicacionBadge').textContent     = badgeLabel;
  document.getElementById('detallePublicacionCategoria').textContent = pub.categoria || 'Sin categoria';
  document.getElementById('detallePublicacionLugar').textContent     = pub.lugar || 'Sin ubicacion';
  document.getElementById('detallePublicacionFecha').textContent     = formatDate(pub.fecha);
  document.getElementById('detallePublicacionDescripcion').textContent = pub.descripcion || 'Sin descripcion disponible.';

  // Mostrar celular como enlace tel:
  const contactoEl = document.getElementById('detallePublicacionContacto');
  if (pub.contacto && pub.contacto !== 'No disponible') {
    contactoEl.innerHTML = `
      <a href="tel:${pub.contacto}" class="text-decoration-none">
        <i class="bi bi-telephone-fill me-1 text-success"></i>${pub.contacto}
      </a>`;
  } else {
    contactoEl.textContent = 'Contacto no disponible';
  }

  // Renderizar carousel de fotos usando DocumentFragment
  const carouselInner = document.getElementById('detallePublicacionFotos');
  const indicators    = document.getElementById('detallePublicacionIndicadores');
  const carousel      = document.getElementById('detallePublicacionCarousel');
  const controls      = modalEl.querySelectorAll('.detalle-carousel-control');
  
  const fragmentImages = document.createDocumentFragment();
  const fragmentIndicators = document.createDocumentFragment();
  
  pub.imagenes.forEach((url, index) => {
    const active = index === 0 ? 'active' : '';
    const itemDiv = document.createElement('div');
    itemDiv.className = `carousel-item ${active}`;
    itemDiv.innerHTML = `
      <img src="${escapeHTML(url)}" class="detalle-publicacion-img"
        alt="Foto ${index + 1} de ${escapeHTML(pub.titulo)}"
        onerror="this.src='imagenes/logo.png'">
    `;
    fragmentImages.appendChild(itemDiv);
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = active;
    btn.setAttribute('data-bs-target', '#detallePublicacionCarousel');
    btn.setAttribute('data-bs-slide-to', index);
    btn.setAttribute('aria-current', index === 0 ? 'true' : 'false');
    btn.setAttribute('aria-label', `Foto ${index + 1}`);
    fragmentIndicators.appendChild(btn);
  });
  
  carouselInner.innerHTML = '';
  indicators.innerHTML = '';
  carouselInner.appendChild(fragmentImages);
  indicators.appendChild(fragmentIndicators);

  const mostrarControles = pub.imagenes.length > 1;
  indicators.style.display = mostrarControles ? 'flex' : 'none';
  controls.forEach(control => control.style.display = mostrarControles ? 'flex' : 'none');
  
  bootstrap.Carousel.getOrCreateInstance(carousel).to(0);
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

/* ================================================================
   🔹 NAVBAR - MARCAR OPCIÓN ACTIVA
   ================================================================ */
function initNavbarActive() {
  const navLinks = document.querySelectorAll('.btm-navbar .nav .nav-link');
  
  const updateActiveLink = (clickedLink) => {
    navLinks.forEach(link => link.classList.remove('active'));
    clickedLink.classList.add('active');
  };
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      updateActiveLink(this);
    });
  });
  
  if (navLinks[0] && filtroActivo === 'todos') {
    navLinks[0].classList.add('active');
  }
}

/* ================================================================
   🔹 FILTRO DESDE NAVBAR
   ================================================================ */
function initFiltrosMenu() {
  const navLinks = document.querySelectorAll('.btm-navbar .nav .nav-link');
  
  if (navLinks[0]) {
    navLinks[0].addEventListener('click', (e) => {
      e.preventDefault();
      filtroActivo = 'todos';
      renderPublicaciones();
    });
  }
  
  if (navLinks[1]) {
    navLinks[1].addEventListener('click', (e) => {
      e.preventDefault();
      filtroActivo = 'encontrado';
      renderPublicaciones();
    });
  }
  
  if (navLinks[2]) {
    navLinks[2].addEventListener('click', (e) => {
      e.preventDefault();
      filtroActivo = 'perdido';
      renderPublicaciones();
    });
  }
}

/* ================================================================
   🔹 AUTENTICACIÓN - CONTROL DEL BOTÓN DEL MENÚ
   ================================================================ */
function initAuthUI() {
  const user          = getCurrentUser();
  const btnOpenMenu   = document.getElementById('btnOpenMenu');
  const userEmailSpan = document.querySelector('#menuLateral .offcanvas-body .mb-4 strong');
  const btnLogin      = document.querySelector('.btn-outline-secondary');
  const btnRegister   = document.querySelector('.btn-primary');
  const adminLink     = document.querySelector('a[href="admin.html"]');
  
  console.log('🔐 Verificando sesión:', user ? `Usuario: ${user.email}, Rol: ${user.rol}` : 'No hay sesión');
  
  if (user && user.email) {
    if (btnOpenMenu) {
      btnOpenMenu.style.display = 'block';
      btnOpenMenu.style.visibility = 'visible';
    }
    if (btnLogin)      btnLogin.style.display    = 'none';
    if (btnRegister)   btnRegister.style.display = 'none';
    if (userEmailSpan) userEmailSpan.textContent = user.email;
    
    if (adminLink) {
      adminLink.style.display = user.rol === 'admin' ? 'flex' : 'none';
    }
  } else {
    if (btnOpenMenu) {
      btnOpenMenu.style.display    = 'none';
      btnOpenMenu.style.visibility = 'hidden';
    }
    if (btnLogin)    btnLogin.style.display    = 'inline-block';
    if (btnRegister) btnRegister.style.display = 'inline-block';
    if (adminLink)   adminLink.style.display   = 'none';
  }
  
  if (btnOpenMenu) {
    const menuLateral = document.getElementById('menuLateral');
    if (menuLateral) {
      const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(menuLateral);
      btnOpenMenu.addEventListener('click', (e) => {
        e.preventDefault();
        offcanvas.show();
      });
    }
  }
  
  updateButtonAuthStatus();
}

/* ================================================================
   🔹 BOTONES LOGIN / REGISTER
   ================================================================ */
function initAuthButtons() {
  const btnLogin    = document.querySelector('.btn-outline-secondary');
  const btnRegister = document.querySelector('.btn-primary');

  btnLogin?.addEventListener('click',    () => { window.location.href = 'login.html';    });
  btnRegister?.addEventListener('click', () => { window.location.href = 'registro.html'; });
}

/* ================================================================
   🔹 LOGOUT
   ================================================================ */
function initLogout() {
  const btn = document.getElementById('btnLogout');
  btn?.addEventListener('click', () => {
    clearUser();
    window.location.reload();
  });
}

/* ================================================================
   🔹 ACTUALIZAR ESTADO DE BOTONES (PUBLICAR Y REPORTAR)
   ================================================================ */
function updateButtonAuthStatus() {
  const user = getCurrentUser();
  
  const btnPublicarHero  = document.getElementById('btnPublicarHero');
  const btnReportarHero  = document.getElementById('btnReportarHero');
  const btnPublicarMenu  = document.getElementById('btnPublicarMenu');
  const btnReportarMenu  = document.getElementById('btnReportarMenu');
  
  if (user && user.email) {
    if (btnPublicarHero) btnPublicarHero.disabled = false;
    if (btnReportarHero) btnReportarHero.disabled = false;
    
    [btnPublicarMenu, btnReportarMenu].forEach(btn => {
      if (!btn) return;
      btn.style.pointerEvents = 'auto';
      btn.style.opacity       = '1';
      btn.style.cursor        = 'pointer';
      btn.removeAttribute('disabled');
    });
  } else {
    if (btnPublicarHero) btnPublicarHero.disabled = true;
    if (btnReportarHero) btnReportarHero.disabled = true;
    
    [btnPublicarMenu, btnReportarMenu].forEach(btn => {
      if (!btn) return;
      btn.style.pointerEvents = 'none';
      btn.style.opacity       = '0.5';
      btn.style.cursor        = 'not-allowed';
      btn.setAttribute('disabled', 'true');
    });
  }
}