<?php
require_once "cors.php";
require_once "config.php";
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
$rows = $conn->query("SELECT * FROM parts ORDER BY part_name")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode(["success" => true, "count" => count($rows), "data" => $rows], JSON_UNESCAPED_UNICODE);
