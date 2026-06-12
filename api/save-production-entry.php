<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
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

$input = json_decode(file_get_contents("php://input"), true);

if (!$input) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON payload"
    ]);
    exit;
}

$host = "187.127.139.144";
$dbname = "myapp";
$username = "myapp-user";
$password = "Akash@2005";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
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
    $target = (int)($input["target"] ?? 0);
    $actual = (int)($input["actual"] ?? 0);
    $good = (int)($input["good"] ?? 0);
    $reject = (int)($input["reject"] ?? 0);
    $lossTime = (int)($input["lossTime"] ?? 0);
    $remarks = trim($input["remarks"] ?? "");
    $clientCreatedAt = !empty($input["createdAt"]) ? date("Y-m-d H:i:s", strtotime($input["createdAt"])) : null;

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

    $entryId = $pdo->lastInsertId();

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
            $qty = (int)($item["qty"] ?? 0);

            if ($reason && $qty > 0) {
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
            $qty = (int)($item["qty"] ?? 0);
            $person = trim($item["person"] ?? "");
            $department = trim($item["department"] ?? "");

            if ($reason && $qty > 0 && $person) {
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
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}