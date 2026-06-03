/* ================================================================
   INDEX.JS – BackToMe (VERSIÓN FINAL CORREGIDA)
   ================================================================ */

// Configuración de Supabase
if (!window.supabaseClient) {
  var supabaseUrl = 'https://nspadsjyeeakerarojsm.supabase.co';
  var supabaseKey = 'sb_publishable_hW1N-mn5qgGRrt4DXgz1Zg_eqS2N4Th'; 
  window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
}
var supabaseClient = window.supabaseClient;

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

    // 1. Cargar "Encontrados" (tabla publicaciones)
    if (filtroActivo === 'todos' || filtroActivo === 'encontrado') {
      const { data, error } = await supabaseClient
        .from('publicaciones')
        .select('*, imagenes_publicaciones(url)')
        .order('fecha_creacion', { ascending: false });
      
      if (error) throw error;
      rawData = [...rawData, ...(data || []).map(p => ({
        id: p.id,
        titulo: p.titulo,
        tipo: 'encontrado',
        lugar: p.ubicacion,
        fecha: p.fecha_encontrado,
        fecha_iso: p.fecha_creacion,
        fecha_creacion: p.fecha_creacion,
        categoria: p.categoria,
        descripcion: p.descripcion,
        contacto: p.contacto || p.telefono || p.email || '',
        imagenes: normalizarImagenes(p.imagenes_publicaciones)
      }))];
    }

    // 2. Cargar "Perdidos" (tabla reportes)
    if (filtroActivo === 'todos' || filtroActivo === 'perdido') {
      const { data, error } = await supabaseClient
        .from('reportes')
        .select('*, imagenes_reportes(url)')
        .order('fecha_creacion', { ascending: false });
      
      if (error) throw error;
      rawData = [...rawData, ...(data || []).map(r => ({
        id: r.id,
        titulo: r.titulo || `Objeto Perdido: ${r.categoria}`,
        tipo: 'perdido',
        categoria: r.categoria,
        descripcion: r.descripcion,
        lugar: r.sector,
        fecha: r.fecha_perdida,
        fecha_iso: r.fecha_creacion,
        fecha_creacion: r.fecha_creacion,
        contacto: r.contacto || r.telefono || r.email || '',
        imagenes: normalizarImagenes(r.imagenes_reportes)
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

function normalizarImagenes(imagenes) {
  const urls = (imagenes || [])
    .map(img => img?.url)
    .filter(Boolean);
  return urls.length ? urls : ['imagenes/logo.png'];
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

  document.getElementById('detallePublicacionTitulo').textContent = pub.titulo || 'Publicacion';
  document.getElementById('detallePublicacionBadge').className = `badge ${badgeClass}`;
  document.getElementById('detallePublicacionBadge').textContent = badgeLabel;
  document.getElementById('detallePublicacionCategoria').textContent = pub.categoria || 'Sin categoria';
  document.getElementById('detallePublicacionLugar').textContent = pub.lugar || 'Sin ubicacion';
  document.getElementById('detallePublicacionFecha').textContent = formatDate(pub.fecha);
  document.getElementById('detallePublicacionDescripcion').textContent = pub.descripcion || 'Sin descripcion disponible.';
  document.getElementById('detallePublicacionContacto').textContent = pub.contacto || 'Contacta al publicador desde la plataforma.';

  const carouselInner = document.getElementById('detallePublicacionFotos');
  const indicators = document.getElementById('detallePublicacionIndicadores');
  const carousel = document.getElementById('detallePublicacionCarousel');
  const controls = modalEl.querySelectorAll('.detalle-carousel-control');
  carouselInner.innerHTML = '';
  indicators.innerHTML = '';

  pub.imagenes.forEach((url, index) => {
    const active = index === 0 ? 'active' : '';
    carouselInner.innerHTML += `
      <div class="carousel-item ${active}">
        <img src="${escapeHTML(url)}" class="detalle-publicacion-img"
          alt="Foto ${index + 1} de ${escapeHTML(pub.titulo)}"
          onerror="this.src='imagenes/logo.png'">
      </div>
    `;
    indicators.innerHTML += `
      <button type="button" data-bs-target="#detallePublicacionCarousel"
        data-bs-slide-to="${index}" class="${active}" aria-current="${index === 0 ? 'true' : 'false'}"
        aria-label="Foto ${index + 1}"></button>
    `;
  });

  const mostrarControles = pub.imagenes.length > 1;
  indicators.style.display = mostrarControles ? 'flex' : 'none';
  controls.forEach(control => control.style.display = mostrarControles ? 'flex' : 'none');
  bootstrap.Carousel.getOrCreateInstance(carousel).to(0);
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function formatDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
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
  
  // Marcar Inicio como activo por defecto
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
   🔹 AUTENTICACIÓN - 🔥 CONTROL DEL BOTÓN DEL MENÚ 🔥
   ================================================================ */
function initAuthUI() {
  const user = JSON.parse(localStorage.getItem('userLogged'));
  const btnOpenMenu = document.getElementById('btnOpenMenu');
  const userEmailSpan = document.querySelector('#menuLateral .offcanvas-body .mb-4 strong');
  const btnLogin = document.querySelector('.btn-outline-secondary');
  const btnRegister = document.querySelector('.btn-primary');
  const adminLink = document.querySelector('a[href="admin.html"]');
  
  console.log('🔐 Verificando sesión:', user ? `Usuario: ${user.email}, Rol: ${user.rol}` : 'No hay sesión');
  
  if (user && user.email) {
    // ✅ USUARIO LOGUEADO
    if (btnOpenMenu) {
      btnOpenMenu.style.display = 'block';
      btnOpenMenu.style.visibility = 'visible';
      console.log('✅ Botón menú: VISIBLE');
    }
    if (btnLogin) btnLogin.style.display = 'none';
    if (btnRegister) btnRegister.style.display = 'none';
    if (userEmailSpan) userEmailSpan.textContent = user.email;
    
    // 🔒 Ocultar Panel Admin si no es administrador
    if (adminLink) {
      if (user.rol === 'admin') {
        adminLink.style.display = 'flex';
        console.log('✅ Panel Admin: VISIBLE (usuario admin)');
      } else {
        adminLink.style.display = 'none';
        console.log('❌ Panel Admin: OCULTO (usuario no admin)');
      }
    }
  } else {
    // ❌ NO LOGUEADO
    if (btnOpenMenu) {
      btnOpenMenu.style.display = 'none';
      btnOpenMenu.style.visibility = 'hidden';
      console.log('❌ Botón menú: OCULTO');
    }
    if (btnLogin) btnLogin.style.display = 'inline-block';
    if (btnRegister) btnRegister.style.display = 'inline-block';
    if (adminLink) adminLink.style.display = 'none';
  }
  
  // Inicializar offcanvas de forma segura
  if (btnOpenMenu) {
    const menuLateral = document.getElementById('menuLateral');
    if (menuLateral) {
      // Usar getOrCreateInstance para evitar duplicar instancias
      const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(menuLateral);
      btnOpenMenu.addEventListener('click', (e) => {
        e.preventDefault();
        offcanvas.show();
      });
    }
  }
  
  // 🔐 Actualizar estado de botones de publicar y reportar
  updateButtonAuthStatus();
}

/* ================================================================
   🔹 BOTONES LOGIN / REGISTER
   ================================================================ */
function initAuthButtons() {
  const btnLogin = document.querySelector('.btn-outline-secondary');
  const btnRegister = document.querySelector('.btn-primary');

  btnLogin?.addEventListener('click', () => {
    window.location.href = 'login.html';
  });

  btnRegister?.addEventListener('click', () => {
    window.location.href = 'registro.html';
  });
}

/* ================================================================
   🔹 LOGOUT
   ================================================================ */
function initLogout() {
  const btn = document.getElementById('btnLogout');

  btn?.addEventListener('click', () => {
    localStorage.removeItem('userLogged');
    window.location.reload();
  });
}

/* ================================================================
   🔹 ACTUALIZAR ESTADO DE BOTONES (PUBLICAR Y REPORTAR)
   ================================================================ */
function updateButtonAuthStatus() {
  const user = JSON.parse(localStorage.getItem('userLogged'));
  
  // Botones en el hero
  const btnPublicarHero = document.getElementById('btnPublicarHero');
  const btnReportarHero = document.getElementById('btnReportarHero');
  
  // Botones en el menú lateral
  const btnPublicarMenu = document.getElementById('btnPublicarMenu');
  const btnReportarMenu = document.getElementById('btnReportarMenu');
  
  if (user && user.email) {
    // ✅ USUARIO LOGUEADO - HABILITAR BOTONES
    if (btnPublicarHero) btnPublicarHero.disabled = false;
    if (btnReportarHero) btnReportarHero.disabled = false;
    
    if (btnPublicarMenu) {
      btnPublicarMenu.style.pointerEvents = 'auto';
      btnPublicarMenu.style.opacity = '1';
      btnPublicarMenu.style.cursor = 'pointer';
      btnPublicarMenu.removeAttribute('disabled');
    }
    
    if (btnReportarMenu) {
      btnReportarMenu.style.pointerEvents = 'auto';
      btnReportarMenu.style.opacity = '1';
      btnReportarMenu.style.cursor = 'pointer';
      btnReportarMenu.removeAttribute('disabled');
    }
    
    console.log('✅ Botones de publicar y reportar: HABILITADOS');
  } else {
    // ❌ NO LOGUEADO - DESHABILITAR BOTONES
    if (btnPublicarHero) btnPublicarHero.disabled = true;
    if (btnReportarHero) btnReportarHero.disabled = true;
    
    if (btnPublicarMenu) {
      btnPublicarMenu.style.pointerEvents = 'none';
      btnPublicarMenu.style.opacity = '0.5';
      btnPublicarMenu.style.cursor = 'not-allowed';
      btnPublicarMenu.setAttribute('disabled', 'true');
    }
    
    if (btnReportarMenu) {
      btnReportarMenu.style.pointerEvents = 'none';
      btnReportarMenu.style.opacity = '0.5';
      btnReportarMenu.style.cursor = 'not-allowed';
      btnReportarMenu.setAttribute('disabled', 'true');
    }
    
    console.log('❌ Botones de publicar y reportar: DESHABILITADOS');
  }
}
