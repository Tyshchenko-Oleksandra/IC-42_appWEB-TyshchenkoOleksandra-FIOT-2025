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

if ($method === 'GET') {
    try {
        $sql = "
            SELECT 
                o.id,
                o.customer_name,
                o.phone,
                o.email,
                o.address,
                o.created_at,
                o.status,
                o.total_amount,
                o.user_id
            FROM orders o
            ORDER BY o.id DESC
        ";
        $stmt = $pdo->query($sql);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($orders);
        exit;

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Помилка отримання замовлень']);
        exit;
    }
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $name    = isset($input['name']) ? trim($input['name']) : '';
    $phone   = isset($input['phone']) ? trim($input['phone']) : '';
    $email   = isset($input['email']) ? trim($input['email']) : '';
    $address = isset($input['address']) ? trim($input['address']) : '';
    $items   = isset($input['items']) ? $input['items'] : [];
    $userId  = isset($input['userId']) ? (int)$input['userId'] : null;

    if (!$name || !$phone || !$email || !$address || empty($items)) {
        http_response_code(400);
        echo json_encode(['error' => 'Заповніть всі поля та додайте товари']);
        exit;
    }

    // порахуємо суму
    $total = 0;
    foreach ($items as $item) {
        $price = isset($item['price']) ? (float)$item['price'] : 0;
        $qty   = isset($item['quantity']) ? (int)$item['quantity'] : 1;
        $total += $price * $qty;
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            INSERT INTO orders (customer_name, phone, email, address, created_at, status, total_amount, user_id)
            VALUES (:name, :phone, :email, :address, NOW(), 'new', :total, :user_id)
        ");
        $stmt->execute([
            'name'    => $name,
            'phone'   => $phone,
            'email'   => $email,
            'address' => $address,
            'total'   => $total,
            'user_id' => $userId ?: null
        ]);

        $orderId = (int)$pdo->lastInsertId();


        $pdo->commit();

        echo json_encode([
            'success' => true,
            'order_id' => $orderId,
            'total_amount' => $total
        ]);
        exit;

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Помилка при оформленні замовлення']);
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
exit;