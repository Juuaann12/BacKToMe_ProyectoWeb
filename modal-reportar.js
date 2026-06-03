/**
 * modal-reportar.js
 * Lógica del modal para reportar objetos perdidos
 * Consistente con la tabla reportes de la BD
 */
// Verificamos si el cliente ya existe en el objeto window para no sobreescribirlo
if (!window.supabaseClient) {
  var supabaseUrl = 'https://nspadsjyeeakerarojsm.supabase.co';
  var supabaseKey = 'sb_publishable_hW1N-mn5qgGRrt4DXgz1Zg_eqS2N4Th'; 
  window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
}
var supabaseClient = window.supabaseClient;

// Almacenar archivos de imágenes
let fotosReporteSeleccionadas = [];
const MAX_FOTOS_REPORTE = 5;
const MAX_TAMAÑO_FOTO_REPORTE = 5 * 1024 * 1024; // 5 MB

document.addEventListener('DOMContentLoaded', function() {
  initReportarForm();
  initDropzoneReporte();
});

/**
 * Inicializa el dropzone para cargar imágenes
 */
function initDropzoneReporte() {
  const dropzone = document.getElementById('dropzoneReporte');
  const inputFotos = document.getElementById('inputFotosReporte');

  if (!dropzone || !inputFotos) {
    console.warn('Dropzone o input de fotos de reporte no encontrado');
    return;
  }

  // Eventos drag and drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.backgroundColor = '#ffe5e5';
    dropzone.style.borderColor = '#dc3545';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.backgroundColor = 'transparent';
    dropzone.style.borderColor = '#dee2e6';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.backgroundColor = 'transparent';
    dropzone.style.borderColor = '#dee2e6';
    
    const archivos = e.dataTransfer.files;
    procesarArchivosReporte(archivos);
  });

  // Click para seleccionar archivos
  dropzone.addEventListener('click', (e) => {
    if (e.target !== inputFotos) {
      e.preventDefault();
      inputFotos.click();
    }
  });

  // Cambio en input de archivo
  inputFotos.addEventListener('change', (e) => {
    procesarArchivosReporte(e.target.files);
  });
}

/**
 * Procesa los archivos seleccionados
 */
function procesarArchivosReporte(archivos) {
  const inputFotos = document.getElementById('inputFotosReporte');
  
  for (let archivo of archivos) {
    // Validar si es imagen
    if (!archivo.type.startsWith('image/')) {
      mostrarAlertaReporte('Solo se permiten archivos de imagen', 'warning');
      continue;
    }

    // Validar tamaño
    if (archivo.size > MAX_TAMAÑO_FOTO_REPORTE) {
      mostrarAlertaReporte(`Imagen "${archivo.name}" excede 5 MB`, 'warning');
      continue;
    }

    // No exceder máximo de fotos
    if (fotosReporteSeleccionadas.length >= MAX_FOTOS_REPORTE) {
      mostrarAlertaReporte(`Máximo ${MAX_FOTOS_REPORTE} fotos permitidas`, 'warning');
      break;
    }

    // Agregar archivo
    fotosReporteSeleccionadas.push(archivo);
  }

  // Actualizar preview y contador
  actualizarPreviewReporte();
}

/**
 * Actualiza el preview de imágenes
 */
