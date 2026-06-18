import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./ProductionEntryForm.css";
import { halls, machineMap, durationSlots } from "../data/formData";
import { operatorMaster as importedOperatorMaster } from "../data/operatorDetails";

import { useProduction } from "../context/ProductionContext";

const STORAGE_KEYS = {
  FORM_DRAFT: "production-entry-form-draft",
  ENTRIES: "production-entries",
  OPERATORS: "production-operator-master",
};

const rejectReasonOptions = [
  "Short Moulding",
  "Silver Mark",
  "Black Spot",
  "Colour Change",
  "Colour Variation",
  "Warpage",
  "Flow Mark",
  "Cut Mark",
  "Shrinkage",
  "Missing",
  "Burn Mark",
  "Weld Line",
];

const lossTimeReasonOptions = [
  "Breakdown - Machine Breakdown",
  "Breakdown - Mould Breakdown",
  "Breakdown - Process Trouble",
  "Setup Adjustment - Mould Change",
  "Tool Change - Mould Polishing Cleaning",
  "Tool Change - Nozzle Change",
  "Tool Change - Insert Ejector Pin Slider Pin Spring Coupler Copper Electrode Change",
  "Start-up Loss - Shift Start Delay",
  "Minor Stoppages - Under 10 Min",
  "Speed Loss - Unskilled Manpower Actual Speed Low",
  "Defect Rework Loss",
  "Schedule Down Time - Planned Stoppage",
  "Management Loss - No Manpower",
  "Management Loss - No Power",
  "Management Loss - Raw Material Shortage",
  "Management Loss - Conveyor Stop",
  "Management Loss - Bin Trolly Short",
  "Operating Motion Loss",
  "Other",
];

const responsibilityMaster = [
  { name: "Jitendra", department: "Moulding" },
  { name: "Bholay", department: "Maintenance" },
  { name: "Bhupendar", department: "Moulding" },
  { name: "Haridas", department: "Tool Room" },
  { name: "Rajan", department: "Moulding" },
  { name: "Pushpendra", department: "Material" },
  { name: "Umesh", department: "Maintenance" },
  { name: "Srinath", department: "Moulding" },
  { name: "Kaushal", department: "Moulding" },
  { name: "Arjun", department: "Moulding" },
];

const sectionTabs = [
  { key: "production", label: "Production" },
  { key: "operator", label: "Operator" },
  { key: "metrics", label: "Metrics" },
  { key: "reject", label: "Reject" },
  { key: "loss", label: "Loss" },
  { key: "remarks", label: "Remarks" },
];

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getResponsibilityMatch(value) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return null;

  return (
    responsibilityMaster.find(
      (item) => normalizeText(item.name) === normalizedValue
    ) || null
  );
}

function getResponsibilitySuggestions(value) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return responsibilityMaster;

  return responsibilityMaster.filter((item) =>
    normalizeText(item.name).startsWith(normalizedValue)
  );
}

function getTodayDate() {
  const now = new Date();

  // 08:00 AM se pehle previous day count hoga
  if (now.getHours() < 8) {
    now.setDate(now.getDate() - 1);
  }

  const local = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );

  return local.toISOString().split("T")[0];
}

function convertTo24Hour(timeStr) {
  const value = String(timeStr || "").trim().toUpperCase();
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);

  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3];

  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours !== 12) hours += 12;

  return hours * 60 + minutes;
}

function getShiftByDuration(duration) {
  if (!duration) return "";

  const parts = String(duration).split("-");
  if (parts.length < 2) return "";

  const startMinutes = convertTo24Hour(parts[0].trim());

  if (startMinutes === null) return "";

  // Shift A = 08 AM - 08 PM
  if (startMinutes >= 8 * 60 && startMinutes < 20 * 60) {
    return "Shift A";
  }

  // Shift B = 08 PM - 08 AM
  return "Shift B";
}

function normalizeShiftValue(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) return "";

  if (raw === "a" || raw === "shift a") return "Shift A";
  if (raw === "b" || raw === "shift b") return "Shift B";

  return String(value || "").trim();
}

function findDurationByShift(shift) {
  const normalizedShift = normalizeShiftValue(shift);
  if (!normalizedShift) return "";

  return (
    durationSlots.find((slot) => getShiftByDuration(slot) === normalizedShift) ||
    ""
  );
}

function getNextDurationSlot(currentDuration) {
  if (!currentDuration) return durationSlots[0] || "";
  const currentIndex = durationSlots.findIndex(
    (slot) => String(slot).trim() === String(currentDuration).trim()
  );
  if (currentIndex === -1) return currentDuration;
  return durationSlots[currentIndex + 1] || durationSlots[0] || currentDuration;
}

function createRejectRow(reason) {
  return {
    id: createId(),
    reason,
    qty: "",
  };
}

function createRejectBreakdown() {
  return rejectReasonOptions.map((reason) => createRejectRow(reason));
}

function createLossTimeRow() {
  return {
    id: createId(),
    reason: "",
    qty: "",
    minutes: "",
    person: "",
    department: "",
  };
}

function getRejectBreakdownTotal(breakdown) {
  if (!Array.isArray(breakdown)) return 0;
  return breakdown.reduce((sum, item) => sum + Number(item?.qty || 0), 0);
}

function getLossTimeBreakdownTotal(rows) {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((sum, item) => sum + Number(item?.qty || 0), 0);
}

function calculateGood(actualValue, rejectValue) {
  const actual = Number(actualValue || 0);
  const reject = Number(rejectValue || 0);
  return actual - reject > 0 ? String(actual - reject) : "0";
}

function calculateTargetFromCycleTime(cycleTimeValue) {
  const cycleTime = Number(cycleTimeValue || 0);
  if (!cycleTime || cycleTime <= 0) return "";
  return String(Math.floor(3600 / cycleTime));
}

function calculateLossQuantity(targetValue, actualValue) {
  const target = Number(targetValue || 0);
  const actual = Number(actualValue || 0);
  return target - actual > 0 ? String(target - actual) : "0";
}

function calculateLossTimeMinutes(lossQtyValue, cycleTimeValue) {
  const lossQty = Number(lossQtyValue || 0);
  const cycleTime = Number(cycleTimeValue || 0);
  if (!lossQty || !cycleTime || cycleTime <= 0) return "0";
  return String(Math.round((lossQty * cycleTime) / 60));
}

function calculateMinutesFromQty(qtyValue, cycleTimeValue) {
  const qty = Number(qtyValue || 0);
  const cycleTime = Number(cycleTimeValue || 0);
  if (!qty || !cycleTime || cycleTime <= 0) return "";
  return String(Math.round((qty * cycleTime) / 60));
}

function isNonNegativeNumber(value) {
  if (value === "" || value === null || value === undefined) return true;
  return !Number.isNaN(Number(value)) && Number(value) >= 0;
}

function isPositiveNumber(value) {
  if (value === "" || value === null || value === undefined) return false;
  return !Number.isNaN(Number(value)) && Number(value) > 0;
}

