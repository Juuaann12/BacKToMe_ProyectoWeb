<?php
header('Content-Type: application/json; charset=utf-8');
session_start();

require_once __DIR__ . '/../conexion.php';

function respond($payload, $status = 200) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function getRequestData() {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    if (is_array($data)) {
        return $data;
    }
    return $_POST;
}

function sanitize($value) {
    return trim($value ?? '');
}

function getCurrentUser() {
    return $_SESSION['user'] ?? null;
}

function requireLogin() {
    $user = getCurrentUser();
    if (!$user) {
        respond(['success' => false, 'message' => 'No autenticado'], 401);
    }
    return $user;
}

function requireAdmin() {
    $user = requireLogin();
    if (($user['rol'] ?? '') !== 'admin') {
        respond(['success' => false, 'message' => 'Acceso denegado'], 403);
    }
    return $user;
}

function preparePublicationDescription($tipo, $recompensa, $telefono, $whatsapp, $descripcion) {
    $lines = [];
    if ($tipo !== '') {
        $lines[] = 'tipo:' . $tipo;
    }
    if ($recompensa !== '') {
        $lines[] = 'recompensa:' . $recompensa;
    }
    if ($telefono !== '') {
        $lines[] = 'telefono:' . $telefono;
    }
    if ($whatsapp !== '') {
        $lines[] = 'whatsapp:' . $whatsapp;
    }
    $descripcion = trim($descripcion);
    if (count($lines) > 0) {
        return implode("\n", $lines) . "\n\n" . $descripcion;
    }
    return $descripcion;
}

function parsePublicationDescription($descripcion) {
    $result = [
        'tipo' => 'perdido',
        'recompensa' => null,
        'telefono' => null,
        'whatsapp' => null,
        'descripcion' => trim($descripcion)
    ];

    $lines = preg_split('/\r\n|\n|\r/', $descripcion);
    $remaining = [];

    foreach ($lines as $line) {
        if (preg_match('/^\s*(tipo|recompensa|telefono|whatsapp)\s*:\s*(.*)$/i', $line, $matches)) {
            $key = strtolower($matches[1]);
            $value = trim($matches[2]);
            if ($key === 'tipo') {
                $result['tipo'] = $value !== '' ? $value : $result['tipo'];
            } elseif ($key === 'recompensa') {
                $result['recompensa'] = $value !== '' ? $value : null;
            } elseif ($key === 'telefono') {
                $result['telefono'] = $value !== '' ? $value : null;
            } elseif ($key === 'whatsapp') {
                $result['whatsapp'] = $value !== '' ? $value : null;
            }
            continue;
        }
        $remaining[] = $line;
    }

    $result['descripcion'] = trim(implode("\n", $remaining));
    return $result;
}

function saveUploadedFile($file, $folder) {
    if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    $basePath = __DIR__ . "/../uploads/" . basename($folder);
    if (!is_dir($basePath)) {
        mkdir($basePath, 0777, true);
    }

    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = bin2hex(random_bytes(8));
    $targetName = $filename . ($extension ? '.' . $extension : '');
    $targetPath = $basePath . '/' . $targetName;

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        return null;
    }

    return 'uploads/' . basename($folder) . '/' . $targetName;
}
