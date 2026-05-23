<?php
require_once __DIR__ . '/helpers.php';

$user = requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Método no permitido'], 405);
}

$tipo = sanitize($_POST['tipo'] ?? 'perdido');
$categoria = sanitize($_POST['categoria'] ?? 'otro');
$titulo = sanitize($_POST['titulo'] ?? '');
$descripcion = sanitize($_POST['descripcion'] ?? '');
$ubicacion = sanitize($_POST['lugar'] ?? '');
$fecha = sanitize($_POST['fecha'] ?? '');
$recompensa = sanitize($_POST['recompensa'] ?? '');
$telefono = sanitize($_POST['telefono'] ?? '');
$whatsapp = sanitize($_POST['whatsapp'] ?? '');

if ($titulo === '' || $descripcion === '' || $ubicacion === '') {
    respond(['success' => false, 'message' => 'Título, descripción y lugar son obligatorios'], 400);
}

if ($fecha === '') {
    $fecha = date('Y-m-d');
}

$descripcionCompleta = preparePublicationDescription($tipo, $recompensa, $telefono, $whatsapp, $descripcion);

$stmt = mysqli_prepare($conexion, 'INSERT INTO publicaciones (cedula_usuario, titulo, categoria, descripcion, ubicacion, fecha_encontrado) VALUES (?, ?, ?, ?, ?, ?)');
if (!$stmt) {
    respond(['success' => false, 'message' => 'Error preparando la publicación'], 500);
}

mysqli_stmt_bind_param($stmt, 'ssssss', $user['cedula'], $titulo, $categoria, $descripcionCompleta, $ubicacion, $fecha);
$success = mysqli_stmt_execute($stmt);
if (!$success) {
    respond(['success' => false, 'message' => 'Error al guardar la publicación'], 500);
}

$publicationId = mysqli_insert_id($conexion);
$imagenesGuardadas = [];

if (!empty($_FILES['imagenes'])) {
    $files = $_FILES['imagenes'];
    for ($i = 0; $i < count($files['name']); $i++) {
        if ($files['error'][$i] !== UPLOAD_ERR_OK) {
            continue;
        }
        $file = [
            'name' => $files['name'][$i],
            'type' => $files['type'][$i],
            'tmp_name' => $files['tmp_name'][$i],
            'error' => $files['error'][$i],
            'size' => $files['size'][$i],
        ];
        $url = saveUploadedFile($file, 'publicaciones');
        if ($url) {
            $imagenesGuardadas[] = $url;
            $insertImage = mysqli_prepare($conexion, 'INSERT INTO imagenes_publicaciones (id_publicacion, url) VALUES (?, ?)');
            if ($insertImage) {
                mysqli_stmt_bind_param($insertImage, 'is', $publicationId, $url);
                mysqli_stmt_execute($insertImage);
                mysqli_stmt_close($insertImage);
            }
        }
    }
}

respond([
    'success' => true,
    'publicacion' => [
        'id' => $publicationId,
        'titulo' => $titulo,
        'categoria' => $categoria,
        'tipo' => $tipo,
        'descripcion' => $descripcion,
        'ubicacion' => $ubicacion,
        'fecha' => $fecha,
        'recompensa' => $recompensa,
        'telefono' => $telefono,
        'whatsapp' => $whatsapp,
        'imagenes' => $imagenesGuardadas,
        'usuario' => $user['email'],
        'autor' => $user['name'],
    ]
]);