function getInitialFormState() {
  return {
    entryId: "",
    date: getTodayDate(),
    hall: "",
    machine: "",
    machineCode: "",
    machineName: "",
    partNumber: "",
partCategory: "",

actualCycleTime: "",
    standardCycleTime: "",
    machineDisplayName: "",
    duration: "",
    shift: "",
    part: "",
    partMode: "select",
    cycleTime: "",
    operatorId: "",
    operator: "",
    isNewOperator: false,
    isEditMode: false,
    target: "",
    actual: "",
    good: "",
    reject: "",
    lossTime: "",
    lossTimeMinutes: "",
    lossTimeBreakdown: [createLossTimeRow()],
    remarks: "",
    rejectBreakdown: createRejectBreakdown(),
    rejectReason: "",
  };
}

function getStoredJson(key, fallbackValue) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function setStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Failed to store", key, error);
  }
}

function normalizeRejectBreakdown(rejectBreakdown) {
  const baseRows = createRejectBreakdown();
  if (!Array.isArray(rejectBreakdown) || !rejectBreakdown.length) return baseRows;

  const existingMap = new Map(
    rejectBreakdown.map((item) => [String(item?.reason || "").trim(), item])
  );

  return baseRows.map((row) => {
    const matched = existingMap.get(row.reason);
    return {
      id: matched?.id || row.id,
      reason: row.reason,
      qty: matched?.qty === 0 ? "0" : matched?.qty ? String(matched.qty) : "",
    };
  });
}

function normalizeLossBreakdown(lossTimeBreakdown) {
  if (!Array.isArray(lossTimeBreakdown) || !lossTimeBreakdown.length) {
    return [createLossTimeRow()];
  }

  return lossTimeBreakdown.map((item) => ({
    id: item?.id || createId(),
    reason: typeof item?.reason === "string" ? item.reason : "",
    qty: item?.qty === 0 ? "0" : item?.qty ? String(item.qty) : "",
    minutes:
      item?.minutes === 0 ? "0" : item?.minutes ? String(item.minutes) : "",
    person: typeof item?.person === "string" ? item.person : "",
    department: typeof item?.department === "string" ? item.department : "",
  }));
}

function derivePartMode(partValue, cycleTimeValue, incomingPartMode) {
  if (incomingPartMode === "manual" || incomingPartMode === "select") {
    return incomingPartMode;
  }

  const normalizedPart = String(partValue || "").trim();
  const normalizedCycleTime = String(cycleTimeValue ?? "").trim();

if (!normalizedPart) return "select";
if (normalizedPart === "Other") return "manual";
if (normalizedCycleTime && normalizedCycleTime !== "0") return "select";
return "manual";
}

function mergeDraftWithDefaults(draft, options = {}) {
  const { forceTodayDate = false } = options;

  const rawPart =
    typeof draft?.part === "string"
      ? draft.part
      : typeof draft?.partName === "string"
        ? draft.partName
        : "";

  const rawCycleTime =
    typeof draft?.cycleTime === "string" || typeof draft?.cycleTime === "number"
      ? String(draft.cycleTime)
      : "";

  const knownPart = !!rawPart;

  const derivedPartMode =
    draft?.partMode === "manual" || draft?.partMode === "select"
      ? draft.partMode
      : rawPart === "Other" || (!knownPart && rawPart)
        ? "manual"
        : "select";

  return {
    ...getInitialFormState(),
    ...draft,
    date:
      forceTodayDate && !draft?.isEditMode
        ? getTodayDate()
        : typeof draft?.date === "string" && draft.date
          ? draft.date
          : getTodayDate(),
    entryId: typeof draft?.entryId === "string" ? draft.entryId : "",
    machine: typeof draft?.machine === "string" ? draft.machine : "",
    machineCode: typeof draft?.machineCode === "string" ? draft.machineCode : "",
    machineName: typeof draft?.machineName === "string" ? draft.machineName : "",
    machineDisplayName:
      typeof draft?.machineDisplayName === "string"
        ? draft.machineDisplayName
        : "",
    part: rawPart === "Other" ? "" : rawPart,
    partMode: derivedPartMode,
    cycleTime:
  derivedPartMode === "manual"
    ? rawCycleTime === "0"
      ? ""
      : rawCycleTime
    : rawCycleTime,
    isEditMode: Boolean(draft?.isEditMode),
    rejectBreakdown: normalizeRejectBreakdown(draft?.rejectBreakdown),
    lossTimeBreakdown: normalizeLossBreakdown(draft?.lossTimeBreakdown),
  };
}

function getFormValidationErrors(form) {
  const errors = {};

  const actual = Number(form.actual || 0);
  const reject = Number(form.reject || 0);
  const target = Number(form.target || 0);
  const lossTime = Math.max(target - actual, 0);

  const rejectBreakdownTotal = getRejectBreakdownTotal(
    form.rejectBreakdown
  );

  const lossTimeBreakdownTotal = getLossTimeBreakdownTotal(
    form.lossTimeBreakdown
  );

  if (form.target && !isNonNegativeNumber(form.target)) {
    errors.target = "Target quantity must be zero or greater.";
  }

  if (form.actual && !isNonNegativeNumber(form.actual)) {
    errors.actual = "Actual quantity must be zero or greater.";
  }

  if (
    form.partMode === "manual" &&
    form.cycleTime &&
    !isPositiveNumber(form.cycleTime)
  ) {
    errors.cycleTime = "Cycle time must be greater than zero.";
  }

  if (reject > actual) {
    errors.rejectBreakdown =
      "Total rejected quantity cannot exceed actual production.";
  }

  form.rejectBreakdown.forEach((item) => {
    const qty = Number(item.qty || 0);

    if (qty < 0) {
      errors[`rejectRow-${item.id}`] =
        "Rejected quantity must be zero or greater.";
    }
  });

  if (rejectBreakdownTotal !== reject) {
    errors.rejectBreakdown =
      `Rejection total ${rejectBreakdownTotal} must match derived reject quantity ${reject}.`;
  }

  // LOSS VALIDATION
  if (lossTime > 0) {

    const validLossRows = form.lossTimeBreakdown.filter((item) => {
      const matchedPerson = getResponsibilityMatch(item.person);

      return (
        item.reason &&
        Number(item.qty || 0) > 0 &&
        item.person &&
        matchedPerson
      );
    });

    // No loss row entered
    if (validLossRows.length === 0) {
      errors.lossTimeBreakdown =
        "Loss quantity exists. Please enter loss details.";
    }

    // Total mismatch
    if (lossTimeBreakdownTotal !== lossTime) {
      errors.lossTimeBreakdown =
        `Loss breakdown total is ${lossTimeBreakdownTotal}. It must match production loss quantity ${lossTime}.`;
    }
  }

  form.lossTimeBreakdown.forEach((item) => {
    const matchedPerson = getResponsibilityMatch(item.person);

    const hasPartialData =
      item.reason ||
      Number(item.qty || 0) > 0 ||
      item.person ||
      item.department;

    if (
      hasPartialData &&
      (
        !item.reason ||
        Number(item.qty || 0) <= 0 ||
        !item.person ||
        !matchedPerson
      )
    ) {
      errors[`lossRow-${item.id}`] =
        "Enter a valid reason, quantity, and responsible person.";
    }
  });

  return errors;
}

function sanitizeRejectBreakdown(rows, rejectQty) {
  if (rejectQty <= 0) return [];
  return rows
    .map((item) => ({
      id: item.id || createId(),
      reason: String(item.reason || "").trim(),
      qty: Number(item.qty || 0),
    }))
    .filter((item) => item.reason && item.qty > 0);
}

