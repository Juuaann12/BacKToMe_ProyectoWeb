/* ================================================================
   REGISTER.JS – BackToMe · Registro de nuevos usuarios
   ================================================================ */
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

document.addEventListener('DOMContentLoaded', () => {
  initTogglePassword();
  initConfirmPasswordValidation();
  initCedulaValidation();  // ⭐ NUEVO: Validación en tiempo real de cédula
  initImageInputs();
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

  confirmInput.setCustomValidity(mismatch ? 'Las contraseñas no coinciden' : '');
  confirmInput.classList.toggle('is-invalid', mismatch);
}

/* ----------------------------------------------------------------
   VALIDACIÓN EN TIEMPO REAL – Cédula Ecuatoriana
   ---------------------------------------------------------------- */
function initCedulaValidation() {
  const cedulaInput = document.getElementById('cedula');
  if (!cedulaInput) return;

  cedulaInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
    validateCedulaField();
  });

  cedulaInput.addEventListener('blur', validateCedulaField);
}

function validateCedulaField() {
  const cedulaInput = document.getElementById('cedula');
  const cedula = cedulaInput.value;
  const isValid = cedula.length >= 1 && validateCedulaEcuatoriana(cedula);
  
  cedulaInput.setCustomValidity(isValid ? '' : 'Cédula inválida');
  cedulaInput.classList.toggle('is-invalid', !isValid);
  cedulaInput.classList.toggle('is-valid', isValid);
}

/* ----------------------------------------------------------------
   PREVIEW Y VALIDACION DE IMAGENES
   Valida tipo/tamano y muestra una vista previa antes del envio.
   ---------------------------------------------------------------- */
function initImageInputs() {
  setupImagePreview('profilePhoto', 'profilePhotoPreview');
  setupImagePreview('cedulaPhoto', 'cedulaPhotoPreview');
}

function setupImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;

  input.addEventListener('change', () => {
    const file = input.files[0];
    preview.classList.add('d-none');
    preview.innerHTML = '';

    if (!file) {
      input.setCustomValidity('');
      return;
    }

    const error = validateImageFile(file);
    if (error) {
      input.value = '';
      input.setCustomValidity(error);
      showError(error);
      return;
    }

    input.setCustomValidity('');

    const reader = new FileReader();
    reader.onload = () => {
      preview.innerHTML = `<img src="${reader.result}" alt="Vista previa">`;
      preview.classList.remove('d-none');
    };
    reader.readAsDataURL(file);
  });
}

function validateImageFile(file) {
  if (!file.type.startsWith('image/')) {
    return 'Solo se permiten archivos de imagen';
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return 'Cada imagen debe pesar maximo 2 MB';
  }

  return '';
}

function readImageAsText(inputId) {
  const input = document.getElementById(inputId);
  const file = input?.files?.[0];

  if (!file) {
    return Promise.resolve(null);
  }

  const error = validateImageFile(file);
  if (error) {
    return Promise.reject(new Error(error));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
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
  const profilePhoto    = document.getElementById('profilePhoto').files[0];
  const cedulaPhoto     = document.getElementById('cedulaPhoto').files[0];

  /* Validar antes de cualquier petición */
  if (!validateForm(name, email, cedula, phone, password, confirmPassword, terms, profilePhoto, cedulaPhoto)) return;  // ⭐ Actualizado

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
    const fotoPerfil = await readImageAsText('profilePhoto');
    const fotoCedula = await readImageAsText('cedulaPhoto');
    const result = await registerUser({
      name,
      email,
      cedula,
      phone,
      password,
      fotoPerfil,
      fotoCedula
    });  // ⭐ Cédula incluida

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
function validateForm(name, email, cedula, phone, password, confirmPassword, terms, profilePhoto, cedulaPhoto) {  // ⭐ Cédula agregada
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

  if (!phone) {
    showError('Ingresa un numero de telefono');
    return false;
  }

  if (!profilePhoto) {
    showError('Selecciona una foto de perfil');
    return false;
  }

  if (!cedulaPhoto) {
    showError('Selecciona una foto de cedula');
    return false;
  }

  const profilePhotoError = validateImageFile(profilePhoto);
  if (profilePhotoError) {
    showError(profilePhotoError);
    return false;
  }

  const cedulaPhotoError = validateImageFile(cedulaPhoto);
  if (cedulaPhotoError) {
    showError(cedulaPhotoError);
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
   REGISTRO DE USUARIO CON SUPABASE
   Guarda el usuario en la tabla "usuario" de Supabase.
   ---------------------------------------------------------------- */
async function registerUser({ name, email, cedula, phone, password, fotoPerfil, fotoCedula }) {
  try {
    /* 1. Verificar si el correo ya existe */
    const { data: existingEmail, error: emailError } = await supabaseClient
      .from('usuario')
      .select('correo')
      .eq('correo', email)
      .single();

    if (existingEmail) {
      return { success: false, message: 'El correo ya está registrado' };
    }

    /* 2. Verificar si la cédula ya existe */
    const { data: existingCedula, error: cedulaError } = await supabaseClient
      .from('usuario')
      .select('cedula')
      .eq('cedula', cedula)
      .single();

    if (existingCedula) {
      return { success: false, message: 'La cédula ya está registrada' };
    }

    /* 3. Insertar usuario en la tabla "usuario" */
    const { error: insertError } = await supabaseClient
      .from('usuario')
      .insert([
        {
          cedula: cedula,
          nombre: name,
          correo: email,
          contrasena: password,  // ⚠️ En producción, usar hash del lado del servidor
          celular: phone,
          rol: 'usuario',
          foto_perfil: fotoPerfil,
          foto_cedula: fotoCedula
        }
      ]);

    if (insertError) {
      throw insertError;
    }

    return { success: true };

  return await response.json();
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
