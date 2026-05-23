<?php
require_once __DIR__ . '/helpers.php';

$user = requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Método no permitido'], 405);
}

$context = sanitize($_POST['context'] ?? 'otros');
$folder = 'otros';
if ($context === 'perfil') {
    $folder = 'perfiles';
} elseif ($context === 'cedula') {
    $folder = 'cedulas';
} elseif ($context === 'publicacion') {
    $folder = 'publicaciones';
} elseif ($context === 'reporte') {
    $folder = 'reportes';
}

if (!isset($_FILES['file'])) {
    respond(['success' => false, 'message' => 'No se recibió archivo'], 400);
}

$url = saveUploadedFile($_FILES['file'], $folder);
if (!$url) {
    respond(['success' => false, 'message' => 'No se pudo guardar el archivo'], 500);
}

respond(['success' => true, 'url' => $url]);
