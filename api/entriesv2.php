<?php
require_once "cors.php";
require_once "config.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

if ($method === "OPTIONS") {
    http_response_code(200);
    exit;
}

function sendJson($statusCode, $payload) {
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonInput() {
    $raw = file_get_contents("php://input");

    if ($raw === false || trim($raw) === "") {
        return [];
    }

    $data = json_decode($raw, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJson(400, [
            "success" => false,
            "message" => "Invalid JSON payload"
        ]);
    }

    return is_array($data) ? $data : [];
}

function cleanText($value) {
    return trim((string)($value ?? ""));
}

function cleanNullableText($value) {
    $text = trim((string)($value ?? ""));
    return $text === "" ? null : $text;
}

function cleanNumber($value, $default = 0) {
    if ($value === null || $value === "") {
        return $default;
    }

    return is_numeric($value) ? $value + 0 : $default;
}

function cleanBoolean($value) {
    return !empty($value) ? 1 : 0;
}

function cleanJsonArray($value) {
    if (is_string($value)) {
        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }
        return [];
    }

    return is_array($value) ? $value : [];
}

function isValidDateValue($date) {
    if ($date === "") {
        return false;
    }

    $dt = DateTime::createFromFormat("Y-m-d", $date);
    return $dt && $dt->format("Y-m-d") === $date;
}

function normalizeShift($shift) {
    $value = strtolower(cleanText($shift));

    if ($value === "a" || $value === "shift a") return "Shift A";
    if ($value === "b" || $value === "shift b") return "Shift B";
    if ($value === "c" || $value === "shift c") return "Shift C";

    return cleanText($shift);
}

function normalizeEntryInput($input) {
    $rejectBreakdown = cleanJsonArray($input["rejectBreakdown"] ?? []);
    $lossTimeBreakdown = cleanJsonArray($input["lossTimeBreakdown"] ?? []);
    $responsibilities = cleanJsonArray($input["responsibilities"] ?? []);

    $actual = cleanNumber($input["actual"] ?? 0, 0);
    $reject = cleanNumber($input["reject"] ?? 0, 0);
    $target = cleanNumber($input["target"] ?? 0, 0);

    $good = cleanNumber($input["good"] ?? max($actual - $reject, 0), 0);
    $lossTime = cleanNumber($input["lossTime"] ?? max($target - $actual, 0), 0);
    $lossTimeMinutes = cleanNumber(
        $input["lossTimeMinutes"] ?? $input["lossMinutes"] ?? 0,
        0
    );

    return [
        "entryId" => cleanNullableText($input["entryId"] ?? ""),
        "hall" => cleanText($input["hall"] ?? ""),
        "machine" => cleanNullableText($input["machine"] ?? ""),
        "machineCode" => cleanText($input["machineCode"] ?? ""),
        "machineName" => cleanNullableText($input["machineName"] ?? ""),
        "machineDisplayName" => cleanNullableText($input["machineDisplayName"] ?? ""),
        "date" => cleanText($input["date"] ?? ""),
        "shift" => normalizeShift($input["shift"] ?? ""),
        "shiftLabel" => cleanNullableText($input["shiftLabel"] ?? ""),
        "hour" => cleanNullableText($input["hour"] ?? ""),
        "duration" => cleanText($input["duration"] ?? $input["hour"] ?? ""),
        "operatorId" => cleanNullableText($input["operatorId"] ?? ""),
        "operator" => cleanNullableText($input["operator"] ?? ""),
        "part" => cleanNullableText($input["part"] ?? ""),
        "partNumber" => cleanNullableText($input["partNumber"] ?? ""),
"partCategory" => cleanNullableText($input["partCategory"] ?? ""),

"standardCycleTime" => cleanNumber($input["standardCycleTime"] ?? 0, 0),
"actualCycleTime" => cleanNumber($input["actualCycleTime"] ?? 0, 0),
        "target" => $target,
        "actual" => $actual,
        "good" => $good,
        "reject" => $reject,
        "lossTime" => $lossTime,
        "lossTimeMinutes" => $lossTimeMinutes,
        "rejectReason" => cleanNullableText($input["rejectReason"] ?? ""),
        "rejectBreakdown" => $rejectBreakdown,
        "lossTimeBreakdown" => $lossTimeBreakdown,
        "responsibilities" => $responsibilities,
        "remarks" => cleanNullableText($input["remarks"] ?? ""),
        "isNewOperator" => cleanBoolean($input["isNewOperator"] ?? 0),
        "createdAt" => cleanNullableText($input["createdAt"] ?? ""),
        "updatedAt" => cleanNullableText($input["updatedAt"] ?? ""),
    ];
}

