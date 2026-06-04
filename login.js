/* ================================================================
   LOGIN.JS  –  BackToMe · Lógica de autenticación
   CONEXIÓN:  Supabase - Tabla usuario
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

  if (!toggleBtn || !passwordInput || !passIcon) return;

  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
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

/* ================================================================
   HANDLER PRINCIPAL DE LOGIN
   ================================================================ */
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
    const user = await checkUser(email, password);

    if (user) {
      /* Guardar sesión usando función compartida */
      saveUser({
        email: user.email,
        name: user.name,
        cedula: user.cedula,
        rol: user.rol,
        celular: user.celular,
        logged: true,
      });

      // Redirigir al inicio
      window.location.href = 'index.html';
    } else {
      showError('Correo o contraseña incorrectos');
    }

  } catch (err) {
    console.error('Error en login:', err);
    showError(err.message || 'Ocurrió un error. Intenta de nuevo.');

  } finally {
    setLoading(false, btn, btnText, btnLoader);
  }
}

/* ================================================================
   CHECK USER - Autenticación con Supabase
   ================================================================ */
async function checkUser(email, password) {
  try {
    const { data: user, error } = await supabaseClient
      .from('usuario')
      .select('*')
      .eq('correo', email)
      .single();

    if (error || !user) return null;

    if (user.contrasena !== password) return null;

    return {
      email: user.correo,
      name: user.nombre,
      cedula: user.cedula,
      rol: user.rol,
      celular: user.celular
    };

  } catch (err) {
    console.error('Error en checkUser:', err);
    return null;
  }
}
