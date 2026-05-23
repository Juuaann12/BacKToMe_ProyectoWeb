<?php
require_once __DIR__ . '/helpers.php';

$user = requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Método no permitido'], 405);
}

$nombre = sanitize($_POST['nombre'] ?? '');
$correo = sanitize($_POST['correo'] ?? '');
$celular = sanitize($_POST['celular'] ?? '');

if ($nombre === '' || $correo === '') {
    respond(['success' => false, 'message' => 'Nombre y correo son obligatorios'], 400);
}

if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    respond(['success' => false, 'message' => 'Correo inválido'], 400);
}

if ($correo !== $user['email']) {
    $check = mysqli_prepare($conexion, 'SELECT correo FROM usuario WHERE correo = ? AND cedula <> ? LIMIT 1');
    mysqli_stmt_bind_param($check, 'ss', $correo, $user['cedula']);
    mysqli_stmt_execute($check);
    $result = mysqli_stmt_get_result($check);
    if (mysqli_fetch_assoc($result)) {
        mysqli_stmt_close($check);
        respond(['success' => false, 'message' => 'El correo ya está en uso'], 409);
    }
    mysqli_stmt_close($check);
}

$fotoPerfilUrl = $user['foto_perfil'] ?? null;
$fotoCedulaUrl = $user['foto_cedula'] ?? null;

if (isset($_FILES['foto_perfil']) && $_FILES['foto_perfil']['error'] === UPLOAD_ERR_OK) {
    $url = saveUploadedFile($_FILES['foto_perfil'], 'perfiles');
    if ($url) {
        $fotoPerfilUrl = $url;
    }
}

if (isset($_FILES['foto_cedula']) && $_FILES['foto_cedula']['error'] === UPLOAD_ERR_OK) {
    $url = saveUploadedFile($_FILES['foto_cedula'], 'cedulas');
    if ($url) {
        $fotoCedulaUrl = $url;
    }
}

$stmt = mysqli_prepare($conexion, 'UPDATE usuario SET nombre = ?, correo = ?, celular = ?, foto_perfil = ?, foto_cedula = ? WHERE cedula = ?');
if (!$stmt) {
    respond(['success' => false, 'message' => 'Error al preparar la actualización'], 500);
}

mysqli_stmt_bind_param($stmt, 'ssssss', $nombre, $correo, $celular, $fotoPerfilUrl, $fotoCedulaUrl, $user['cedula']);
$success = mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

if (!$success) {
    respond(['success' => false, 'message' => 'Error al actualizar el perfil'], 500);
}

$_SESSION['user']['name'] = $nombre;
$_SESSION['user']['email'] = $correo;
$_SESSION['user']['celular'] = $celular;
$_SESSION['user']['foto_perfil'] = $fotoPerfilUrl;
$_SESSION['user']['foto_cedula'] = $fotoCedulaUrl;

respond(['success' => true, 'user' => $_SESSION['user']]);
