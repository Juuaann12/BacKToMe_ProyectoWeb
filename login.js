/* ================================================================
   LOGIN.JS  –  BackToMe · Lógica de autenticación
   
   FLUJO ACTUAL  →  validación local con usuarios de prueba.
   FLUJO FUTURO  →  reemplazar checkUser() por llamada a Supabase Auth.
   ================================================================ */

/* ----------------------------------------------------------------
   INICIALIZACIÓN
   Espera a que el DOM esté listo antes de registrar eventos.
   ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initTogglePassword();
  initLoginForm();
});

/* ----------------------------------------------------------------
   TOGGLE CONTRASEÑA
   Alterna el tipo del input entre "password" y "text",
   y actualiza el ícono correspondiente.
   ---------------------------------------------------------------- */
function initTogglePassword() {
  const toggleBtn   = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const passIcon    = document.getElementById('passIcon');

  if (!toggleBtn || !passwordInput || !passIcon) return; // Guardia defensiva

  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    // Intercambia el ícono ojo abierto ↔ ojo cerrado
    passIcon.classList.toggle('bi-eye',       !isPassword);
    passIcon.classList.toggle('bi-eye-slash',  isPassword);
  });
}

/* ----------------------------------------------------------------
   FORMULARIO DE LOGIN
   Escucha el submit y delega en handleLogin().
   ---------------------------------------------------------------- */
function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', handleLogin);
}

/* ----------------------------------------------------------------
   HANDLER PRINCIPAL DE LOGIN
   1. Previene recarga de página.
   2. Recoge y valida datos del formulario.
   3. Muestra estado de carga.
   4. Llama al servicio de autenticación.
   5. Redirige o muestra error según resultado.
   ---------------------------------------------------------------- */
async function handleLogin(e) {
  e.preventDefault();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  /* --- Validaciones del lado del cliente --- */
  if (!email || !password) {
    showError('Completa todos los campos');
    return;
  }

  if (!isValidEmail(email)) {
    showError('Ingresa un correo electrónico válido');
    return;
  }

  /* --- Referencias al botón (para manejo del estado de carga) --- */
  const btn       = document.querySelector('.btn-login');
  const btnText   = document.querySelector('.btn-text');
  const btnLoader = document.querySelector('.btn-loader');

  setLoading(true, btn, btnText, btnLoader);

  try {
    /* ============================================================
       AUTENTICACIÓN
       ─────────────────────────────────────────────────────────────
       ACTUAL:  checkUser() → busca en objeto local (solo pruebas).
       SUPABASE: descomentar el bloque de abajo y eliminar checkUser.

       ── Con Supabase ──────────────────────────────────────────────
       import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

       const supabase = createClient(
         'https://TU_PROJECT_ID.supabase.co',
         'TU_ANON_PUBLIC_KEY'
       );

       const { data, error } = await supabase.auth.signInWithPassword({ email, password });
       if (error) throw new Error(error.message);
       const user = data.user;
       ─────────────────────────────────────────────────────────────
    ============================================================ */
    const user = await checkUser(email, password); // ← Reemplazar con Supabase

    if (user) {
      /* Guardar sesión mínima en localStorage.
         Con Supabase este paso es automático (maneja tokens internamente). */
      localStorage.setItem('userLogged', JSON.stringify({
        email: user.email,
        name:  user.name,
        logged: true,
      }));

      // Redirigir al inicio
      window.location.href = 'index.html';
    } else {
      showError('Correo o contraseña incorrectos');
    }

  } catch (err) {
    /* Captura errores de red o de Supabase */
    console.error('Error en login:', err);
    showError(err.message || 'Ocurrió un error. Intenta de nuevo.');

  } finally {
    /* Siempre restaurar el botón, aunque haya error */
    setLoading(false, btn, btnText, btnLoader);
  }
}

/* ----------------------------------------------------------------
   CHECK USER (TEMPORAL – solo para desarrollo / pruebas)
   
   ⚠️  ELIMINAR cuando se integre Supabase.
      Esta función simula una autenticación asíncrona con un delay
      para imitar el comportamiento real de una petición a la API.
   ---------------------------------------------------------------- */
function checkUser(email, password) {
  /* Usuarios de prueba hardcodeados */
  const MOCK_USERS = {
    'kevin@gmail.com':      { password: '123456', name: 'Kevin' },
    'maria@gmail.com':      { password: '123456', name: 'María' },
    'demo@backtome.com':    { password: 'demo123', name: 'Demo User' },
  };

  /* Simula latencia de red (1.2 s) */
  return new Promise((resolve) => {
    setTimeout(() => {
      const found = MOCK_USERS[email];
      resolve(found && found.password === password ? { email, name: found.name } : null);
    }, 1200);
  });
}

/* ----------------------------------------------------------------
   UTILIDADES
   ---------------------------------------------------------------- */

/**
 * Valida formato básico de correo electrónico.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Muestra u oculta el mensaje de error en pantalla.
 * Se oculta automáticamente después de 5 segundos.
 * @param {string} message - Texto a mostrar al usuario.
 */
function showError(message) {
  const errorDiv  = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');

  if (!errorDiv || !errorText) return;

  errorText.textContent = message;
  errorDiv.classList.remove('d-none');

  /* Auto-cierre después de 5 s */
  clearTimeout(showError._timer); // Cancela timer previo si existía
  showError._timer = setTimeout(() => errorDiv.classList.add('d-none'), 5000);
}

/**
 * Activa o desactiva el estado de carga del botón de login.
 * @param {boolean}     loading  - true → muestra spinner; false → muestra texto.
 * @param {HTMLElement} btn      - Botón submit.
 * @param {HTMLElement} btnText  - Elemento con el texto del botón.
 * @param {HTMLElement} btnLoader - Elemento con el spinner.
 */
function setLoading(loading, btn, btnText, btnLoader) {
  btn.disabled = loading;
  btnText.classList.toggle('d-none',  loading);
  btnLoader.classList.toggle('d-none', !loading);
}
