/**
 * modal-publicar.js
 * Lógica del modal para publicar objetos encontrados
 * Consistente con la tabla publicaciones de la BD
 */

// Usamos var para permitir que otros scripts cargados en la misma página compartan la configuración
// Verificamos si el cliente ya existe en el objeto window para no sobreescribirlo
if (!window.supabaseClient) {
  var supabaseUrl = 'https://nspadsjyeeakerarojsm.supabase.co';
  var supabaseKey = 'sb_publishable_hW1N-mn5qgGRrt4DXgz1Zg_eqS2N4Th'; 
  window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
}
var supabaseClient = window.supabaseClient;

// Almacenar archivos de imágenes
let fotosSeleccionadas = [];
const MAX_FOTOS = 5;
const MAX_TAMAÑO_FOTO = 5 * 1024 * 1024; // 5 MB

document.addEventListener('DOMContentLoaded', function() {
  initPublicarForm();
  initDropzone();
});

/**
 * Inicializa el dropzone para cargar imágenes
 */
function initDropzone() {
  const dropzone = document.getElementById('dropzone');
  const inputFotos = document.getElementById('inputFotos');

  if (!dropzone || !inputFotos) {
    console.warn('Dropzone o input de fotos no encontrado');
    return;
  }

  // Eventos drag and drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.backgroundColor = '#e8f4f8';
    dropzone.style.borderColor = '#0d6efd';
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
    procesarArchivos(archivos);
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
    procesarArchivos(e.target.files);
  });
}

/**
 * Procesa los archivos seleccionados
 */
function procesarArchivos(archivos) {
  const inputFotos = document.getElementById('inputFotos');
  
  for (let archivo of archivos) {
    // Validar si es imagen
    if (!archivo.type.startsWith('image/')) {
      mostrarAlerta('Solo se permiten archivos de imagen', 'warning');
      continue;
    }

    // Validar tamaño
    if (archivo.size > MAX_TAMAÑO_FOTO) {
      mostrarAlerta(`Imagen "${archivo.name}" excede 5 MB`, 'warning');
      continue;
    }

    // No exceder máximo de fotos
    if (fotosSeleccionadas.length >= MAX_FOTOS) {
      mostrarAlerta(`Máximo ${MAX_FOTOS} fotos permitidas`, 'warning');
      break;
    }

    // Agregar archivo
    fotosSeleccionadas.push(archivo);
  }

  // Actualizar preview y contador
  actualizarPreview();
}

/**
 * Actualiza el preview de imágenes
 */
function actualizarPreview() {
  const previewContainer = document.getElementById('previewFotos');
  const contador = document.getElementById('fotosContador');

  // Limpiar preview anterior
  previewContainer.innerHTML = '';

  // Crear preview para cada imagen
  fotosSeleccionadas.forEach((archivo, index) => {
    const url = URL.createObjectURL(archivo);
    const col = document.createElement('div');
    col.className = 'col-auto';
    col.innerHTML = `
      <div class="position-relative" style="width: 80px; height: 80px;">
        <img src="${url}" alt="${archivo.name}" 
          class="img-thumbnail" style="width: 100%; height: 100%; object-fit: cover;">
        <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0" 
          style="transform: translate(50%, -50%);"
          onclick="removerFoto(${index})" title="Remover foto">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;
    previewContainer.appendChild(col);
  });

  // Actualizar contador
  contador.textContent = fotosSeleccionadas.length;
}

/**
 * Remueve una foto del array
 */
function removerFoto(index) {
  fotosSeleccionadas.splice(index, 1);
  actualizarPreview();

  // Limpiar input de archivo
  document.getElementById('inputFotos').value = '';
}

/**
 * Inicializa el formulario de publicación
 */
function initPublicarForm() {
  const form = document.getElementById('publicarForm');
  
  if (!form) {
    console.warn('Formulario publicarForm no encontrado');
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
      handlePublicarSubmit(form);
    }
  });

  // Limpiar validaciones al cerrar el modal
  const modal = document.getElementById('publicarModal');
  if (modal) {
    modal.addEventListener('hidden.bs.modal', function() {
      form.classList.remove('was-validated');
      form.reset();
      fotosSeleccionadas = [];
      actualizarPreview();
    });
  }
}

/**
 * Procesa el envío del formulario
 */
async function handlePublicarSubmit(form) {
  // Recopilar datos del formulario
  const formData = new FormData(form);
  const datos = {
    cedula_usuario: obtenerCedulaUsuario(), // TODO: obtener del usuario autenticado
    titulo: formData.get('titulo'),
    categoria: formData.get('categoria'),
    descripcion: formData.get('descripcion'),
    ubicacion: formData.get('ubicacion'),
    fecha_encontrado: formData.get('fecha_encontrado'),
  };

  if (!datos.cedula_usuario) {
    mostrarAlerta('Debes iniciar sesión para publicar', 'danger');
    return;
  }

  try {
    // 1. Insertar la publicación en la tabla 'publicaciones'
    const { data: pubData, error: pubError } = await supabaseClient
      .from('publicaciones')
      .insert([
        {
          cedula_usuario: datos.cedula_usuario,
          titulo: datos.titulo,
          categoria: datos.categoria,
          descripcion: datos.descripcion,
          ubicacion: datos.ubicacion,
          fecha_encontrado: datos.fecha_encontrado
        }
      ])
      .select();

    if (pubError) throw pubError;

    // 2. Subir imágenes si el usuario seleccionó fotos
    if (fotosSeleccionadas.length > 0) {
      await subirImagenesPublicacion(pubData[0].id, fotosSeleccionadas);
    }

    mostrarAlerta('¡Objeto publicado con éxito!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('publicarModal')).hide();
    
    // Opcional: recargar la página para ver la nueva publicación
    setTimeout(() => window.location.reload(), 1500);

  } catch (error) {
    console.error('Error Supabase:', error);
    mostrarAlerta('Error al guardar en la base de datos: ' + error.message, 'danger');
  }
}

/**
 * Sube las fotos al Storage y guarda la URL en la BD
 */
async function subirImagenesPublicacion(idPublicacion, archivos) {
  for (const archivo of archivos) {
    const fileName = `${Date.now()}_${archivo.name}`;
    const filePath = `publicaciones/${idPublicacion}/${fileName}`;

    // Subir archivo al bucket 'imagenes'
    const { error: uploadError } = await supabaseClient.storage
      .from('imagenes')
      .upload(filePath, archivo);

    if (uploadError) throw uploadError;

    // Obtener la URL pública del archivo subido
    const { data: { publicUrl } } = supabaseClient.storage
      .from('imagenes')
      .getPublicUrl(filePath);

    // Guardar referencia en la tabla imagenes_publicaciones
    await supabaseClient
      .from('imagenes_publicaciones')
      .insert([{ id_publicacion: idPublicacion, url: publicUrl }]);
  }
}

/**
 * Obtiene la cédula del usuario autenticado
 * TODO: conectar con Supabase Auth
 */
function obtenerCedulaUsuario() {
  const user = JSON.parse(localStorage.getItem('userLogged'));
  return user ? user.cedula : null;
}

/**
 * Muestra una alerta al usuario
 */
function mostrarAlerta(mensaje, tipo = 'info') {
  // Crear alerta Bootstrap
  const alertHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
      ${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;

  const alertElement = document.createElement('div');
  alertElement.innerHTML = alertHTML;
  document.body.appendChild(alertElement.firstElementChild);

  // Auto-descartar después de 4 segundos
  setTimeout(() => {
    const alert = document.body.querySelector('.alert');
    if (alert) {
      alert.remove();
    }
  }, 4000);
}
