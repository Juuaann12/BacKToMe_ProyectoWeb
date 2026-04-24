/* ================================================================
   REGISTER.JS  –  BackToMe · Lógica de registro de usuarios

   FLUJO ACTUAL  →  validación local + localStorage (solo pruebas).
   FLUJO FUTURO  →  reemplazar registerUser() por Supabase Auth.
   ================================================================ */

/* ----------------------------------------------------------------
   INICIALIZACIÓN
   Espera a que el DOM esté listo antes de registrar eventos.
   ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initTogglePassword();
  initConfirmPasswordValidation();
  initCedulaValidation();  // ⭐ NUEVO: Validación en tiempo real de cédula
  initRegisterForm();
});

/* ----------------------------------------------------------------
   TOGGLE CONTRASEÑA
   Alterna el tipo del input entre "password" y "text",
   y actualiza el ícono correspondiente.
   ---------------------------------------------------------------- */
function initTogglePassword() {
  const toggleBtn     = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const passIcon      = document.getElementById('passIcon');

  if (!toggleBtn || !passwordInput || !passIcon) return;

  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    passIcon.classList.toggle('bi-eye',       !isPassword);
    passIcon.classList.toggle('bi-eye-slash',  isPassword);
  });
}

/* ----------------------------------------------------------------
   VALIDACIÓN EN TIEMPO REAL – Confirmar contraseña
   Marca el campo como inválido mientras las contraseñas no coincidan.
   ---------------------------------------------------------------- */
function initConfirmPasswordValidation() {
  const confirmInput = document.getElementById('confirmPassword');
  if (!confirmInput) return;

  confirmInput.addEventListener('input', validateConfirmPassword);
}

function validateConfirmPassword() {
  const password        = document.getElementById('password').value;
  const confirmInput    = document.getElementById('confirmPassword');
  const confirmPassword = confirmInput.value;

  const mismatch = confirmPassword && password !== confirmPassword;

  /* setCustomValidity vacío = válido; con texto = inválido */
  confirmInput.setCustomValidity(mismatch ? 'Las contraseñas no coinciden' : '');
  confirmInput.classList.toggle('is-invalid', mismatch);
}

/* ----------------------------------------------------------------
   ⭐ NUEVA VALIDACIÓN EN TIEMPO REAL – Cédula Ecuatoriana
   Valida formato y algoritmo oficial mientras el usuario escribe.
   ---------------------------------------------------------------- */
function initCedulaValidation() {
  const cedulaInput = document.getElementById('cedula');
  if (!cedulaInput) return;

  cedulaInput.addEventListener('input', (e) => {
    // Solo permite números
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
    
    validateCedulaField();
  });

  cedulaInput.addEventListener('blur', validateCedulaField);
}

function validateCedulaField() {
  const cedulaInput = document.getElementById('cedula');
  const cedula = cedulaInput.value;

  const isValid = cedula.length === 10 && validateCedulaEcuatoriana(cedula);
  
  cedulaInput.setCustomValidity(isValid ? '' : 'Cédula inválida');
  cedulaInput.classList.toggle('is-invalid', !isValid);
  cedulaInput.classList.toggle('is-valid', isValid);
}

/* ----------------------------------------------------------------
   ALGORITMO OFICIAL DE VALIDACIÓN DE CÉDULA ECUATORIANA
   Implementación del algoritmo del Registro Civil de Ecuador.
   ---------------------------------------------------------------- */
function validateCedulaEcuatoriana(cedula) {
  if (cedula.length !== 10 || !/^[0-9]{10}$/.test(cedula)) {
    return false;
  }

  // Algoritmo oficial del Registro Civil
  const digitos = cedula.split('').map(Number);
  const provincia = parseInt(cedula.substring(0, 2));
  
  // Verificar provincia (01-24 Ecuador continental, 30-30 Galápagos)
  if (provincia < 1 || (provincia > 24 && provincia !== 30)) {
    return false;
  }

  // Cálculo del dígito verificador
  let suma = 0;
  let multi = 2;
  
  for (let i = digitos.length - 2; i >= 0; i--) {
    suma += digitos[i] * multi;
    multi = multi === 2 ? 1 : 2;
  }
  
  const residuo = suma % 10;
  const digitoVerificador = residuo === 0 ? 0 : 10 - residuo;
  
  return digitos[9] === digitoVerificador;
}

/* ----------------------------------------------------------------
   FORMULARIO DE REGISTRO
   Escucha el submit y delega en handleRegister().
   ---------------------------------------------------------------- */
function initRegisterForm() {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;

  registerForm.addEventListener('submit', handleRegister);
}

/* ----------------------------------------------------------------
   HANDLER PRINCIPAL DE REGISTRO
   1. Previene recarga de página.
   2. Recoge y valida datos del formulario.
   3. Muestra estado de carga.
   4. Llama al servicio de registro.
   5. Redirige al login o muestra error.
   ---------------------------------------------------------------- */