function actualizarPreviewReporte() {
  const previewContainer = document.getElementById('previewFotosReporte');
  const contador = document.getElementById('fotosContadorReporte');

  // Limpiar preview anterior
  previewContainer.innerHTML = '';

  // Crear preview para cada imagen
  fotosReporteSeleccionadas.forEach((archivo, index) => {
    const url = URL.createObjectURL(archivo);
    const col = document.createElement('div');
    col.className = 'col-auto';
    col.innerHTML = `
      <div class="position-relative" style="width: 80px; height: 80px;">
        <img src="${url}" alt="${archivo.name}" 
          class="img-thumbnail" style="width: 100%; height: 100%; object-fit: cover;">
        <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0" 
          style="transform: translate(50%, -50%);"
          onclick="removerFotoReporte(${index})" title="Remover foto">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;
    previewContainer.appendChild(col);
  });

  // Actualizar contador
  contador.textContent = fotosReporteSeleccionadas.length;
}

/**
 * Remueve una foto del array
 */
function removerFotoReporte(index) {
  fotosReporteSeleccionadas.splice(index, 1);
  actualizarPreviewReporte();

  // Limpiar input de archivo
  document.getElementById('inputFotosReporte').value = '';
}

/**
 * Inicializa el formulario de reporte
 */
function initReportarForm() {
  const form = document.getElementById('reportarForm');
  
  if (!form) {
    console.warn('Formulario reportarForm no encontrado');
    return;
  }

  // Manejar el envío del formulario
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Validar el formulario
    if (!form.checkValidity()) {
      e.stopPropagation();
    }

    form.classList.add('was-validated');

    // Si pasa la validación, procesar los datos
    if (form.checkValidity()) {
      handleReportarSubmit(form);
    }
  });

  // Limpiar validaciones al cerrar el modal
  const modal = document.getElementById('reportarModal');
  if (modal) {
    modal.addEventListener('hidden.bs.modal', function() {
      form.classList.remove('was-validated');
      form.reset();
      fotosReporteSeleccionadas = [];
      actualizarPreviewReporte();
    });
  }
}

/**
 * Procesa el envío del formulario
 */
async function handleReportarSubmit(form) {
  // Recopilar datos del formulario
  const formData = new FormData(form);
  const datos = {
    cedula_usuario: obtenerCedulaUsuarioReporte(),
    categoria: formData.get('categoria'),
    titulo: formData.get('titulo'),         // ✅ NUEVO
    descripcion: formData.get('descripcion'), // ✅ NUEVO
    sector: formData.get('sector'),
    fecha_perdida: formData.get('fecha_perdida'),
  };

  if (!datos.cedula_usuario) {
    mostrarAlertaReporte('Debes iniciar sesión para reportar', 'danger');
    return;
  }

  try {
    // 1. Insertar el reporte en la tabla 'reportes'
    const { data: repData, error: repError } = await supabaseClient
      .from('reportes')
      .insert([
        {
          cedula_usuario: datos.cedula_usuario,
          categoria: datos.categoria,
          titulo: datos.titulo,             // ✅ NUEVO
          descripcion: datos.descripcion,   // ✅ NUEVO
          sector: datos.sector,
          fecha_perdida: datos.fecha_perdida
        }
      ])
      .select();

    if (repError) throw repError;

    // 2. Subir imágenes si el usuario seleccionó fotos
    if (fotosReporteSeleccionadas.length > 0) {
      await subirImagenesReporte(repData[0].id, fotosReporteSeleccionadas);
    }

    mostrarAlertaReporte('¡Reporte enviado con éxito!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('reportarModal')).hide();
    
  } catch (error) {
    console.error('Error Supabase:', error);
    mostrarAlertaReporte('Error al guardar el reporte: ' + error.message, 'danger');
  }
}

/**
 * Sube las fotos al Storage y guarda la URL en la BD para los reportes
 */
async function subirImagenesReporte(idReporte, archivos) {
  for (const archivo of archivos) {
    const fileName = `${Date.now()}_${archivo.name}`;
    const filePath = `reportes/${idReporte}/${fileName}`;

    // Subir archivo al bucket 'imagenes'
    const { error: uploadError } = await supabaseClient.storage
      .from('imagenes')
      .upload(filePath, archivo);

    if (uploadError) throw uploadError;

    // Obtener la URL pública
    const { data: { publicUrl } } = supabaseClient.storage
      .from('imagenes')
      .getPublicUrl(filePath);

    // Guardar referencia en la tabla imagenes_reportes
    await supabaseClient
      .from('imagenes_reportes')
      .insert([{ id_reporte: idReporte, url: publicUrl }]);
  }
}

/**
 * Obtiene la cédula del usuario autenticado
 * TODO: conectar con Supabase Auth
 */
function obtenerCedulaUsuarioReporte() {
  const user = JSON.parse(localStorage.getItem('userLogged'));
  return user ? user.cedula : null;
}

/**
 * Muestra una alerta al usuario
 */
function mostrarAlertaReporte(mensaje, tipo = 'info') {
  const alertHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
      ${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;

  const alertElement = document.createElement('div');
  alertElement.innerHTML = alertHTML;
  document.body.appendChild(alertElement.firstElementChild);

  setTimeout(() => {
    const alert = document.body.querySelector('.alert');
    if (alert) {
      alert.remove();
    }
  }, 4000);
}