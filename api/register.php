<?php
require_once __DIR__ . '/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Método no permitido'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$name = sanitize($data['name'] ?? '');
$email = sanitize($data['email'] ?? '');
$cedula = sanitize($data['cedula'] ?? '');
$phone = sanitize($data['phone'] ?? $data['celular'] ?? '');
$password = $data['password'] ?? '';

if ($name === '' || $email === '' || $cedula === '' || $password === '') {
    respond(['success' => false, 'message' => 'Todos los campos obligatorios deben completarse'], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(['success' => false, 'message' => 'Correo inválido'], 400);
}

$stmt = mysqli_prepare($conexion, 'SELECT correo, cedula FROM usuario WHERE correo = ? OR cedula = ? LIMIT 1');
if (!$stmt) {
    respond(['success' => false, 'message' => 'Error en la consulta de registro'], 500);
}

mysqli_stmt_bind_param($stmt, 'ss', $email, $cedula);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$existing = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);

if ($existing) {
    if ($existing['correo'] === $email) {
        respond(['success' => false, 'message' => 'El correo ya está registrado'], 409);
    }
    if ($existing['cedula'] === $cedula) {
        respond(['success' => false, 'message' => 'La cédula ya está registrada'], 409);
    }
}

$hashedPassword = password_hash($password, PASSWORD_DEFAULT);
$stmt = mysqli_prepare($conexion, 'INSERT INTO usuario (cedula, nombre, correo, contrasena, celular, rol, foto_perfil, foto_cedula) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)');
if (!$stmt) {
    respond(['success' => false, 'message' => 'Error preparando la inserción de usuario'], 500);
}

$rol = 'usuario';
mysqli_stmt_bind_param($stmt, 'ssssss', $cedula, $name, $email, $hashedPassword, $phone, $rol);
$success = mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

if (!$success) {
    respond(['success' => false, 'message' => 'No se pudo crear la cuenta'], 500);
}

respond(['success' => true]);
