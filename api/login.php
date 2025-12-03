<?php
require 'db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$email = isset($input['email']) ? trim($input['email']) : '';
$password = isset($input['password']) ? $input['password'] : '';

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Не вказано email або пароль']);
    exit;
}

try {

    $sql = "
        SELECT 
            u.id,
            u.full_name AS name,
            u.email,
            u.password_hash,
            u.registration_date,
            COALESCE(r.name, 'customer') AS role
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.email = :email
        LIMIT 1
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Невірний email або пароль']);
        exit;
    }

    if (!password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Невірний email або пароль']);
        exit;
    }

    // Юзер, якого відправляємо на фронт
    $responseUser = [
        'id' => (int)$user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role'],                 // тут буде 'admin' для admin@ucoffee.com
        'registration_date' => $user['registration_date']
    ];

    echo json_encode($responseUser);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Помилка сервера']);
    exit;
}