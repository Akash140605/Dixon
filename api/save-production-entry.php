<?php
error_reporting(E_ALL);
ini_set("display_errors", "1");

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    echo json_encode([
        "success" => true,
        "message" => "Preflight OK"
    ]);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Only POST method allowed"
    ]);
    exit;
}

$rawInput = file_get_contents("php://input");
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON payload"
    ]);
    exit;
}

$host = getenv("DB_HOST") ?: "187.127.139.144";
$dbname = getenv("DB_NAME") ?: "myapp";
$username = getenv("DB_USER") ?: "myapp-user";
$password = getenv("DB_PASS") ?: "Akash@2005";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );

    $pdo->beginTransaction();

    $date = $input["date"] ?? null;
    $hall = trim($input["hall"] ?? "");
    $machineCode = trim($input["machineCode"] ?? "");
    $machineName = trim($input["machineName"] ?? "");
    $machineDisplayName = trim($input["machineDisplayName"] ?? "");
    $duration = trim($input["duration"] ?? "");
    $shift = trim($input["shift"] ?? "");
    $part = trim($input["part"] ?? "");
    $operatorId = trim($input["operatorId"] ?? "");
    $operator = trim($input["operator"] ?? "");
    $isNewOperator = !empty($input["isNewOperator"]) ? 1 : 0;
    $target = max(0, (int)($input["target"] ?? 0));
    $actual = max(0, (int)($input["actual"] ?? 0));
    $good = max(0, (int)($input["good"] ?? 0));
    $reject = max(0, (int)($input["reject"] ?? 0));
    $lossTime = max(0, (int)($input["lossTime"] ?? 0));
    $remarks = trim($input["remarks"] ?? "");

    $clientCreatedAt = null;
    if (!empty($input["createdAt"])) {
        $timestamp = strtotime($input["createdAt"]);
        if ($timestamp !== false) {
            $clientCreatedAt = date("Y-m-d H:i:s", $timestamp);
        }
    }

    if (!$date || !$hall || !$machineCode || !$shift || !$part || !$operatorId || !$operator) {
        throw new Exception("Required fields missing");
    }

    $stmt = $pdo->prepare("
        INSERT INTO production_entries (
            entry_date,
            hall,
            machine_code,
            machine_name,
            machine_display_name,
            duration,
            shift_name,
            part_name,
            operator_id,
            operator_name,
            is_new_operator,
            target_qty,
            actual_qty,
            good_qty,
            reject_qty,
            loss_time_qty,
            remarks,
            client_created_at
        ) VALUES (
            :entry_date,
            :hall,
            :machine_code,
            :machine_name,
            :machine_display_name,
            :duration,
            :shift_name,
            :part_name,
            :operator_id,
            :operator_name,
            :is_new_operator,
            :target_qty,
            :actual_qty,
            :good_qty,
            :reject_qty,
            :loss_time_qty,
            :remarks,
            :client_created_at
        )
    ");

    $stmt->execute([
        ":entry_date" => $date,
        ":hall" => $hall,
        ":machine_code" => $machineCode,
        ":machine_name" => $machineName,
        ":machine_display_name" => $machineDisplayName,
        ":duration" => $duration,
        ":shift_name" => $shift,
        ":part_name" => $part,
        ":operator_id" => $operatorId,
        ":operator_name" => $operator,
        ":is_new_operator" => $isNewOperator,
        ":target_qty" => $target,
        ":actual_qty" => $actual,
        ":good_qty" => $good,
        ":reject_qty" => $reject,
        ":loss_time_qty" => $lossTime,
        ":remarks" => $remarks,
        ":client_created_at" => $clientCreatedAt
    ]);

    $entryId = (int)$pdo->lastInsertId();

    $rejectBreakdown = is_array($input["rejectBreakdown"] ?? null) ? $input["rejectBreakdown"] : [];
    if (!empty($rejectBreakdown)) {
        $rejectStmt = $pdo->prepare("
            INSERT INTO production_reject_breakdown (
                production_entry_id,
                reason_name,
                qty
            ) VALUES (
                :production_entry_id,
                :reason_name,
                :qty
            )
        ");

        foreach ($rejectBreakdown as $item) {
            $reason = trim($item["reason"] ?? "");
            $qty = max(0, (int)($item["qty"] ?? 0));

            if ($reason !== "" && $qty > 0) {
                $rejectStmt->execute([
                    ":production_entry_id" => $entryId,
                    ":reason_name" => $reason,
                    ":qty" => $qty
                ]);
            }
        }
    }

    $lossTimeBreakdown = is_array($input["lossTimeBreakdown"] ?? null) ? $input["lossTimeBreakdown"] : [];
    if (!empty($lossTimeBreakdown)) {
        $lossStmt = $pdo->prepare("
            INSERT INTO production_loss_time_breakdown (
                production_entry_id,
                reason_name,
                qty,
                person_name,
                department_name
            ) VALUES (
                :production_entry_id,
                :reason_name,
                :qty,
                :person_name,
                :department_name
            )
        ");

        foreach ($lossTimeBreakdown as $item) {
            $reason = trim($item["reason"] ?? "");
            $qty = max(0, (int)($item["qty"] ?? 0));
            $person = trim($item["person"] ?? "");
            $department = trim($item["department"] ?? "");

            if ($reason !== "" && $qty > 0 && $person !== "") {
                $lossStmt->execute([
                    ":production_entry_id" => $entryId,
                    ":reason_name" => $reason,
                    ":qty" => $qty,
                    ":person_name" => $person,
                    ":department_name" => $department
                ]);
            }
        }
    }

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" => "Production entry saved successfully",
        "entryId" => $entryId
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}