function sanitizeLossTimeBreakdown(rows, cycleTime) {
  return rows
  .map((item) => {
    const matchedPerson = getResponsibilityMatch(item.person);
    const qty = Number(item.qty || 0);
    const minutes =
      qty > 0
        ? Number(calculateMinutesFromQty(qty, cycleTime))
        : Number(item.minutes || 0);

    return {
      id: item.id || createId(),
      reason: String(item.reason || "").trim(),
      qty,
      minutes,
        person: matchedPerson
          ? matchedPerson.name
          : String(item.person || "").trim(),
        department: matchedPerson
          ? matchedPerson.department
          : String(item.department || "").trim(),
      };
    })
    .filter(
      (item) => item.reason && item.qty > 0 && item.person && item.department
    );
}

function normalizeEntryKeyPart(value) {
  return String(value || "").trim().toLowerCase();
}

function isSameEntrySlot(entry, form) {
  const entryDuration = String(entry.duration || entry.hour || "").trim();
  const formDuration = String(form.duration || "").trim();

  return (
    normalizeEntryKeyPart(entry.hall) === normalizeEntryKeyPart(form.hall) &&
    normalizeEntryKeyPart(entry.machineCode || entry.machine) ===
      normalizeEntryKeyPart(form.machineCode || form.machine) &&
    normalizeEntryKeyPart(entry.date) === normalizeEntryKeyPart(form.date) &&
    normalizeEntryKeyPart(normalizeShiftValue(entry.shift)) ===
      normalizeEntryKeyPart(normalizeShiftValue(form.shift)) &&
    normalizeEntryKeyPart(entryDuration) === normalizeEntryKeyPart(formDuration)
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="section-head">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="field-wrap">
      <label className="field-label">{label}</label>
      {children}
      {error ? <p className="inline-error">{error}</p> : null}
    </div>
  );
}

function SummaryCell({ label, value, danger = false }) {
  return (
    <div className={`summary-cell ${danger ? "summary-cell-danger" : ""}`}>
      <p className="summary-label">{label}</p>
      <p className="summary-value">{value}</p>
    </div>
  );
}

function MetricBox({
  label,
  value,
  danger = false,
  editable = false,
  children,
}) {
  return (
    <div className={`metric-box ${danger ? "metric-box-danger" : ""}`}>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {editable ? <div className="metric-input">{children}</div> : null}
    </div>
  );
}

