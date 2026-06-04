<?php
require_once __DIR__ . '/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Método no permitido'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$email = sanitize($data['email'] ?? '');
$password = $data['password'] ?? '';

if ($email === '' || $password === '') {
    respond(['success' => false, 'message' => 'Correo y contraseña son obligatorios'], 400);
}

$stmt = mysqli_prepare($conexion, 'SELECT cedula, nombre, correo, contrasena, celular, rol, foto_perfil, foto_cedula FROM usuario WHERE correo = ? LIMIT 1');
if (!$stmt) {
    respond(['success' => false, 'message' => 'Error en la consulta de login'], 500);
}

mysqli_stmt_bind_param($stmt, 's', $email);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$user = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);

if (!$user) {
    respond(['success' => false, 'message' => 'Correo o contraseña inválidos'], 401);
}

$valid = false;
if (password_verify($password, $user['contrasena'])) {
    $valid = true;
} elseif ($user['contrasena'] === $password) {
    $valid = true;
}

if (!$valid) {
    respond(['success' => false, 'message' => 'Correo o contraseña inválidos'], 401);
}

$_SESSION['user'] = [
    'cedula' => $user['cedula'],
    'name' => $user['nombre'],
    'email' => $user['correo'],
    'rol' => $user['rol'],
    'celular' => $user['celular'],
    'foto_perfil' => $user['foto_perfil'],
    'foto_cedula' => $user['foto_cedula']
];

respond(['success' => true, 'user' => $_SESSION['user']]);