function validateEntry($entry) {
    $errors = [];

    if ($entry["hall"] === "") $errors[] = "Hall is required";
    if ($entry["machineCode"] === "") $errors[] = "Machine code is required";
    if ($entry["date"] === "") $errors[] = "Date is required";
    if ($entry["shift"] === "") $errors[] = "Shift is required";
    if ($entry["duration"] === "") $errors[] = "Duration is required";

    if ($entry["date"] !== "" && !isValidDateValue($entry["date"])) {
        $errors[] = "Date must be in YYYY-MM-DD format";
    }

    if (!in_array($entry["shift"], ["Shift A", "Shift B", "Shift C"], true)) {
        $errors[] = "Shift must be Shift A, Shift B or Shift C";
    }

    if ($entry["target"] < 0) $errors[] = "Target cannot be negative";
    if ($entry["actual"] < 0) $errors[] = "Actual cannot be negative";
    if ($entry["good"] < 0) $errors[] = "Good cannot be negative";
    if ($entry["reject"] < 0) $errors[] = "Reject cannot be negative";
    if ($entry["lossTime"] < 0) $errors[] = "Loss time cannot be negative";
    if ($entry["lossTimeMinutes"] < 0) $errors[] = "Loss time minutes cannot be negative";

    if ($entry["good"] > $entry["actual"]) {
        $errors[] = "Good quantity cannot be greater than actual quantity";
    }

    if ($entry["reject"] > $entry["actual"]) {
        $errors[] = "Reject quantity cannot be greater than actual quantity";
    }

    return $errors;
}

function decodeRowJsonFields($row) {
    if (!$row) return null;

    $row["rejectBreakdown"] = json_decode($row["rejectBreakdown"] ?? "[]", true) ?: [];
    $row["lossTimeBreakdown"] = json_decode($row["lossTimeBreakdown"] ?? "[]", true) ?: [];
    $row["responsibilities"] = json_decode($row["responsibilities"] ?? "[]", true) ?: [];

    return $row;
}

