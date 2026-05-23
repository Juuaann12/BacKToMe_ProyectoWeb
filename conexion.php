<?php

$conexion = mysqli_connect(
    "basedatos",
    "root",
    "12345",
    "usuarios"
);

if (!$conexion) {
    die("Error de conexión: " . mysqli_connect_error());
}

?>