function PanelStat({ label, value, tone }) {
  return (
    <div className={`panel-stat ${tone ? `panel-stat-${tone}` : ""}`}>
      <p className="panel-stat-label">{label}</p>
      <p className="panel-stat-value">{value}</p>
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast?.show) return null;

  return (
    <div
      className={`app-toast ${toast.type === "error" ? "app-toast-error" : ""}`}
    >
      <div className="app-toast-copy">
        <p className="app-toast-title">{toast.title}</p>
        {toast.message ? (
          <p className="app-toast-message">{toast.message}</p>
        ) : null}
      </div>
      <button type="button" className="app-toast-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

export default function ProductionEntryForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const productionContext = useProduction();

  const sectionRefs = {
    production: useRef(null),
    operator: useRef(null),
    metrics: useRef(null),
    reject: useRef(null),
    loss: useRef(null),
    remarks: useRef(null),
  };

  const [partsData, setPartsData] = useState([]);
const [partsMap, setPartsMap] = useState({});
useEffect(() => {
  const loadParts = async () => {
    try {
      const res = await fetch(
        "https://kushalyouth.com/api/get_parts.php"
      );

      const result = await res.json();

      if (result.success) {
        setPartsData(result.data);

        const map = {};

        result.data.forEach((item) => {
        map[item.part_name] = {
  cycleTime: item.cycle_time,
  partNumber: item.part_number,
  category: item.prod_cat,
  machine: item.machine,
};
        });

        setPartsMap(map);
      }
    } catch (err) {
      console.error("Part API Error", err);
    }
  };

  loadParts();
}, []);
  const [activeTab, setActiveTab] = useState("production");
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
  };

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const [operatorMaster, setOperatorMaster] = useState(() => {
    const storedOperators = getStoredJson(STORAGE_KEYS.OPERATORS, []);
    return storedOperators.length ? storedOperators : importedOperatorMaster;
  });

  const routePrefill = useMemo(() => {
    const state = location.state?.prefillFromMachineDetails
      ? location.state
      : null;
    if (!state) return null;

    const resolveHallValue = (incomingHall) => {
      const raw = String(incomingHall || "").trim().toLowerCase();
      if (!raw) return "";

      const matchedHall = halls.find(
        (hall) => String(hall).trim().toLowerCase() === raw
      );
      if (matchedHall) return matchedHall;

      if (raw === "hall-1" || raw === "h1") return "Hall 1";
      if (raw === "hall-2" || raw === "h2") return "Hall 2";
      if (raw === "hall-3" || raw === "h3") return "Hall 3";
      if (raw === "hall-4" || raw === "h4") return "Hall 4";
      if (raw === "c8") return "C8";

      return incomingHall || "";
    };

    const normalizedShift = normalizeShiftValue(state.shift);
    const derivedDuration =
      state.duration || findDurationByShift(normalizedShift);

    const rawPart = state.part || "";
    const rawCycleTime =
      state.cycleTime ?? state.partCycleTime ?? "";
    const partMode = derivePartMode(rawPart, rawCycleTime, state.partMode);

    return {
      entryId: state.rowId || state.entryId || "",
      date: state.isEditMode ? state.date || getTodayDate() : getTodayDate(),
      hall: resolveHallValue(state.hall),
      machine: state.machineCode || state.machine || "",
      machineCode: state.machineCode || state.machine || "",
      machineName: state.machineName || "",
      machineDisplayName: state.machineDisplayName || state.machineName || "",
      duration: derivedDuration,
      shift: normalizedShift || getShiftByDuration(derivedDuration),
      part: partMode === "manual" && rawPart === "Other" ? "" : rawPart,
      partMode,
      cycleTime:
        partMode === "manual"
          ? String(rawCycleTime || "").trim() === "0"
            ? ""
            : String(rawCycleTime || "")
         : rawPart && partsMap[rawPart]
  ? String(partsMap[rawPart]?.cycleTime || "")
  : "",
      operatorId: state.operatorId || "",
      operator: state.operator || "",
      actual:
        state.actual === 0 ? "0" : state.actual ? String(state.actual) : "",
      target:
        state.target === 0 ? "0" : state.target ? String(state.target) : "",
      good: state.good === 0 ? "0" : state.good ? String(state.good) : "",
      reject:
        state.reject === 0 ? "0" : state.reject ? String(state.reject) : "",
      lossTime:
        state.lossTime === 0
          ? "0"
          : state.lossTime
            ? String(state.lossTime)
            : "",
      lossTimeMinutes:
        state.lossMinutes === 0 || state.lossTimeMinutes === 0
          ? "0"
          : state.lossMinutes || state.lossTimeMinutes
            ? String(state.lossMinutes ?? state.lossTimeMinutes)
            : "",
      remarks: state.remarks || "",
      rejectBreakdown: state.rejectBreakdown,
      lossTimeBreakdown: state.lossTimeBreakdown,
      isEditMode: Boolean(state.isEditMode),
      prefillFromMachineDetails: true,
    };
  }, [location.state]);

  const [form, setForm] = useState(() => {
    const savedDraft = getStoredJson(STORAGE_KEYS.FORM_DRAFT, null);
    return savedDraft
      ? mergeDraftWithDefaults(savedDraft, { forceTodayDate: true })
      : getInitialFormState();
  });

  const addProductionEntry =
    productionContext &&
    typeof productionContext.addProductionEntry === "function"
      ? productionContext.addProductionEntry
      : null;

const syncDerivedValues = (draft) => {
  const normalizedRejectBreakdown = normalizeRejectBreakdown(
    draft.rejectBreakdown
  );

  const reject = draft.isEditMode
    ? draft.reject !== ""
      ? String(Number(draft.reject || 0))
      : String(getRejectBreakdownTotal(normalizedRejectBreakdown))
    : String(getRejectBreakdownTotal(normalizedRejectBreakdown));

const knownPart = !!partsMap[draft.part];
const safePartMode =
  draft.partMode || (knownPart ? "select" : "manual");

const actualCycleTime =
  String(draft.actualCycleTime ?? "");

const standardCycleTime =
  knownPart
    ? String(partsMap[draft.part]?.cycleTime || "")
    : String(draft.standardCycleTime ?? "");

const target =
  standardCycleTime
    ? calculateTargetFromCycleTime(standardCycleTime)
    : "";
  const good = calculateGood(draft.actual, reject);
  const lossTime = calculateLossQuantity(target, draft.actual);
const lossTimeMinutes =
  calculateLossTimeMinutes(
    lossTime,
    standardCycleTime
  );
  const safeLossRows = Array.isArray(draft.lossTimeBreakdown)
    ? draft.lossTimeBreakdown
    : [createLossTimeRow()];
const resolvedPartNumber =
  knownPart
    ? partsMap[draft.part]?.partNumber || ""
    : draft.partNumber || "";

const resolvedPartCategory =
  knownPart
    ? partsMap[draft.part]?.category || ""
    : draft.partCategory || "";
 const normalizedLossRows =
  Number(lossTime) > 0
    ? normalizeLossBreakdown(
        safeLossRows.map((item) => ({
          ...item,
        minutes: calculateMinutesFromQty(
  item.qty,
  Number(standardCycleTime || 0)
),
        }))
      )
    : [createLossTimeRow()];
  return {
  ...draft,
  partNumber: resolvedPartNumber,
  partCategory: resolvedPartCategory,
  date: draft.isEditMode ? draft.date || getTodayDate() : getTodayDate(),

  partMode: safePartMode,

  standardCycleTime,
  actualCycleTime,

  target,
  reject,
  good,
  lossTime,
  lossTimeMinutes,

  rejectBreakdown: normalizedRejectBreakdown,
  lossTimeBreakdown: normalizedLossRows,
};}

  useEffect(() => {
    if (!routePrefill) {
      setForm((prev) => {
        if (prev.isEditMode) return prev;
        if (prev.date === getTodayDate()) return prev;
        return { ...prev, date: getTodayDate() };
      });
      return;
    }

    setForm(() => {
      const merged = mergeDraftWithDefaults(
        {
          ...getInitialFormState(),
          ...routePrefill,
        },
        { forceTodayDate: !routePrefill.isEditMode }
      );

      const hallMachines = merged.hall ? machineMap[merged.hall] || [] : [];
      const matchedMachine =
        hallMachines.find((item) => item.code === merged.machineCode) ||
        hallMachines.find((item) => item.code === merged.machine) ||
        hallMachines.find(
          (item) =>
            String(item.name || "").trim().toLowerCase() ===
              String(merged.machineName || "").trim().toLowerCase() ||
            String(item.displayName || "").trim().toLowerCase() ===
              String(merged.machineDisplayName || "").trim().toLowerCase()
        ) ||
        null;

      const normalizedMerged = {
        ...merged,
        machine: matchedMachine?.code || merged.machine,
        machineCode: matchedMachine?.code || merged.machineCode,
        machineName: matchedMachine?.name || merged.machineName,
        machineDisplayName:
          matchedMachine?.displayName || merged.machineDisplayName,
      };

      return syncDerivedValues(normalizedMerged);
    });
  }, [routePrefill]);

  useEffect(() => {
    if (form.isEditMode) {
      setStoredJson(STORAGE_KEYS.FORM_DRAFT, form);
      return;
    }

    setStoredJson(STORAGE_KEYS.FORM_DRAFT, {
      ...form,
      date: getTodayDate(),
    });
  }, [form]);

  useEffect(() => {
    setStoredJson(STORAGE_KEYS.OPERATORS, operatorMaster);
  }, [operatorMaster]);

  useEffect(() => {
    const handleScroll = () => {
      const offset = 160;
      let current = "production";

      for (const tab of sectionTabs) {
        const element = sectionRefs[tab.key]?.current;
        if (!element) continue;
        const top = element.getBoundingClientRect().top;
        if (top - offset <= 0) current = tab.key;
      }

      setActiveTab(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setForm((prev) => {
        if (prev.isEditMode) return prev;
        const today = getTodayDate();
        if (prev.date === today) return prev;
        return { ...prev, date: today };
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const machineOptions = useMemo(() => {
    return form.hall ? machineMap[form.hall] || [] : [];
  }, [form.hall]);
const selectedMachineTonnage = useMemo(() => {
  if (!form.machineName) return "";

  const match = form.machineName.match(/(\d+)\s*T/i);

  return match ? `${match[1]}T` : "";
}, [form.machineName]);

const filteredPartsData = useMemo(() => {
  if (!selectedMachineTonnage) return [];

  return partsData.filter(
    (part) =>
      String(part.machine || "")
        .replace(/\s+/g, "")
        .toUpperCase() ===
      selectedMachineTonnage.replace(/\s+/g, "").toUpperCase()
  );
}, [partsData, selectedMachineTonnage]);
  const existingEntries = useMemo(() => {
    return getStoredJson(STORAGE_KEYS.ENTRIES, []);
  }, [form.entryId]);

  const validationErrors = useMemo(() => getFormValidationErrors(form), [form]);

  const rejectQty = Number(form.reject || 0);
  const lossQty = Number(form.lossTime || 0);
  const rejectBreakdownTotal = getRejectBreakdownTotal(form.rejectBreakdown);
  const rejectDifference = rejectQty - rejectBreakdownTotal;
  const lossTimeBreakdownTotal = getLossTimeBreakdownTotal(
    form.lossTimeBreakdown
  );
  const lossTimeDifference = lossQty - lossTimeBreakdownTotal;

  const showLossTimeFields = lossQty > 0;
  const showRejectBreakdown = true;
  const showNewOperatorNameField = form.isNewOperator;

  const matchingExistingEntry = useMemo(() => {
    return (
      existingEntries.find((entry) => {
        if (!isSameEntrySlot(entry, form)) return false;
        if (form.entryId && entry.entryId === form.entryId) return false;
        return true;
      }) || null
    );
  }, [existingEntries, form]);

  const getFieldClassName = (error, readOnly = false) =>
    `field ${readOnly ? "field-readonly" : ""} ${error ? "field-error" : ""}`;

  const scrollToSection = (key) => {
    sectionRefs[key]?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const clearRouteState = () => {
    navigate(location.pathname, { replace: true, state: null });
  };

const handlePartChange = (e) => {
  const value = e.target.value;

  if (value === "manual") {
    setForm((prev) =>
      syncDerivedValues({
        ...prev,
        date: prev.isEditMode ? prev.date : getTodayDate(),
        partMode: "manual",
        part: "",
        cycleTime: "",
        target: "",
        lossTime: "",
        lossTimeMinutes: "",
        lossTimeBreakdown: [createLossTimeRow()],
      })
    );
    return;
  }

const selectedPart = partsMap[value];

setForm((prev) =>
  syncDerivedValues({
    ...prev,

    date: prev.isEditMode ? prev.date : getTodayDate(),

    partMode: "select",
    part: value,

    partNumber: selectedPart?.partNumber || "",
    partCategory: selectedPart?.category || "",

    standardCycleTime: selectedPart?.cycleTime || "",
    actualCycleTime: selectedPart?.cycleTime || "",

    target: "",
    lossTime: "",
    lossTimeMinutes: "",
    lossTimeBreakdown: [createLossTimeRow()],
  })
);
};

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "hall") {
      setForm((prev) =>
        syncDerivedValues({
          ...prev,
          date: prev.isEditMode ? prev.date : getTodayDate(),
          hall: value,
          machine: "",
          machineCode: "",
          machineName: "",
          machineDisplayName: "",
        })
      );
      return;
    }

  if (name === "machine") {
  setForm((prev) => {
    const hallMachines = prev.hall ? machineMap[prev.hall] || [] : [];

    const selectedMachine =
      hallMachines.find((item) => item.code === value) || null;

    return syncDerivedValues({
      ...prev,

      machine: selectedMachine?.code || value || "",
      machineCode: selectedMachine?.code || value || "",
      machineName: selectedMachine?.name || "",
      machineDisplayName: selectedMachine?.displayName || "",

      // reset part
      part: "",
      partNumber: "",
      partCategory: "",
      standardCycleTime: "",
      actualCycleTime: "",
    });
  });

  return;
}
    if (name === "duration") {
      setForm((prev) =>
        syncDerivedValues({
          ...prev,
          date: prev.isEditMode ? prev.date : getTodayDate(),
          duration: value,
          shift: getShiftByDuration(value),
        })
      );
      return;
    }

    if (name === "part") {
      setForm((prev) =>
        syncDerivedValues({
          ...prev,
          date: prev.isEditMode ? prev.date : getTodayDate(),
          part: value,
          partMode: "manual",
        })
      );
      return;
    }

    if (name === "cycleTime") {
      setForm((prev) =>
        syncDerivedValues({
          ...prev,
          date: prev.isEditMode ? prev.date : getTodayDate(),
          cycleTime: value,
        })
      );
      return;
    }
if (name === "standardCycleTime") {
  setForm((prev) =>
    syncDerivedValues({
      ...prev,
      standardCycleTime: value,
    })
  );

  return;
}
    if (name === "operatorId") {
      const cleanValue = value.toUpperCase().trim();
      const matchedOperator = operatorMaster.find(
        (item) =>
          String(item.operatorId || item.id || "").toUpperCase() === cleanValue
      );

      setForm((prev) => ({
        ...prev,
        date: prev.isEditMode ? prev.date : getTodayDate(),
        operatorId: cleanValue,
        operator: matchedOperator ? matchedOperator.name : "",
        isNewOperator: cleanValue ? !matchedOperator : false,
      }));
      return;
    }

    if (name === "actual") {
      setForm((prev) =>
        syncDerivedValues({
          ...prev,
          date: prev.isEditMode ? prev.date : getTodayDate(),
          actual: value,
        })
      );
      return;
    }

    setForm((prev) => ({
      ...prev,
      date: prev.isEditMode ? prev.date : getTodayDate(),
      [name]: value,
    }));
  };

  const handleRejectRowChange = (rowId, value) => {
    setForm((prev) =>
      syncDerivedValues({
        ...prev,
        date: prev.isEditMode ? prev.date : getTodayDate(),
        rejectBreakdown: prev.rejectBreakdown.map((item) => {
          if (item.id !== rowId) return item;
          const cleanValue = value ? String(Math.max(0, Number(value))) : "";
          return { ...item, qty: cleanValue };
        }),
      })
    );
  };

  const handleLossTimeRowChange = (rowId, field, value) =>
    setForm((prev) => {
      const actualCycleTime = Number(prev.standardCycleTime || 0);
      const currentRows = Array.isArray(prev.lossTimeBreakdown)
        ? prev.lossTimeBreakdown
        : [createLossTimeRow()];

      const updatedRows = currentRows.map((item) => {
        if (item.id !== rowId) return item;

        if (field === "person") {
          const matchedPerson = getResponsibilityMatch(value);
          return {
            ...item,
            person: value,
            department: matchedPerson ? matchedPerson.department : "",
          };
        }

       if (field === "qty") {
  const cleanValue = value ? Math.max(0, Number(value)) : "";

  return {
    ...item,
    qty: cleanValue !== "" ? String(cleanValue) : "",
    minutes:
      cleanValue !== ""
        ? calculateMinutesFromQty(
            cleanValue,
            Number(prev.standardCycleTime || 0)
          )
        : "",
  };
}

        return {
          ...item,
          [field]: value,
        };
      });

      return {
        ...prev,
        date: prev.isEditMode ? prev.date : getTodayDate(),
        lossTimeBreakdown: updatedRows,
      };
    });

  const addLossTimeRow = () =>
    setForm((prev) => ({
      ...prev,
      date: prev.isEditMode ? prev.date : getTodayDate(),
      lossTimeBreakdown: [
        ...(Array.isArray(prev.lossTimeBreakdown)
          ? prev.lossTimeBreakdown
          : [createLossTimeRow()]),
        createLossTimeRow(),
      ],
    }));

  const removeLossTimeRow = (rowId) =>
    setForm((prev) => {
      const currentRows = Array.isArray(prev.lossTimeBreakdown)
        ? prev.lossTimeBreakdown
        : [createLossTimeRow()];

      return {
        ...prev,
        date: prev.isEditMode ? prev.date : getTodayDate(),
        lossTimeBreakdown:
          currentRows.length === 1
            ? [createLossTimeRow()]
            : currentRows.filter((item) => item.id !== rowId),
      };
    });

  const handleReset = () => {
    const freshForm = getInitialFormState();
    setForm(freshForm);
    localStorage.removeItem(STORAGE_KEYS.FORM_DRAFT);
    setActiveTab("production");
    scrollToSection("production");
    clearRouteState();
  };

  const handleLoadExistingForEdit = () => {
    if (!matchingExistingEntry) return;

    setForm(
      syncDerivedValues(
        mergeDraftWithDefaults(
          {
            ...matchingExistingEntry,
            isEditMode: true,
          },
          { forceTodayDate: false }
        )
      )
    );

    showToast(
      "success",
      "Existing record loaded",
      "The existing entry has been loaded in edit mode."
    );
    setTimeout(() => scrollToSection("production"), 50);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    if (isSubmitting) return;

    setSubmitError("");
    setSubmitSuccess("");
      // ===== FORM VALIDATION =====
  const errors = getFormValidationErrors(form);

  if (Object.keys(errors).length > 0) {
    const firstError = Object.values(errors)[0];

    setSubmitError(firstError);
    showToast("error", "Validation Error", firstError);

    return;
  }

  // ===== LOSS TIME CHECK =====
  const lossQty = Number(form.lossTime || 0);

  if (lossQty > 0) {
    const validLossRows = form.lossTimeBreakdown.filter((row) => {
      const matchedPerson = getResponsibilityMatch(row.person);

      return (
        row.reason &&
        Number(row.qty || 0) > 0 &&
        row.person &&
        matchedPerson
      );
    });

    if (validLossRows.length === 0) {
      const msg =
        "Loss Quantity available. Please fill Loss Time Breakdown.";

      setSubmitError(msg);
      showToast("error", "Validation Error", msg);

      return;
    }
  }

 const payload = {
  date: (form.date || "").trim(),
  hall: (form.hall || "").trim(),

  machineCode: (form.machineCode || form.machine || "").trim(),
  machineName: (form.machineName || "").trim(),
  machineDisplayName: (form.machineDisplayName || "").trim(),

  shift: (form.shift || "").trim(),
  duration: (form.duration || "").trim(),

  operatorId: (form.operatorId || "").trim(),
  operator: (form.operator || "").trim(),

  part: (form.part || "").trim(),

  // NEW FIELDS
  partNumber: (form.partNumber || "").trim(),
  partCategory: (form.partCategory || "").trim(),

  standardCycleTime: Number(form.standardCycleTime || 0),
  actualCycleTime: Number(form.actualCycleTime || 0),

  target: Number(form.target || 0),
  actual: Number(form.actual || 0),
  good: Number(form.good || 0),
  reject: Number(form.reject || 0),

  lossMinutes: Number(form.lossTimeMinutes || 0),

  rejectReason: (form.rejectReason || "").trim(),
  remarks: (form.remarks || "").trim(),

  rejectBreakdown: sanitizeRejectBreakdown(
    form.rejectBreakdown,
    Number(form.reject || 0)
  ),

  lossTimeBreakdown: sanitizeLossTimeBreakdown(
    form.lossTimeBreakdown,

    // Loss minutes standard cycle time se
    form.standardCycleTime
  ),
};

    if (
      !payload.date ||
      !payload.hall ||
      !payload.machineCode ||
      !payload.shift
    ) {
      const msg = "Date, Hall, Machine and Shift are required.";
      setSubmitError(msg);
      showToast("error", "Validation Error", msg);
      return;
    }

    if (!form.part.trim()) {
      const msg = "Part name is required.";
      setSubmitError(msg);
      showToast("error", "Validation Error", msg);
      return;
    }

if (!isPositiveNumber(form.actualCycleTime)) {
   const msg = "Actual cycle time must be greater than zero.";
      setSubmitError(msg);
      showToast("error", "Validation Error", msg);
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("https://kushalyouth.com/api/entriesv2.php", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save data.");
      }

      if (addProductionEntry) {
        addProductionEntry(payload);
      }

      setSubmitSuccess("Entry saved successfully.");

      showToast(
        "success",
        "Entry Saved",
        "Production entry saved successfully."
      );

 const nextSlot = getNextDurationSlot(form.duration);

setForm((prev) => {
  const nextForm = {
    ...getInitialFormState(),

    // KEEP DATE/HALL/MACHINE
    date: prev.date,
    hall: prev.hall,

    machine: prev.machine,
    machineCode: prev.machineCode,
    machineName: prev.machineName,
    machineDisplayName: prev.machineDisplayName,

    // KEEP OPERATOR
    operatorId: prev.operatorId,
    operator: prev.operator,
    isNewOperator: prev.isNewOperator,

    // KEEP PART
    partMode: prev.partMode,
    part: prev.part,

    partNumber: prev.partNumber,
    partCategory: prev.partCategory,

    standardCycleTime: prev.standardCycleTime,
    actualCycleTime: prev.actualCycleTime,

    cycleTime: prev.cycleTime,

    // NEXT HOUR
    duration: nextSlot,
    shift: getShiftByDuration(nextSlot),

    // RESET PRODUCTION VALUES
    actual: "",
    target: "",
    good: "",
    reject: "",
    lossTime: "",
    lossTimeMinutes: "",

    rejectBreakdown: createRejectBreakdown(),
    lossTimeBreakdown: [createLossTimeRow()],

    remarks: "",
    rejectReason: "",
  };

  return syncDerivedValues(nextForm);
});
    } catch (error) {
      const msg = error?.message || "Something went wrong while saving.";
      setSubmitError(msg);
      showToast("error", "Save Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <link
        rel="stylesheet"
        href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
      />

      <Toast
        toast={toast}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      <div className="page-container">
        <header className="page-header">
          <div className="header-copy">
            <div className="eyebrow">Manufacturing Execution</div>
            <h1 className="page-title">
              {form.entryId
                ? "Production Entry Edit Form"
                : "Production Entry Form"}
            </h1>
            <p className="page-subtitle">
              Structured production data capture for shift, operator, rejection,
              and loss tracking.
            </p>
          </div>

          <div className="header-actions">
            <Link to="/" className="ghost-link">
              Dashboard
            </Link>
          </div>
        </header>

        {matchingExistingEntry ? (
          <div className="duplicate-alert">
            <div>
              <p className="duplicate-alert-title">Existing record detected</p>
              <p className="duplicate-alert-copy">
                A record already exists for the selected hall, machine, date,
                shift, and time slot. Load the existing record instead of saving
                a duplicate entry.
              </p>
            </div>
            <div>
              <button
                type="button"
                className="outline-btn duplicate-btn"
                onClick={handleLoadExistingForEdit}
              >
                Load Existing Record
              </button>
            </div>
          </div>
        ) : null}

        <div className="summary-strip">
          <SummaryCell label="Target / Hour" value={form.target || "0"} />
          <SummaryCell label="Actual" value={form.actual || "0"} />
          <SummaryCell label="Accepted" value={form.good || "0"} />
          <SummaryCell
            label="Rejected"
            value={form.reject || "0"}
            danger={Number(form.reject || 0) > 0}
          />
          <SummaryCell
            label="Loss Qty"
            value={form.lossTime || "0"}
            danger={Number(form.lossTime || 0) > 0}
          />
          <SummaryCell
            label="Loss Min"
            value={form.lossTimeMinutes || "0"}
            danger={Number(form.lossTimeMinutes || 0) > 0}
          />
        </div>

        {/* <nav className="tab-bar" aria-label="Form sections">
          {sectionTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`tab-btn ${activeTab === tab.key ? "tab-btn-active" : ""}`}
              onClick={() => {
                setActiveTab(tab.key);
                scrollToSection(tab.key);
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav> */}

        <form onSubmit={handleSubmit} className="form-layout">
          <section ref={sectionRefs.production} className="form-section">
            <SectionTitle
              title="Production Details"
              subtitle="Configure date, hall, machine, shift, and part information."
            />

            <div className="form-grid form-grid-3">
              <Field label="Date">
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  className={getFieldClassName(false, true)}
                 onChange={(e) =>
      setForm({
        ...form,
        date: e.target.value,
      })
    }
                  required
                />
              </Field>

              <Field label="Production Hall">
                <select
                  name="hall"
                  value={form.hall}
                  onChange={handleChange}
                  className="field"
                  required
                >
                  <option value="">Select Production Hall</option>
                  {halls.map((hall) => (
                    <option key={hall} value={hall}>
                      {hall}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Machine">
                <select
                  name="machine"
                  value={form.machine}
                  onChange={handleChange}
                  className="field"
                  required
                  disabled={!form.hall}
                >
                  <option value="">
                    {form.hall
                      ? "Select Machine"
                      : "Select Production Hall First"}
                  </option>
                  {machineOptions.map((machine) => (
                    <option key={machine.code} value={machine.code}>
                      {machine.displayName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Time Slot">
                <select
                  name="duration"
                  value={form.duration}
                  onChange={handleChange}
                  className="field"
                  required
                >
                  <option value="">Select Time Slot</option>
                  {durationSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Shift">
                <input
                  type="text"
                  name="shift"
                  value={form.shift}
                  placeholder="Derived from time slot"
                  className={getFieldClassName(false, true)}
                  readOnly
                />
              </Field>
<Field label="Part Name">
  {form.partMode === "manual" ? (
  <div className="manual-part-wrap">
    <Field >
      <input
        type="text"
        name="part"
        value={form.part}
        onChange={handleChange}
        className="field"
        placeholder="Enter part name"
        required
      />
    </Field>

    <Field label="Part Number">
      <input
        type="text"
        name="partNumber"
        value={form.partNumber}
        onChange={handleChange}
        className="field"
        placeholder="Enter Part Number"
        required
      />
    </Field>

    <Field label="Part Category">
      <input
        type="text"
        name="partCategory"
        value={form.partCategory}
        onChange={handleChange}
        className="field"
        placeholder="Enter Category"
        required
      />
    </Field>

    <Field label="Standard Cycle Time (Sec)">
      <input
        type="number"
        name="standardCycleTime"
        value={form.standardCycleTime}
        onChange={handleChange}
        className="field"
        placeholder="Enter Standard Cycle Time"
        min="1"
        required
      />
    </Field>

    <button
      type="button"
      className="outline-btn"
      onClick={() =>
        setForm((prev) =>
          syncDerivedValues({
            ...prev,
            part: "",
            partNumber: "",
            partCategory: "",
            cycleTime: "",
            standardCycleTime: "",
            actualCycleTime: "",
            partMode: "select",
          })
        )
      }
    >
      Back to Parts
    </button>
  </div>
) : (
    <>
      <input
        list="parts-list"
        disabled={!form.machineCode}
        value={form.part}
        onChange={(e) => {
          const value = e.target.value;

      if (value === "__OTHER__") {
  setForm((prev) =>
    syncDerivedValues({
      ...prev,

      part: "",
      partMode: "manual",

      // identify unknown parts later
       partNumber: "PENDING",
      partCategory: "OTHER",

      standardCycleTime: "",
      actualCycleTime: "",

      target: "",
      lossTime: "",
      lossTimeMinutes: "",

      lossTimeBreakdown: [createLossTimeRow()],
    })
  );

  return;
}

          const selectedPart = partsMap[value];

        setForm((prev) =>
  syncDerivedValues({
    ...prev,
    part: value,

    partNumber: selectedPart?.partNumber || "",
    partCategory: selectedPart?.category || "",

    standardCycleTime: selectedPart?.cycleTime || "",
    actualCycleTime: selectedPart?.cycleTime || "",

    partMode: "select",
  })
);
        }}
        className="field"
        placeholder="Search Part Name"
        required
      />
<datalist id="parts-list">
  {filteredPartsData.map((part) => (
    <option
      key={part.part_number}
      value={part.part_name}
    />
  ))}

  <option value="__OTHER__">Other</option>
</datalist>
    </>
  )}

</Field>
<Field label="Part Number">
  <input
    type="text"
    value={form.partNumber}
    className={getFieldClassName(false, true)}
    readOnly
  />
</Field>

<Field label="Part Category">
  <input
    type="text"
    value={form.partCategory}
    className={getFieldClassName(false, true)}
    readOnly
  />
</Field>
             <Field label="Standard Cycle Time (sec)">
  <input
    type="number"
    value={form.standardCycleTime}
    className={getFieldClassName(false, true)}
    readOnly
  />
</Field>

<Field
  label="Actual Cycle Time (sec)"
  error={validationErrors.cycleTime}
>
  <input
    type="number"
    name="actualCycleTime"
    value={form.actualCycleTime}
    onChange={handleChange}
    className={getFieldClassName(
      validationErrors.cycleTime,
      false
    )}
    inputMode="numeric"
    min="1"
    required
  />
</Field>
            </div>
          </section>

          <section ref={sectionRefs.operator} className="form-section">
            <SectionTitle
              title="Operator Details"
              subtitle="Capture operator identity for traceability and reporting."
            />

            <div className="form-grid form-grid-2">
              <Field label="Operator ID">
                <input
                  type="text"
                  name="operatorId"
                  value={form.operatorId}
                  onChange={handleChange}
                  placeholder="Enter operator ID"
                  className="field"
                  required
                />
              </Field>

              <Field
                label={
                  showNewOperatorNameField
                    ? "New Operator Name"
                    : "Operator Name"
                }
              >
                <input
                  type="text"
                  name="operator"
                  value={form.operator}
                  onChange={handleChange}
                  placeholder={
                    showNewOperatorNameField
                      ? "Enter new operator name"
                      : "Auto-fetched from operator ID"
                  }
                  className={getFieldClassName(
                    false,
                    !showNewOperatorNameField
                  )}
                  readOnly={!showNewOperatorNameField}
                  required
                />
              </Field>
            </div>
          </section>

          <section ref={sectionRefs.metrics} className="form-section">
            <SectionTitle
              title="Production Metrics"
              subtitle="Accepted quantity and loss values are calculated automatically."
            />

            <div className="kpi-grid">
              <MetricBox label="Target / Hour" value={form.target || "0"} />
              <MetricBox label="Actual" value={form.actual || "0"} editable>
                <input
                  type="number"
                  name="actual"
                  value={form.actual}
                  onChange={handleChange}
                  placeholder="Enter actual quantity"
                  className={getFieldClassName(validationErrors.actual)}
                  min="0"
                  inputMode="numeric"
                  required
                />
              </MetricBox>
              <MetricBox
                label="Rejected"
                value={form.reject || "0"}
                danger={Number(form.reject || 0) > 0}
              />
              <MetricBox label="Accepted Quantity" value={form.good || "0"} />
              <MetricBox
                label="Loss Quantity"
                value={form.lossTime || "0"}
                danger={Number(form.lossTime || 0) > 0}
              />
              <MetricBox
                label="Loss Time (min)"
                value={form.lossTimeMinutes || "0"}
                danger={Number(form.lossTimeMinutes || 0) > 0}
              />
            </div>

            {validationErrors.actual ? (
              <p className="inline-error section-error">
                {validationErrors.actual}
              </p>
            ) : null}
          </section>

          <section ref={sectionRefs.reject} className="form-section">
            <SectionTitle
              title="Rejection Breakdown"
              subtitle="Capture rejected quantity by reason. Rejection and accepted quantity update automatically."
            />

            {showRejectBreakdown ? (
              <div className="panel-block">
                <div className="panel-head">
                  <div>
                    <h3 className="panel-title">Rejection Allocation</h3>
                    <p className="panel-subtitle">
                      Enter rejected quantity against each applicable reason.
                    </p>
                  </div>

                  <div className="panel-stats">
                    <PanelStat label="Actual" value={form.actual || "0"} />
                    <PanelStat
                      label="Rejected"
                      value={String(rejectQty)}
                      tone={rejectQty > 0 ? "danger" : ""}
                    />
                    <PanelStat
                      label="Allocated"
                      value={String(rejectBreakdownTotal)}
                      tone={rejectDifference === 0 ? "success" : ""}
                    />
                  </div>
                </div>

                {validationErrors.rejectBreakdown ? (
                  <p className="inline-error section-error">
                    {validationErrors.rejectBreakdown}
                  </p>
                ) : null}

                <div className="reason-matrix">
                  {form.rejectBreakdown.map((item, index) => {
                    const rowError = validationErrors[`rejectRow-${item.id}`];

                    return (
                      <div
                        key={item.id}
                        className={`reason-card ${rowError ? "reason-card-error" : ""}`}
                      >
                        <div className="reason-card-head">
                          <p className="reason-card-title">
                            {index + 1}. {item.reason}
                          </p>
                        </div>

                        <div className="reason-card-body">
                          <Field label="Rejected Qty" error={rowError}>
                            <input
                              type="number"
                              min="0"
                              value={item.qty}
                              onChange={(e) =>
                                handleRejectRowChange(item.id, e.target.value)
                              }
                              className={getFieldClassName(rowError)}
                              placeholder="0"
                              inputMode="numeric"
                            />
                          </Field>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="auto-note">
                  <p className="auto-note-text">
                    Total rejected quantity is derived from the sum of all
                    reason-wise values. Accepted quantity is calculated as
                    Actual minus Rejected.
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          <section ref={sectionRefs.loss} className="form-section">
            <SectionTitle
              title="Loss Time Breakdown"
              subtitle="Capture production loss by reason and responsible department."
            />

            {showLossTimeFields ? (
              <div className="panel-block">
                <div className="panel-head">
                  <div>
                    <h3 className="panel-title">Loss Allocation</h3>
                    <p className="panel-subtitle">
                      Store accountable loss quantity and time in a structured
                      format.
                    </p>
                  </div>

                  <div className="panel-stats">
                    <PanelStat label="Loss Qty" value={String(lossQty)} />
                    <PanelStat
                      label="Allocated"
                      value={String(lossTimeBreakdownTotal)}
                    />
                    <PanelStat
                      label="Difference"
                      value={String(lossTimeDifference)}
                      tone={lossTimeDifference === 0 ? "success" : "danger"}
                    />
                  </div>
                </div>

                <div className="panel-actions panel-actions-top">
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={addLossTimeRow}
                  >
                    Add Loss Row
                  </button>
                </div>

                {validationErrors.lossTimeBreakdown ? (
                  <p className="inline-error section-error">
                    {validationErrors.lossTimeBreakdown}
                  </p>
                ) : null}

                <div className="row-list">
                  {form.lossTimeBreakdown.map((item, index) => {
                    const rowError = validationErrors[`lossRow-${item.id}`];
                    const suggestions = getResponsibilitySuggestions(item.person);
                    const datalistId = `loss-time-person-list-${item.id}`;

                    return (
                      <div
                        key={item.id}
                        className={`row-card ${rowError ? "row-card-error" : ""}`}
                      >
                        <div className="row-card-top">
                          <h4 className="row-card-title">
                            Loss Row {index + 1}
                          </h4>
                          <button
                            type="button"
                            className="outline-btn danger-btn"
                            onClick={() => removeLossTimeRow(item.id)}
                            disabled={form.lossTimeBreakdown.length === 1}
                          >
                            Remove
                          </button>
                        </div>

                        <div className="inner-grid inner-grid-3">
                          <Field label="Loss Reason">
                            <select
                              value={item.reason}
                              onChange={(e) =>
                                handleLossTimeRowChange(
                                  item.id,
                                  "reason",
                                  e.target.value
                                )
                              }
                              className={getFieldClassName(rowError)}
                            >
                              <option value="">Select loss reason</option>
                              {lossTimeReasonOptions.map((reason) => (
                                <option key={reason} value={reason}>
                                  {reason}
                                </option>
                              ))}
                            </select>
                          </Field>

                          <Field label="Quantity">
                            <input
                              type="number"
                              min="0"
                              value={item.qty}
                              onChange={(e) =>
                                handleLossTimeRowChange(
                                  item.id,
                                  "qty",
                                  e.target.value
                                )
                              }
                              className={getFieldClassName(rowError)}
                              placeholder="0"
                              inputMode="numeric"
                            />
                          </Field>

                          <Field label="Loss Time (min)">
                            <input
                              type="number"
                              value={item.minutes}
                              className={getFieldClassName(false, true)}
                              inputMode="numeric"
                              readOnly
                            />
                          </Field>

                          <Field label="Responsible Person">
                            <input
                              type="text"
                              value={item.person}
                              onChange={(e) =>
                                handleLossTimeRowChange(
                                  item.id,
                                  "person",
                                  e.target.value
                                )
                              }
                              placeholder="Enter responsible person"
                              className={getFieldClassName(rowError)}
                              list={datalistId}
                              autoComplete="off"
                            />
                          </Field>

                          <Field label="Department">
                            <input
                              type="text"
                              value={item.department}
                              placeholder="Auto-assigned"
                              className={getFieldClassName(false, true)}
                              readOnly
                            />
                          </Field>

                          <Field label="Status">
                            <input
                              type="text"
                              value={
                                item.reason && item.qty && item.person
                                  ? "Ready"
                                  : "Incomplete"
                              }
                              className={getFieldClassName(false, true)}
                              readOnly
                            />
                          </Field>
                        </div>

                        {rowError ? (
                          <p className="inline-error">{rowError}</p>
                        ) : null}

                        <datalist id={datalistId}>
                          {suggestions.map((person) => (
                            <option key={person.name} value={person.name} />
                          ))}
                        </datalist>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="empty-panel">
                <p className="empty-panel-text">
                  The loss section becomes available automatically when
                  production loss is detected.
                </p>
              </div>
            )}
          </section>

          <section ref={sectionRefs.remarks} className="form-section">
            <SectionTitle
              title="Operational Remarks"
              subtitle="Capture supervisor notes, machine condition, or shift-specific context."
            />

            <div className="form-grid single-grid">
              <Field label="Remarks">
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Enter remarks"
                  className="field textarea-field"
                />
              </Field>
            </div>
          </section>

          {submitSuccess && (
            <div className="success-message">✅ {submitSuccess}</div>
          )}

          {submitError && <div className="error-message">❌ {submitError}</div>}

          <div className="action-row">
            <button
              type="submit"
              className="primary-btn"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : form.entryId
                  ? "Update Entry"
                  : "Save Entry"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="secondary-btn"
              disabled={isSubmitting}
            >
              Reset Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}