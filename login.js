/* ================================================================
   LOGIN.JS  –  BackToMe · Lógica de autenticación
   ================================================================ */

/* ----------------------------------------------------------------
   INICIALIZACIÓN
   ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initTogglePassword();
  initLoginForm();
});

/* ----------------------------------------------------------------
   TOGGLE CONTRASEÑA
   ---------------------------------------------------------------- */
function initTogglePassword() {
  const toggleBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const passIcon = document.getElementById('passIcon');

  if (!toggleBtn || !passwordInput || !passIcon) return;

  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    passIcon.classList.toggle('bi-eye', !isPassword);
    passIcon.classList.toggle('bi-eye-slash', isPassword);
  });
}

/* ----------------------------------------------------------------
   FORMULARIO DE LOGIN
   ---------------------------------------------------------------- */
function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', handleLogin);
}

/* ----------------------------------------------------------------
   HANDLER PRINCIPAL DE LOGIN
   ---------------------------------------------------------------- */
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showError('Completa todos los campos');
    return;
  }

  if (!isValidEmail(email)) {
    showError('Ingresa un correo electrónico válido');
    return;
  }

  const btn = document.querySelector('.btn-login');
  const btnText = document.querySelector('.btn-text');
  const btnLoader = document.querySelector('.btn-loader');

  setLoading(true, btn, btnText, btnLoader);

  try {
    const response = await fetch('api/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Correo o contraseña incorrectos');
    }

    window.location.href = 'index.html';
  } catch (err) {
    console.error('Error en login:', err);
    showError(err.message || 'Ocurrió un error. Intenta de nuevo.');
  } finally {
    setLoading(false, btn, btnText, btnLoader);
  }
}

/* ----------------------------------------------------------------
   UTILIDADES
   ---------------------------------------------------------------- */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');

  if (!errorDiv || !errorText) return;

  errorText.textContent = message;
  errorDiv.classList.remove('d-none');

  clearTimeout(showError._timer);
  showError._timer = setTimeout(() => errorDiv.classList.add('d-none'), 5000);
}

function setLoading(loading, btn, btnText, btnLoader) {
  if (btn) btn.disabled = loading;
  if (btnText) btnText.classList.toggle('d-none', loading);
  if (btnLoader) btnLoader.classList.toggle('d-none', !loading);
}
