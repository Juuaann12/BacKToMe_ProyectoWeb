<?php
require_once __DIR__ . '/helpers.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond(['success' => false, 'message' => 'Método no permitido'], 405);
}

$query = 'SELECT cedula, nombre, correo, celular, rol, foto_perfil, foto_cedula FROM usuario ORDER BY nombre ASC';
$result = mysqli_query($conexion, $query);
if (!$result) {
    respond(['success' => false, 'message' => 'Error al obtener usuarios'], 500);
}

$usuarios = [];
while ($row = mysqli_fetch_assoc($result)) {
    $usuarios[] = $row;
}

respond(['success' => true, 'usuarios' => $usuarios]);
