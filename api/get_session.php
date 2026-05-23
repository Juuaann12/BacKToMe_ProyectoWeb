<?php
require_once __DIR__ . '/helpers.php';

$user = getCurrentUser();
respond(['success' => true, 'logged' => $user !== null, 'user' => $user]);