async function handleRegister(e) {
  e.preventDefault();

  /* Recoger valores del formulario */
  const name            = document.getElementById('name').value.trim();
  const email           = document.getElementById('email').value.trim();
  const cedula          = document.getElementById('cedula').value.trim();  // ⭐ NUEVO
  const phone           = document.getElementById('phone').value.trim();
  const password        = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const terms           = document.getElementById('terms').checked;

  /* Validar antes de cualquier petición */
  if (!validateForm(name, email, cedula, password, confirmPassword, terms)) return;  // ⭐ Actualizado

  /* Referencias al botón */
  const btn       = document.querySelector('.btn-register');
  const btnText   = document.querySelector('.btn-text');
  const btnLoader = document.querySelector('.btn-loader');

  setLoading(true, btn, btnText, btnLoader);

  try {
    /* ============================================================
       REGISTRO DE USUARIO
       ─────────────────────────────────────────────────────────────
       ACTUAL:  registerUser() → guarda en localStorage (solo dev).
       SUPABASE: descomentar el bloque de abajo y eliminar registerUser().

       ── Con Supabase ──────────────────────────────────────────────
       import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

       const supabase = createClient(
         'https://TU_PROJECT_ID.supabase.co',
         'TU_ANON_PUBLIC_KEY'
       );

       const { data, error } = await supabase.auth.signUp({
         email,
         password,
         options: {
           data: { full_name: name, cedula, phone }   // ⭐ Cédula incluida
         }
       });

       if (error) throw new Error(error.message);

       // Supabase envía un correo de confirmación por defecto.
       // Puedes mostrar un mensaje pidiendo al usuario que revise su correo.
       ─────────────────────────────────────────────────────────────
    ============================================================ */
    const result = await registerUser({ name, email, cedula, phone, password });  // ⭐ Cédula incluida

    if (result.success) {
      showSuccess('¡Cuenta creada exitosamente! Redirigiendo...');
      /* Redirige al login tras 1.5 s para que el usuario lea el mensaje */
      setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } else {
      showError(result.message);
    }

  } catch (err) {
    console.error('Error en registro:', err);
    showError(err.message || 'Ocurrió un error. Intenta de nuevo.');

  } finally {
    setLoading(false, btn, btnText, btnLoader);
  }
}

/* ----------------------------------------------------------------
   VALIDACIÓN DEL FORMULARIO (cliente) – ACTUALIZADA
   Retorna true si todo es válido; false y muestra error si no.
   ---------------------------------------------------------------- */
function validateForm(name, email, cedula, password, confirmPassword, terms) {  // ⭐ Cédula agregada
  if (name.length < 2) {
    showError('El nombre debe tener al menos 2 caracteres');
    return false;
  }

  if (!isValidEmail(email)) {
    showError('Ingresa un correo electrónico válido');
    return false;
  }

  // ⭐ NUEVA VALIDACIÓN DE CÉDULA
  if (!validateCedulaEcuatoriana(cedula)) {
    showError('La cédula no es válida. Verifica los 10 dígitos.');
    return false;
  }

  if (password.length < 6) {
    showError('La contraseña debe tener al menos 6 caracteres');
    return false;
  }

  if (password !== confirmPassword) {
    showError('Las contraseñas no coinciden');
    return false;
  }

  if (!terms) {
    showError('Debes aceptar los términos y condiciones');
    return false;
  }

  return true;
}

/* ----------------------------------------------------------------
   REGISTRO DE USUARIO (TEMPORAL – solo para desarrollo)

   ⚠️  ELIMINAR cuando se integre Supabase.
      Usa localStorage como base de datos temporal.
      Devuelve un objeto { success, message } para manejo uniforme.
   ---------------------------------------------------------------- */
function registerUser({ name, email, cedula, phone, password }) {  // ⭐ Cédula incluida
  return new Promise((resolve) => {
    setTimeout(() => {
      /* Verificar si el correo ya está registrado */
      if (localStorage.getItem(`user_${email}`)) {
        resolve({ success: false, message: 'El correo ya está registrado' });
        return;
      }

      /* ⭐ Verificar si la cédula ya está registrada */
      const existingUsers = Object.keys(localStorage)
        .filter(key => key.startsWith('user_'))
        .map(key => JSON.parse(localStorage.getItem(key)))
        .filter(user => user.cedula === cedula);

      if (existingUsers.length > 0) {
        resolve({ success: false, message: 'La cédula ya está registrada' });
        return;
      }

      /* Guardar usuario (sin guardar contraseña en texto plano en producción) */
      localStorage.setItem(`user_${email}`, JSON.stringify({ name, email, cedula, phone }));
      resolve({ success: true });
    }, 1200); /* Simula latencia de red */
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
 * Muestra el mensaje de éxito.
 * @param {string} message
 */
function showSuccess(message) {
  const successDiv  = document.getElementById('successMessage');
  const successText = document.getElementById('successText');
  if (!successDiv || !successText) return;

  successText.textContent = message;
  successDiv.classList.remove('d-none');
}

/**
 * Muestra el mensaje de error y lo oculta automáticamente a los 5 s.
 * @param {string} message
 */
function showError(message) {
  const errorDiv  = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  if (!errorDiv || !errorText) return;

  errorText.textContent = message;
  errorDiv.classList.remove('d-none');

  clearTimeout(showError._timer);
  showError._timer = setTimeout(() => errorDiv.classList.add('d-none'), 5000);
}

/**
 * Activa o desactiva el estado de carga del botón de registro.
 * @param {boolean}     loading
 * @param {HTMLElement} btn
 * @param {HTMLElement} btnText
 * @param {HTMLElement} btnLoader
 */
function setLoading(loading, btn, btnText, btnLoader) {
  btn.disabled = loading;
  btnText.classList.toggle('d-none',  loading);
  btnLoader.classList.toggle('d-none', !loading);
}