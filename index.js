/* ================================================================
   INDEX.JS – BackToMe (VERSIÓN FINAL CORREGIDA)
   ================================================================ */

/* ----------------------------------------------------------------
   DATOS DE EJEMPLO
   ---------------------------------------------------------------- */
let publicacionesRecientes = [
  {
    id: 1,
    titulo: 'iPhone 14 Pro Max gris espacial',
    tipo: 'perdido',
    lugar: 'Centro',
    fecha: 'hace 2h',
    imagen: 'imagenes/objeto1.jpg',
    recompensa: '50000',
  },
  {
    id: 2,
    titulo: 'Cartera de cuero negra',
    tipo: 'encontrado',
    lugar: 'Parque Principal',
    fecha: 'hace 5h',
    imagen: 'imagenes/objeto2.jpg',
    recompensa: null,
  },
  {
    id: 3,
    titulo: 'Llaves con llavero de peluche',
    tipo: 'perdido',
    lugar: 'Terminal de Transportes',
    fecha: 'hace 1 día',
    imagen: 'imagenes/objeto3.jpg',
    recompensa: '20000',
  }
];

/* ----------------------------------------------------------------
   ESTADO GLOBAL
   ---------------------------------------------------------------- */
let filtroActivo = 'todos';

/* ----------------------------------------------------------------
   INIT
   ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 BackToMe Iniciado');
  
  renderPublicaciones();
  initDropzone();
  initFiltrosMenu();
  initFiltrosModal();
  initAuthUI();        
  initLogout();
  initAuthButtons();
  initSearchModal();   
  initPublicarForm();  
  initNavbarActive();  
});

/* ================================================================
   🔹 RENDER PUBLICACIONES
   ================================================================ */
function renderPublicaciones() {
  const container = document.getElementById('publicacionesRecientes');
  if (!container) return;

  container.innerHTML = '';

  let data = publicacionesRecientes;

  if (filtroActivo === 'perdido') {
    data = data.filter(p => p.tipo === 'perdido');
  } else if (filtroActivo === 'encontrado') {
    data = data.filter(p => p.tipo === 'encontrado');
  }

  const fragment = document.createDocumentFragment();

  data.slice(0, 6).forEach(pub => {
    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6';
    col.innerHTML = buildCardHTML(pub);
    fragment.appendChild(col);
  });

  container.appendChild(fragment);
}

function buildCardHTML(pub) {
  const badgeClass = pub.tipo === 'perdido' ? 'bg-danger' : 'bg-success';
  const badgeLabel = pub.tipo === 'perdido' ? 'Perdido' : 'Encontrado';

  return `
    <div class="card h-100 shadow-sm hover-card">
      <img src="${pub.imagen}" class="card-img-top"
        style="height:200px;object-fit:cover;" 
        onerror="this.src='imagenes/logo.png'">
      <div class="card-body">
        <div class="d-flex justify-content-between mb-2">
          <h6>${pub.titulo}</h6>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
        </div>
        <small class="text-muted">📍 ${pub.lugar}</small><br>
        <small class="text-muted">🕒 ${pub.fecha}</small>
        ${pub.recompensa ? `<small class="text-success mt-1 d-block">💰 $${parseInt(pub.recompensa).toLocaleString()}</small>` : ''}
      </div>
    </div>
  `;
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
   🔹 DROPZONE
   ================================================================ */
function initDropzone() {
  const dropzone = document.getElementById('dropzone');
  const inputFotos = document.getElementById('inputFotos');
  const preview = document.getElementById('previewFotos');

  if (!dropzone) return;

  dropzone.addEventListener('click', () => inputFotos.click());

  inputFotos.addEventListener('change', () => {
    renderPreview(inputFotos.files, preview);
  });
}

function renderPreview(files, container) {
  container.innerHTML = '';
  const MAX = 5;

  Array.from(files).slice(0, MAX).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const div = document.createElement('div');
      div.className = 'col-4';
      div.innerHTML = `<img src="${e.target.result}" class="img-fluid rounded" style="height:80px;object-fit:cover;">`;
      container.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

/* ================================================================
   🔹 FILTROS MODAL
   ================================================================ */
function initFiltrosModal() {
  const btnLimpiar = document.getElementById('btnLimpiarFiltros');
  const btnAplicar = document.getElementById('btnAplicarFiltros');

  btnLimpiar?.addEventListener('click', () => {
    document.querySelectorAll('#searchModal select, #searchModal input')
      .forEach(el => el.value = '');
    document.getElementById('searchInput').value = '';
    realizarBusqueda();
  });

  btnAplicar?.addEventListener('click', () => {
    realizarBusqueda();
  });
}

/* ================================================================
   🔥 BÚSQUEDA DE OBJETOS - CORREGIDA
   ================================================================ */
function initSearchModal() {
  console.log('🔍 Inicializando búsqueda...');
  
  const searchInput = document.getElementById('searchInput');
  const btnBuscar = document.querySelector('#searchModal .btn-pastel-primary');
  const ordenSelect = document.querySelector('#searchModal select[aria-label="Ordenar resultados"]');
  
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      realizarBusqueda();
    });
  }
  
  if (btnBuscar) {
    btnBuscar.addEventListener('click', () => {
      realizarBusqueda();
    });
  }
  
  if (ordenSelect) {
    ordenSelect.addEventListener('change', () => {
      realizarBusqueda();
    });
  }
  
  realizarBusqueda();
}

