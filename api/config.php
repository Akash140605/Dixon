<?php
// Local database config: uses the same SQLite file the Node dev server creates
// (server/data/dixon.sqlite). Run `npm run dev` or `npm run db:reset` once to create it.
$dbPath = getenv("DIXON_DB_PATH") ?: __DIR__ . "/../server/data/dixon.sqlite";

try {
    $conn = new PDO("sqlite:" . $dbPath);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    header("Content-Type: application/json; charset=UTF-8");
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB connection failed: " . $e->getMessage()]);
    exit;
}
