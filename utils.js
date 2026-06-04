/**
 * utils.js
 * Funciones utilitarias compartidas en toda la aplicación
 * Evita duplicación de código
 */

/* ================================================================
   FORMATEO Y VALIDACIÓN
   ================================================================ */

/**
 * Escapa caracteres HTML para prevenir XSS
 */
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

/**
 * Formatea una fecha a formato legible en español
 */
function formatDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-CO', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Normaliza un array de imágenes a URLs
 */
function normalizarImagenes(imagenes) {
  const urls = (imagenes || [])
    .map(img => img?.url)
    .filter(Boolean);
  return urls.length ? urls : ['imagenes/logo.png'];
}

/**
 * Valida formato básico de email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida cédula ecuatoriana (solo números)
 * Nota: Este es un validador simplificado
 */
function validateCedulaEcuatoriana(cedula) {
  return /^[0-9]+$/.test(cedula) && cedula.length > 0;
}

/* ================================================================
   MANEJO DE ESTADO DE CARGA
   ================================================================ */

/**
 * Muestra estado de carga en un botón
 */
function setLoading(isLoading, btn, btnText, btnLoader) {
  if (!btn) return;
  
  if (isLoading) {
    btn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnLoader) btnLoader.style.display = 'inline-block';
  } else {
    btn.disabled = false;
    if (btnText) btnText.style.display = 'inline';
    if (btnLoader) btnLoader.style.display = 'none';
  }
}

/* ================================================================
   NOTIFICACIONES Y ALERTAS
   ================================================================ */

/**
 * Muestra mensaje de error
 */
function showError(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-danger alert-dismissible fade show';
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `
    <i class="bi bi-exclamation-triangle-fill me-2"></i>
    <strong>${escapeHTML(message)}</strong>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  const container = document.querySelector('body');
  container.insertBefore(alertDiv, container.firstChild);
  
  setTimeout(() => alertDiv.remove(), 5000);
}

/**
 * Muestra mensaje de éxito
 */
function showSuccess(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-success alert-dismissible fade show';
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `
    <i class="bi bi-check-circle-fill me-2"></i>
    <strong>${escapeHTML(message)}</strong>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  const container = document.querySelector('body');
  container.insertBefore(alertDiv, container.firstChild);
  
  setTimeout(() => alertDiv.remove(), 4000);
}

/**
 * Muestra alerta genérica
 */
function mostrarAlerta(mensaje, tipo = 'info') {
  const alertDiv = document.createElement('div');
  const claseColor = tipo === 'warning' ? 'alert-warning' : 
                     tipo === 'danger' ? 'alert-danger' : 
                     'alert-info';
  
  alertDiv.className = `alert ${claseColor} alert-dismissible fade show`;
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `
    ${escapeHTML(mensaje)}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  const container = document.querySelector('body');
  container.insertBefore(alertDiv, container.firstChild);
  
  setTimeout(() => alertDiv.remove(), 4000);
}

/**
 * Muestra mensaje genérico
 */
function mostrarMensaje(mensaje) {
  console.log('💬 Mensaje:', mensaje);
  mostrarAlerta(mensaje, 'info');
}

/* ================================================================
   UTILIDADES DE LOCALIZACIÓN Y SESIÓN
   ================================================================ */

/**
 * Obtiene el usuario actual del localStorage
 */
function getCurrentUser() {
  try {
    const user = JSON.parse(localStorage.getItem('userLogged'));
    return user || null;
  } catch (e) {
    console.error('Error al obtener usuario:', e);
    return null;
  }
}

/**
 * Guarda usuario en localStorage
 */
function saveUser(user) {
  localStorage.setItem('userLogged', JSON.stringify(user));
}

/**
 * Limpia sesión del usuario
 */
function clearUser() {
  localStorage.removeItem('userLogged');
}

/**
 * Obtiene cédula del usuario autenticado
 */
function obtenerCedulaUsuario() {
  const user = getCurrentUser();
  return user?.cedula || null;
}

/* ================================================================
   UTILIDADES DE ARCHIVO
   ================================================================ */

/**
 * Crea una URL de objeto para preview de archivo
 */
function crearURLPreview(archivo) {
  return URL.createObjectURL(archivo);
}

/**
 * Libera memoria de URL de objeto
 */
function limpiarURLPreview(url) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/* ================================================================
   VALIDACIONES DE FORMULARIO
   ================================================================ */

/**
 * Valida que un formulario sea válido según HTML5
 */
function isFormValid(form) {
  return form && form.checkValidity() === true;
}

/**
 * Marca un formulario como validado visualmente
 */
function markFormAsValidated(form) {
  if (form) {
    form.classList.add('was-validated');
  }
}

/**
 * Limpia las clases de validación de un formulario
 */
function clearFormValidation(form) {
  if (form) {
    form.classList.remove('was-validated');
  }
}
