<?php
require_once __DIR__ . '/helpers.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Método no permitido'], 405);
}

$data = getRequestData();
$table = sanitize($data['table'] ?? '');
$id = sanitize($data['id'] ?? '');

if ($table === '' || $id === '') {
    respond(['success' => false, 'message' => 'Tabla e id son obligatorios'], 400);
}

$allowed = [
    'usuario' => ['field' => 'cedula', 'query' => 'DELETE FROM usuario WHERE cedula = ?'],
    'publicaciones' => ['field' => 'id', 'query' => 'DELETE FROM publicaciones WHERE id = ?'],
    'reportes' => ['field' => 'id', 'query' => 'DELETE FROM reportes WHERE id = ?'],
];

if (!isset($allowed[$table])) {
    respond(['success' => false, 'message' => 'Tabla no permitida'], 400);
}

$query = $allowed[$table]['query'];
$stmt = mysqli_prepare($conexion, $query);
if (!$stmt) {
    respond(['success' => false, 'message' => 'Error preparando la eliminación'], 500);
}

mysqli_stmt_bind_param($stmt, 's', $id);
$success = mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

if (!$success) {
    respond(['success' => false, 'message' => 'Error al eliminar el registro'], 500);
}

respond(['success' => true]);
