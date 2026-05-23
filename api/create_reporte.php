<?php
require_once __DIR__ . '/helpers.php';

$user = requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Método no permitido'], 405);
}

$data = $_POST;
$categoria = sanitize($data['categoria'] ?? '');
$sector = sanitize($data['sector'] ?? '');
$fechaPerdida = sanitize($data['fecha_perdida'] ?? $data['fecha'] ?? '');

if ($categoria === '' || $sector === '' || $fechaPerdida === '') {
    respond(['success' => false, 'message' => 'Categoría, sector y fecha son obligatorios'], 400);
}

$stmt = mysqli_prepare($conexion, 'INSERT INTO reportes (cedula_usuario, categoria, sector, fecha_perdida) VALUES (?, ?, ?, ?)');
if (!$stmt) {
    respond(['success' => false, 'message' => 'Error preparando el reporte'], 500);
}

mysqli_stmt_bind_param($stmt, 'ssss', $user['cedula'], $categoria, $sector, $fechaPerdida);
$success = mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

if (!$success) {
    respond(['success' => false, 'message' => 'Error al crear el reporte'], 500);
}

$reporteId = mysqli_insert_id($conexion);

respond(['success' => true, 'id' => $reporteId]);