function realizarBusqueda() {
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const tipoFiltro = document.getElementById('filtroTipo')?.value || '';
  const categoriaFiltro = document.getElementById('filtroCategoria')?.value || '';
  const zonaFiltro = document.getElementById('filtroZona')?.value || '';
  const ordenSelect = document.querySelector('#searchModal select[aria-label="Ordenar resultados"]');
  const orden = ordenSelect?.value || '';
  
  let resultados = publicacionesRecientes.filter(pub => {
    const matchTexto = searchTerm === '' || 
      pub.titulo.toLowerCase().includes(searchTerm) ||
      pub.lugar.toLowerCase().includes(searchTerm);
    
    const matchTipo = !tipoFiltro || pub.tipo === tipoFiltro;
    const matchZona = !zonaFiltro || pub.lugar.toLowerCase().includes(zonaFiltro.toLowerCase());
    
    return matchTexto && matchTipo && matchZona;
  });
  
  if (orden === 'Recompensa alta') {
    resultados.sort((a, b) => (parseInt(b.recompensa) || 0) - (parseInt(a.recompensa) || 0));
  }
  
  mostrarResultadosBusqueda(resultados);
}

function mostrarResultadosBusqueda(resultados) {
  const container = document.querySelector('#searchModal .resultados');
  const countSpan = document.getElementById('resultadosCount');
  
  if (!container) return;
  
  if (countSpan) countSpan.textContent = resultados.length;
  
  if (resultados.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info text-center">
        <i class="bi bi-info-circle"></i> No se encontraron resultados
      </div>
    `;
    return;
  }
  
  container.innerHTML = resultados.map(pub => {
    const badgeClass = pub.tipo === 'perdido' ? 'bg-danger' : 'bg-success';
    const badgeLabel = pub.tipo === 'perdido' ? 'Perdido' : 'Encontrado';
    
    return `
      <div class="resultado-item p-3 border rounded-3 bg-white shadow-sm mb-3">
        <div class="d-flex align-items-center">
          <img
            src="${pub.imagen}"
            alt="${pub.titulo}"
            class="rounded-2 me-3 flex-shrink-0"
            style="width:60px;height:60px;object-fit:cover;"
            onerror="this.src='imagenes/logo.png'">
          <div class="flex-grow-1">
            <h6 class="mb-1">${pub.titulo}</h6>
            <span class="badge ${badgeClass}">${badgeLabel}</span>
            <p class="small text-muted mb-1">📍 ${pub.lugar} · 🕒 ${pub.fecha}</p>
            ${pub.recompensa ? `<small class="text-success">💰 $${parseInt(pub.recompensa).toLocaleString()}</small>` : ''}
          </div>
          <a href="#" class="btn btn-sm btn-outline-primary ms-2">Ver</a>
        </div>
      </div>
    `;
  }).join('');
}

/* ================================================================
   🔥 PUBLICAR OBJETO
   ================================================================ */
function initPublicarForm() {
  const form = document.getElementById('publicarForm');
  const btnPublicar = document.querySelector('#publicarModal button[type="submit"]');
  
  if (!form) return;
  
  btnPublicar?.addEventListener('click', (e) => {
    e.preventDefault();
    
    const user = JSON.parse(localStorage.getItem('userLogged'));
    if (!user) {
      alert('⚠️ Debes iniciar sesión para publicar un objeto');
      window.location.href = 'login.html';
      return;
    }
    
    const tipo = document.querySelector('input[name="tipo"]:checked')?.value;
    const titulo = document.getElementById('pubTitulo')?.value;
    const descripcion = document.getElementById('descripcion')?.value;
    const lugar = document.getElementById('lugar')?.value;
    const recompensa = document.getElementById('recompensa')?.value;
    
    if (!titulo || !descripcion || !lugar) {
      alert('⚠️ Completa: Título, Descripción y Lugar');
      return;
    }
    
    const nuevaPublicacion = {
      id: publicacionesRecientes.length + 1,
      titulo: titulo,
      tipo: tipo || 'perdido',
      lugar: lugar,
      fecha: 'hace unos segundos',
      imagen: 'imagenes/logo.png',
      recompensa: recompensa || null,
      usuario: user.email
    };
    
    publicacionesRecientes.unshift(nuevaPublicacion);
    form.reset();
    document.getElementById('previewFotos').innerHTML = '';
    
    // Cerrar modal de forma segura
    const modalElement = document.getElementById('publicarModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }
    // Forzar limpieza del backdrop si queda pegado
    setTimeout(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
    }, 300);
    
    renderPublicaciones();
    alert('✅ ¡Publicación creada con éxito!');
  });
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