<?php
require 'db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET  -> список користувачів
// POST -> реєстрація

if ($method === 'GET') {
    try {
        // тягнемо всіх юзерів + роль
        $sql = "
            SELECT 
                u.id,
                u.full_name AS name,
                u.email,
                u.registration_date,
                u.status,
                COALESCE(r.name, 'customer') AS role
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            ORDER BY u.id DESC
        ";
        $stmt = $pdo->query($sql);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($users);
        exit;

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Помилка отримання користувачів']);
        exit;
    }
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $name = isset($input['name']) ? trim($input['name']) : '';
    $email = isset($input['email']) ? trim($input['email']) : '';
    $password = isset($input['password']) ? $input['password'] : '';

    if (!$name || !$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Вкажіть ім’я, email та пароль']);
        exit;
    }

    try {
        // перевірка, чи є вже такий email
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Користувач з таким email вже існує']);
            exit;
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("
            INSERT INTO users (full_name, email, password_hash, registration_date, status)
            VALUES (:name, :email, :password_hash, NOW(), 'active')
        ");
        $stmt->execute([
            'name' => $name,
            'email' => $email,
            'password_hash' => $passwordHash
        ]);

        $newId = (int)$pdo->lastInsertId();

        // за замовчуванням — роль customer
        $roleStmt = $pdo->prepare("SELECT id FROM roles WHERE name = 'customer' LIMIT 1");
        $roleStmt->execute();
        $role = $roleStmt->fetch(PDO::FETCH_ASSOC);
        if ($role) {
            $stmt = $pdo->prepare("
                INSERT INTO user_roles (user_id, role_id, assigned_at)
                VALUES (:uid, :rid, NOW())
            ");
            $stmt->execute([
                'uid' => $newId,
                'rid' => $role['id']
            ]);
        }

        $responseUser = [
            'id' => $newId,
            'name' => $name,
            'email' => $email,
            'role' => $role ? 'customer' : null,
            'registration_date' => date('Y-m-d H:i:s')
        ];

        echo json_encode($responseUser);
        exit;

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Помилка при реєстрації']);
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
exit;