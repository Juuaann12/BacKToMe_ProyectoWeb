<?php
require_once __DIR__ . '/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond(['success' => false, 'message' => 'Método no permitido'], 405);
}

$query = "
SELECT
    p.id,
    p.cedula_usuario,
    p.titulo,
    p.categoria,
    p.descripcion,
    p.ubicacion,
    p.fecha_encontrado,
    p.fecha_creacion,
    u.nombre AS autor,
    u.correo AS usuario
FROM publicaciones p
LEFT JOIN usuario u ON u.cedula = p.cedula_usuario
ORDER BY p.fecha_creacion DESC
";

$result = mysqli_query($conexion, $query);
if (!$result) {
    respond(['success' => false, 'message' => 'Error al obtener publicaciones'], 500);
}

$publicaciones = [];
$ids = [];
while ($row = mysqli_fetch_assoc($result)) {
    $parsed = parsePublicationDescription($row['descripcion']);
    $row['tipo'] = $parsed['tipo'];
    $row['recompensa'] = $parsed['recompensa'];
    $row['telefono'] = $parsed['telefono'];
    $row['whatsapp'] = $parsed['whatsapp'];
    $row['descripcion'] = $parsed['descripcion'];
    $row['fecha'] = $row['fecha_encontrado'] ?: substr($row['fecha_creacion'], 0, 10);
    $row['imagenes'] = [];
    $publicaciones[$row['id']] = $row;
    $ids[] = (int)$row['id'];
}

if (count($ids) > 0) {
    $idsList = implode(',', $ids);
    $queryImages = "SELECT id_publicacion, url FROM imagenes_publicaciones WHERE id_publicacion IN ($idsList)";
    $imagesResult = mysqli_query($conexion, $queryImages);
    if ($imagesResult) {
        while ($image = mysqli_fetch_assoc($imagesResult)) {
            $publicaciones[$image['id_publicacion']]['imagenes'][] = $image['url'];
        }
    }
}

respond(['success' => true, 'publicaciones' => array_values($publicaciones)]);
