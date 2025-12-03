<?php
require 'db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        // =======================
        // GET: список або один товар
        // =======================
        case 'GET':
            if (isset($_GET['id'])) {
                $id = (int)$_GET['id'];
                $stmt = $pdo->prepare("
                    SELECT id, title, description, price, image
                    FROM products
                    WHERE id = :id
                ");
                $stmt->execute(['id' => $id]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$product) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Товар не знайдено']);
                    exit;
                }

                echo json_encode($product);
            } else {
                $stmt = $pdo->query("
                    SELECT id, title, description, price, image
                    FROM products
                    ORDER BY id DESC
                ");
                $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($products);
            }
            break;

        // =======================
        // POST: створення товару
        // =======================
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            $title = isset($input['title']) ? trim($input['title']) : '';
            $description = isset($input['description']) ? trim($input['description']) : '';
            $price = isset($input['price']) ? (float)$input['price'] : 0;
            $image = isset($input['image']) ? trim($input['image']) : '';

            if (!$title || !$description || $price <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Заповніть назву, опис та коректну ціну']);
                exit;
            }

            $sql = "
                INSERT INTO products (title, description, price, image)
                VALUES (:title, :description, :price, :image)
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'title'       => $title,
                'description' => $description,
                'price'       => $price,
                'image'       => $image
            ]);

            $newId = (int)$pdo->lastInsertId();

            $stmt = $pdo->prepare("
                SELECT id, title, description, price, image
                FROM products
                WHERE id = :id
            ");
            $stmt->execute(['id' => $newId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            http_response_code(201);
            echo json_encode($product);
            break;

        // =======================
        // PUT/PATCH: оновлення товару
        // =======================
        case 'PUT':
        case 'PATCH':
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Не вказано id товару']);
                exit;
            }

            $id = (int)$_GET['id'];
            $input = json_decode(file_get_contents('php://input'), true);

            $title = isset($input['title']) ? trim($input['title']) : '';
            $description = isset($input['description']) ? trim($input['description']) : '';
            $price = isset($input['price']) ? (float)$input['price'] : 0;
            $image = isset($input['image']) ? trim($input['image']) : '';

            if (!$title || !$description || $price <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Заповніть назву, опис та коректну ціну']);
                exit;
            }

            $sql = "
                UPDATE products
                SET title = :title,
                    description = :description,
                    price = :price,
                    image = :image
                WHERE id = :id
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'title'       => $title,
                'description' => $description,
                'price'       => $price,
                'image'       => $image,
                'id'          => $id
            ]);

            $stmt = $pdo->prepare("
                SELECT id, title, description, price, image
                FROM products
                WHERE id = :id
            ");
            $stmt->execute(['id' => $id]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$product) {
                http_response_code(404);
                echo json_encode(['error' => 'Товар не знайдено після оновлення']);
                exit;
            }

            echo json_encode($product);
            break;

        // =======================
        // DELETE: видалення товару
        // =======================
        case 'DELETE':
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Не вказано id товару']);
                exit;
            }

            $id = (int)$_GET['id'];

            $stmt = $pdo->prepare("DELETE FROM products WHERE id = :id");
            $stmt->execute(['id' => $id]);

            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Помилка сервера в products.php']);
    exit;
}