function getEntryById($conn, $id) {
    $stmt = $conn->prepare("SELECT * FROM production_entries_v2 WHERE id = :id LIMIT 1");
    $stmt->execute([":id" => $id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return decodeRowJsonFields($row);
}

try {
    if ($method === "GET") {
        $id = isset($_GET["id"]) ? (int)$_GET["id"] : 0;

        if ($id > 0) {
            $row = getEntryById($conn, $id);

            if (!$row) {
                sendJson(404, [
                    "success" => false,
                    "message" => "Entry not found"
                ]);
            }

            sendJson(200, [
                "success" => true,
                "data" => $row
            ]);
        }

        $sql = "SELECT * FROM production_entries_v2 ORDER BY date DESC, id DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $rows = array_map("decodeRowJsonFields", $rows);

        sendJson(200, [
            "success" => true,
            "count" => count($rows),
            "data" => $rows
        ]);
    }

    if ($method === "POST") {
        $input = getJsonInput();
        $entry = normalizeEntryInput($input);
        $errors = validateEntry($entry);

        if (!empty($errors)) {
            sendJson(422, [
                "success" => false,
                "message" => "Validation failed",
                "errors" => $errors
            ]);
        }

        $now = date("Y-m-d H:i:s");
        $createdAt = $entry["createdAt"] ?: $now;
        $updatedAt = $entry["updatedAt"] ?: $now;

        $sql = "INSERT INTO production_entries_v2 (
            entryId,
            hall,
            machine,
            machineCode,
            machineName,
            machineDisplayName,
            date,
            shift,
            shiftLabel,
            hour,
            duration,
            operatorId,
            operator,
          part,
partNumber,
partCategory,
standardCycleTime,
actualCycleTime,
target,
actual,
            good,
            reject,
            lossTime,
            lossTimeMinutes,
            rejectReason,
            rejectBreakdown,
            lossTimeBreakdown,
            responsibilities,
            remarks,
            isNewOperator,
            createdAt,
            updatedAt
        ) VALUES (
            :entryId,
            :hall,
            :machine,
            :machineCode,
            :machineName,
            :machineDisplayName,
            :date,
            :shift,
            :shiftLabel,
            :hour,
            :duration,
            :operatorId,
            :operator,
          :part,
:partNumber,
:partCategory,
:standardCycleTime,
:actualCycleTime,
:target,
:actual,
            :good,
            :reject,
            :lossTime,
            :lossTimeMinutes,
            :rejectReason,
            :rejectBreakdown,
            :lossTimeBreakdown,
            :responsibilities,
            :remarks,
            :isNewOperator,
            :createdAt,
            :updatedAt
        )";

        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ":entryId" => $entry["entryId"],
            ":hall" => $entry["hall"],
            ":machine" => $entry["machine"],
            ":machineCode" => $entry["machineCode"],
            ":machineName" => $entry["machineName"],
            ":machineDisplayName" => $entry["machineDisplayName"],
            ":date" => $entry["date"],
            ":shift" => $entry["shift"],
            ":shiftLabel" => $entry["shiftLabel"],
            ":hour" => $entry["hour"],
            ":duration" => $entry["duration"],
            ":operatorId" => $entry["operatorId"],
            ":operator" => $entry["operator"],
       ":part" => $entry["part"],

":partNumber" => $entry["partNumber"],
":partCategory" => $entry["partCategory"],

":standardCycleTime" => $entry["standardCycleTime"],
":actualCycleTime" => $entry["actualCycleTime"],

":target" => $entry["target"],
":actual" => $entry["actual"],
":good" => $entry["good"],
":reject" => $entry["reject"],
            ":lossTime" => $entry["lossTime"],
            ":lossTimeMinutes" => $entry["lossTimeMinutes"],
            ":rejectReason" => $entry["rejectReason"],
            ":rejectBreakdown" => json_encode($entry["rejectBreakdown"], JSON_UNESCAPED_UNICODE),
            ":lossTimeBreakdown" => json_encode($entry["lossTimeBreakdown"], JSON_UNESCAPED_UNICODE),
            ":responsibilities" => json_encode($entry["responsibilities"], JSON_UNESCAPED_UNICODE),
            ":remarks" => $entry["remarks"],
            ":isNewOperator" => $entry["isNewOperator"],
            ":createdAt" => $createdAt,
            ":updatedAt" => $updatedAt
        ]);

        $newId = (int)$conn->lastInsertId();
        $createdRow = getEntryById($conn, $newId);

        sendJson(201, [
            "success" => true,
            "message" => "Entry created successfully",
            "data" => $createdRow
        ]);
    }

    if ($method === "PUT") {
        $input = getJsonInput();
        $id = isset($input["id"]) ? (int)$input["id"] : 0;

        if ($id <= 0) {
            sendJson(400, [
                "success" => false,
                "message" => "Valid entry ID is required"
            ]);
        }

        $existing = getEntryById($conn, $id);

        if (!$existing) {
            sendJson(404, [
                "success" => false,
                "message" => "Entry not found"
            ]);
        }

        $entry = normalizeEntryInput($input);
        $errors = validateEntry($entry);

        if (!empty($errors)) {
            sendJson(422, [
                "success" => false,
                "message" => "Validation failed",
                "errors" => $errors
            ]);
        }

        $createdAt = !empty($entry["createdAt"]) ? $entry["createdAt"] : ($existing["createdAt"] ?? date("Y-m-d H:i:s"));
        $updatedAt = date("Y-m-d H:i:s");

        $sql = "UPDATE production_entries_v2 SET
            entryId = :entryId,
            hall = :hall,
            machine = :machine,
            machineCode = :machineCode,
            machineName = :machineName,
            machineDisplayName = :machineDisplayName,
            date = :date,
            shift = :shift,
            shiftLabel = :shiftLabel,
            hour = :hour,
            duration = :duration,
            operatorId = :operatorId,
            operator = :operator,
            part = :part,
partNumber = :partNumber,
partCategory = :partCategory,
standardCycleTime = :standardCycleTime,
actualCycleTime = :actualCycleTime,
target = :target,
            actual = :actual,
            good = :good,
            reject = :reject,
            lossTime = :lossTime,
            lossTimeMinutes = :lossTimeMinutes,
            rejectReason = :rejectReason,
            rejectBreakdown = :rejectBreakdown,
            lossTimeBreakdown = :lossTimeBreakdown,
            responsibilities = :responsibilities,
            remarks = :remarks,
            isNewOperator = :isNewOperator,
            createdAt = :createdAt,
            updatedAt = :updatedAt
            WHERE id = :id";

        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ":entryId" => $entry["entryId"],
            ":hall" => $entry["hall"],
            ":machine" => $entry["machine"],
            ":machineCode" => $entry["machineCode"],
            ":machineName" => $entry["machineName"],
            ":machineDisplayName" => $entry["machineDisplayName"],
            ":date" => $entry["date"],
            ":shift" => $entry["shift"],
            ":shiftLabel" => $entry["shiftLabel"],
            ":hour" => $entry["hour"],
            ":duration" => $entry["duration"],
            ":operatorId" => $entry["operatorId"],
            ":operator" => $entry["operator"],
            ":part" => $entry["part"],

":partNumber" => $entry["partNumber"],
":partCategory" => $entry["partCategory"],

":standardCycleTime" => $entry["standardCycleTime"],
":actualCycleTime" => $entry["actualCycleTime"],

":target" => $entry["target"],
            ":actual" => $entry["actual"],
            ":good" => $entry["good"],
            ":reject" => $entry["reject"],
            ":lossTime" => $entry["lossTime"],
            ":lossTimeMinutes" => $entry["lossTimeMinutes"],
            ":rejectReason" => $entry["rejectReason"],
            ":rejectBreakdown" => json_encode($entry["rejectBreakdown"], JSON_UNESCAPED_UNICODE),
            ":lossTimeBreakdown" => json_encode($entry["lossTimeBreakdown"], JSON_UNESCAPED_UNICODE),
            ":responsibilities" => json_encode($entry["responsibilities"], JSON_UNESCAPED_UNICODE),
            ":remarks" => $entry["remarks"],
            ":isNewOperator" => $entry["isNewOperator"],
            ":createdAt" => $createdAt,
            ":updatedAt" => $updatedAt,
            ":id" => $id
        ]);

        $updatedRow = getEntryById($conn, $id);

        sendJson(200, [
            "success" => true,
            "message" => "Entry updated successfully",
            "data" => $updatedRow
        ]);
    }

    if ($method === "DELETE") {
        $input = getJsonInput();
        $id = 0;

        if (isset($_GET["id"])) {
            $id = (int)$_GET["id"];
        } elseif (isset($input["id"])) {
            $id = (int)$input["id"];
        }

        if ($id <= 0) {
            sendJson(400, [
                "success" => false,
                "message" => "Valid entry ID is required"
            ]);
        }

        $existing = getEntryById($conn, $id);

        if (!$existing) {
            sendJson(404, [
                "success" => false,
                "message" => "Entry not found"
            ]);
        }

        $stmt = $conn->prepare("DELETE FROM production_entries_v2 WHERE id = :id");
        $stmt->execute([":id" => $id]);

        sendJson(200, [
            "success" => true,
            "message" => "Entry deleted successfully",
            "deletedId" => $id
        ]);
    }

    sendJson(405, [
        "success" => false,
        "message" => "Method not allowed"
    ]);

} 
catch (PDOException $e) {
    sendJson(500, [
        "success" => false,
        "message" => $e->getMessage()
    ]);

} catch (Exception $e) {
    error_log("Production API General Error: " . $e->getMessage());

    sendJson(500, [
        "success" => false,
        "message" => "Server error"
    ]);
}