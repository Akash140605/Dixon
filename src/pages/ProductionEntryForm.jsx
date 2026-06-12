import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  "Setup / Adjustment - Mould Change",
  "Tool Change - Mould Polishing / Cleaning",
  "Tool Change - Nozzle Change",
  "Tool Change - Insert / Ejector Pin / Slider Pin / Spring / Coupler / Copper Electrode Change",
  "Start-up Loss - Shift Start Delay",
  "Minor Stoppages - Under 10 Min",
  "Speed Loss - Unskilled Manpower / Actual Speed Low",
  "Defect & Rework Loss",
  "Schedule Down Time - Planned Stoppage",
  "Management Loss - No Manpower",
  "Management Loss - No Power",
  "Management Loss - Raw Material Shortage",
  "Management Loss - Conveyor Stop",
  "Management Loss - Bin / Trolly Short",
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

const normalizeText = (value = "") => String(value).trim().toLowerCase();

const getResponsibilityMatch = (value) => {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return null;

  return (
    responsibilityMaster.find(
      (item) => normalizeText(item.name) === normalizedValue
    ) || null
  );
};

const getResponsibilitySuggestions = (value) => {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return responsibilityMaster;

  return responsibilityMaster.filter((item) =>
    normalizeText(item.name).startsWith(normalizedValue)
  );
};

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const convertTo24Hour = (timeStr) => {
  const value = String(timeStr || "").trim().toUpperCase();
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);

  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3];

  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours !== 12) hours += 12;

  return hours * 60 + minutes;
};

const getShiftByDuration = (duration) => {
  if (!duration) return "";

  const parts = duration.split("-");
  if (parts.length < 2) return "";

  const startMinutes = convertTo24Hour(parts[0].trim());

  if (startMinutes === null) return "";
  if (startMinutes >= 6 * 60 && startMinutes < 14 * 60) return "Shift A";
  if (startMinutes >= 14 * 60 && startMinutes < 22 * 60) return "Shift B";
  return "Shift C";
};

const createRejectRow = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  reason: "",
  qty: "",
});

const createRejectBreakdown = () => [createRejectRow()];

const createLossTimeRow = () => ({
  reason: "",
  qty: "",
  person: "",
  department: "",
});

const getRejectBreakdownTotal = (breakdown) =>
  breakdown.reduce((sum, item) => sum + Number(item.qty || 0), 0);

const getLossTimeBreakdownTotal = (rows) =>
  rows.reduce((sum, item) => sum + Number(item.qty || 0), 0);

const calculateGood = (actualValue, rejectValue) => {
  const actual = Number(actualValue || 0);
  const reject = Number(rejectValue || 0);
  return actual - reject >= 0 ? String(actual - reject) : "0";
};

const calculateLossTime = (targetValue, actualValue) => {
  const target = Number(targetValue || 0);
  const actual = Number(actualValue || 0);
  return target - actual >= 0 ? String(target - actual) : "0";
};

const isNonNegativeNumber = (value) => {
  if (value === "" || value === null || value === undefined) return true;
  return !Number.isNaN(Number(value)) && Number(value) >= 0;
};

const getInitialFormState = () => ({
  date: getTodayDate(),
  hall: "",
  machine: "",
  machineCode: "",
  machineName: "",
  machineDisplayName: "",
  duration: "",
  shift: "",
  part: "",
  operatorId: "",
  operator: "",
  isNewOperator: false,
  target: "",
  actual: "",
  good: "",
  reject: "",
  lossTime: "",
  lossTimeBreakdown: [createLossTimeRow()],
  remarks: "",
  rejectBreakdown: createRejectBreakdown(),
});

const getStoredJson = (key, fallbackValue) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallbackValue;
  } catch {
    return fallbackValue;
  }
};

const normalizeRejectBreakdown = (rejectBreakdown) => {
  if (!Array.isArray(rejectBreakdown) || !rejectBreakdown.length) {
    return createRejectBreakdown();
  }

  return rejectBreakdown.map((item) => ({
    id: item?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    reason: typeof item?.reason === "string" ? item.reason : "",
    qty:
      item?.qty === 0
        ? "0"
        : item?.qty
        ? String(item.qty)
        : "",
  }));
};

const mergeDraftWithDefaults = (draft) => ({
  ...getInitialFormState(),
  ...draft,
  machine: typeof draft?.machine === "string" ? draft.machine : "",
  machineCode: typeof draft?.machineCode === "string" ? draft.machineCode : "",
  machineName: typeof draft?.machineName === "string" ? draft.machineName : "",
  machineDisplayName:
    typeof draft?.machineDisplayName === "string"
      ? draft.machineDisplayName
      : "",
  rejectBreakdown: normalizeRejectBreakdown(draft?.rejectBreakdown),
  lossTimeBreakdown:
    Array.isArray(draft?.lossTimeBreakdown) && draft.lossTimeBreakdown.length
      ? draft.lossTimeBreakdown
      : [createLossTimeRow()],
});

const getFormValidationErrors = (form) => {
  const errors = {};

  const actual = Number(form.actual || 0);
  const target = Number(form.target || 0);
  const reject = Number(form.reject || 0);
  const lossTime = Math.max(target - actual, 0);
  const rejectBreakdownTotal = getRejectBreakdownTotal(form.rejectBreakdown);
  const lossTimeBreakdownTotal = getLossTimeBreakdownTotal(form.lossTimeBreakdown);

  if (form.target !== "" && !isNonNegativeNumber(form.target)) {
    errors.target = "Target quantity must be zero or greater.";
  }

  if (form.actual !== "" && !isNonNegativeNumber(form.actual)) {
    errors.actual = "Actual quantity must be zero or greater.";
  }

  if (form.reject !== "" && !isNonNegativeNumber(form.reject)) {
    errors.reject = "Rejected quantity must be zero or greater.";
  }

  if (target > 0 && actual > target) {
    errors.actual = "Actual quantity cannot exceed target quantity.";
  }

  if (reject > actual) {
    errors.reject = "Rejected quantity cannot exceed actual production.";
  }

  if (reject > 0) {
    if (rejectBreakdownTotal !== reject) {
      errors.rejectBreakdown = `Rejection breakdown total is ${rejectBreakdownTotal}. It must match rejected quantity ${reject}.`;
    }

    form.rejectBreakdown.forEach((item) => {
      if (
        (item.reason && !Number(item.qty || 0)) ||
        (!item.reason && Number(item.qty || 0) > 0)
      ) {
        errors[`rejectRow-${item.id}`] =
          "Enter a valid rejection reason and quantity.";
      }
    });
  }

  if (lossTime > 0) {
    if (lossTimeBreakdownTotal !== lossTime) {
      errors.lossTimeBreakdown = `Loss time breakdown total is ${lossTimeBreakdownTotal}. It must match production loss time ${lossTime}.`;
    }

    form.lossTimeBreakdown.forEach((item, index) => {
      const matchedPerson = getResponsibilityMatch(item.person);
      if (item.reason || item.qty || item.person) {
        if (!item.reason || Number(item.qty || 0) <= 0 || !item.person || !matchedPerson) {
          errors[`lossRow-${index}`] =
            "Enter valid reason, quantity and responsible person.";
        }
      }
    });
  }

  return errors;
};

export default function ProductionEntryForm() {
  const navigate = useNavigate();
  const productionContext = useProduction();

  const [theme, setTheme] = useState("light");
  const [operatorMaster, setOperatorMaster] = useState(() => {
    const storedOperators = getStoredJson(STORAGE_KEYS.OPERATORS, []);
    return storedOperators.length ? storedOperators : importedOperatorMaster;
  });

  const [form, setForm] = useState(() => {
    const savedDraft = getStoredJson(STORAGE_KEYS.FORM_DRAFT, null);
    return savedDraft ? mergeDraftWithDefaults(savedDraft) : getInitialFormState();
  });

  const addProductionEntry =
    productionContext && typeof productionContext.addProductionEntry === "function"
      ? productionContext.addProductionEntry
      : null;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FORM_DRAFT, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.OPERATORS, JSON.stringify(operatorMaster));
  }, [operatorMaster]);

  const machineOptions = useMemo(() => {
    return form.hall ? machineMap[form.hall] || [] : [];
  }, [form.hall]);

  const rejectQty = Number(form.reject || 0);
  const lossTimeQty = Number(form.lossTime || 0);
  const rejectBreakdownTotal = getRejectBreakdownTotal(form.rejectBreakdown);
  const rejectDifference = rejectQty - rejectBreakdownTotal;
  const lossTimeBreakdownTotal = getLossTimeBreakdownTotal(form.lossTimeBreakdown);
  const lossTimeDifference = lossTimeQty - lossTimeBreakdownTotal;
  const showLossTimeFields = lossTimeQty > 0;
  const showRejectBreakdown = rejectQty > 0;
  const showNewOperatorNameField = form.isNewOperator;

  const validationErrors = useMemo(() => getFormValidationErrors(form), [form]);

  const syncDerivedValues = (draft) => {
    const good = calculateGood(draft.actual, draft.reject);
    const lossTime = calculateLossTime(draft.target, draft.actual);

    return {
      ...draft,
      good,
      lossTime,
      lossTimeBreakdown:
        Number(lossTime) > 0 ? draft.lossTimeBreakdown : [createLossTimeRow()],
      rejectBreakdown:
        Number(draft.reject || 0) > 0 ? draft.rejectBreakdown : [createRejectRow()],
    };
  };

  const getSelectedRejectReasons = (breakdown, currentRowId) =>
    breakdown
      .filter((item) => item.id !== currentRowId)
      .map((item) => item.reason)
      .filter(Boolean);

  const getAvailableRejectReasons = (breakdown, currentRowId) => {
    const usedReasons = new Set(getSelectedRejectReasons(breakdown, currentRowId));
    return rejectReasonOptions.filter((reason) => !usedReasons.has(reason));
  };

  const getFieldClassName = (error, readOnly = false) =>
    `field ${readOnly ? "field-readonly" : ""} ${error ? "field-error" : ""}`;

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "hall") {
      setForm((prev) =>
        syncDerivedValues({
          ...prev,
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
      const selectedMachine =
        machineOptions.find((item) => item.code === value) || null;

      setForm((prev) => ({
        ...prev,
        machine: selectedMachine?.code || "",
        machineCode: selectedMachine?.code || "",
        machineName: selectedMachine?.name || "",
        machineDisplayName: selectedMachine?.displayName || "",
      }));
      return;
    }

    if (name === "duration") {
      setForm((prev) => ({
        ...prev,
        duration: value,
        shift: getShiftByDuration(value),
      }));
      return;
    }

    if (name === "operatorId") {
      const cleanValue = value.toUpperCase();
      const matchedOperator = operatorMaster.find(
        (item) => String(item.id || "").toUpperCase() === cleanValue
      );

      setForm((prev) => ({
        ...prev,
        operatorId: cleanValue,
        operator: matchedOperator ? matchedOperator.name : "",
        isNewOperator: cleanValue ? !matchedOperator : false,
      }));
      return;
    }

    if (name === "target" || name === "actual" || name === "reject") {
      setForm((prev) =>
        syncDerivedValues({
          ...prev,
          [name]: value,
        })
      );
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRejectRowChange = (rowId, field, value) => {
    setForm((prev) => ({
      ...prev,
      rejectBreakdown: prev.rejectBreakdown.map((item) => {
        if (item.id !== rowId) return item;

        if (field === "qty") {
          const cleanValue = value === "" ? "" : String(Math.max(0, Number(value)));
          return { ...item, qty: cleanValue };
        }

        return { ...item, [field]: value };
      }),
    }));
  };

  const addRejectRow = () => {
    setForm((prev) => ({
      ...prev,
      rejectBreakdown: [...prev.rejectBreakdown, createRejectRow()],
    }));
  };

  const removeRejectRow = (rowId) => {
    setForm((prev) => ({
      ...prev,
      rejectBreakdown:
        prev.rejectBreakdown.length === 1
          ? [createRejectRow()]
          : prev.rejectBreakdown.filter((item) => item.id !== rowId),
    }));
  };

  const handleLossTimeRowChange = (index, field, value) => {
    setForm((prev) => {
      const updatedRows = prev.lossTimeBreakdown.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (field === "person") {
          const matchedPerson = getResponsibilityMatch(value);
          return {
            ...item,
            person: value,
            department: matchedPerson ? matchedPerson.department : "",
          };
        }

        if (field === "qty") {
          const cleanValue = value === "" ? "" : Math.max(0, Number(value));
          return {
            ...item,
            qty: cleanValue === "" ? "" : String(cleanValue),
          };
        }

        return {
          ...item,
          [field]: value,
        };
      });

      return {
        ...prev,
        lossTimeBreakdown: updatedRows,
      };
    });
  };

  const addLossTimeRow = () => {
    setForm((prev) => ({
      ...prev,
      lossTimeBreakdown: [...prev.lossTimeBreakdown, createLossTimeRow()],
    }));
  };

  const removeLossTimeRow = (index) => {
    setForm((prev) => ({
      ...prev,
      lossTimeBreakdown:
        prev.lossTimeBreakdown.length === 1
          ? [createLossTimeRow()]
          : prev.lossTimeBreakdown.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleReset = () => {
    const freshForm = getInitialFormState();
    setForm(freshForm);
    localStorage.removeItem(STORAGE_KEYS.FORM_DRAFT);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const actual = Number(form.actual || 0);
    const target = Number(form.target || 0);
    const reject = Number(form.reject || 0);
    const good = Math.max(actual - reject, 0);
    const lossTime = Math.max(target - actual, 0);

    const finalRejectBreakdown = form.rejectBreakdown
      .map((item) => ({
        reason: String(item.reason || "").trim(),
        qty: Number(item.qty || 0),
      }))
      .filter((item) => item.reason || item.qty);

    const finalLossTimeBreakdown = form.lossTimeBreakdown
      .map((item) => {
        const matchedPerson = getResponsibilityMatch(item.person);
        return {
          reason: String(item.reason || "").trim(),
          qty: Number(item.qty || 0),
          person: matchedPerson ? matchedPerson.name : "",
          department: matchedPerson ? matchedPerson.department : "",
          validPerson: Boolean(matchedPerson),
        };
      })
      .filter((item) => item.reason || item.qty || item.person);

    const normalizedOperatorId = form.operatorId.trim().toUpperCase();
    const normalizedOperatorName = form.operator.trim();
    const existingOperator = operatorMaster.find(
      (item) => String(item.id || "").toUpperCase() === normalizedOperatorId
    );

    const hasBlockingErrors = Object.keys(validationErrors).length > 0;

    if (!form.shift) {
      alert("Please select duration. Shift will be assigned automatically.");
      return;
    }

    if (!form.hall) {
      alert("Please select production hall.");
      return;
    }

    if (!form.machineCode) {
      alert("Please select machine.");
      return;
    }

    if (!form.part.trim()) {
      alert("Please enter part description.");
      return;
    }

    if (!normalizedOperatorId) {
      alert("Please enter operator ID.");
      return;
    }

    if (!normalizedOperatorName) {
      alert("Please enter operator name.");
      return;
    }

    if (hasBlockingErrors) {
      alert("Please correct the highlighted validation errors before submitting.");
      return;
    }

    if (!existingOperator && normalizedOperatorId && normalizedOperatorName) {
      const newOperator = {
        id: normalizedOperatorId,
        name: normalizedOperatorName,
      };
      setOperatorMaster((prev) => [...prev, newOperator]);
    }

    const finalEntry = {
      ...form,
      target,
      actual,
      good,
      reject,
      lossTime,
      operatorId: normalizedOperatorId,
      operator: normalizedOperatorName,
      isNewOperator: !existingOperator,
      machine: form.machineDisplayName || form.machineCode,
      machineCode: form.machineCode,
      machineName: form.machineName,
      machineDisplayName: form.machineDisplayName,
      rejectBreakdown: reject > 0 ? finalRejectBreakdown : [],
      lossTimeBreakdown: finalLossTimeBreakdown.map(({ validPerson, ...rest }) => rest),
      createdAt: new Date().toISOString(),
    };

    if (addProductionEntry) {
      addProductionEntry(finalEntry);
    }

    const existingEntries = getStoredJson(STORAGE_KEYS.ENTRIES, []);
    const updatedEntries = [finalEntry, ...existingEntries];
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedEntries));

    alert("Production entry recorded successfully.");
    localStorage.removeItem(STORAGE_KEYS.FORM_DRAFT);
    setForm(getInitialFormState());
    navigate("/");
  };

  return (
    <div className="page-shell">
      <link
        rel="stylesheet"
        href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
      />

      <div className="page-container">
        <header className="page-header">
          <div className="header-left">
            <h1 className="page-title">Production Entry Form</h1>
            <p className="page-subtitle">
              Record production, rejection and loss-time information with real-time validation.
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            >
              {theme === "light" ? "Dark" : "Light"} Mode
            </button>

            <Link to="/" className="back-link">
              Back to Dashboard
            </Link>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="form-card">
          <SectionTitle title="Production Details" />

          <div className="form-grid">
            <Field label="Date">
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="field"
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

            <Field label="Select Machine">
              <select
                name="machine"
                value={form.machine}
                onChange={handleChange}
                className="field"
                required
                disabled={!form.hall}
              >
                <option value="">
                  {form.hall ? "Select Machine" : "Select Production Hall First"}
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
                value={form.shift || "Auto-assigned after time slot selection"}
                className={getFieldClassName(false, true)}
                readOnly
              />
            </Field>

            <Field label="Part Description">
              <input
                type="text"
                name="part"
                value={form.part}
                onChange={handleChange}
                placeholder="Enter part description"
                className="field"
                required
              />
            </Field>
          </div>

          <SectionTitle title="Operator Details" />

          <div className="form-grid">
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

            <Field label={showNewOperatorNameField ? "New Operator Name" : "Operator Name"}>
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
                className={getFieldClassName(false, !showNewOperatorNameField)}
                readOnly={!showNewOperatorNameField}
                required
              />
            </Field>
          </div>

          <SectionTitle title="Production Metrics" />

          <div className="form-grid">
            <Field label="Target Quantity" error={validationErrors.target}>
              <input
                type="number"
                name="target"
                value={form.target}
                onChange={handleChange}
                placeholder="Target quantity"
                className={getFieldClassName(validationErrors.target)}
                min="0"
              />
            </Field>

            <Field label="Actual Quantity" error={validationErrors.actual}>
              <input
                type="number"
                name="actual"
                value={form.actual}
                onChange={handleChange}
                placeholder="Actual quantity"
                className={getFieldClassName(validationErrors.actual)}
                min="0"
                required
              />
            </Field>

            <Field label="Rejected Quantity" error={validationErrors.reject}>
              <input
                type="number"
                name="reject"
                value={form.reject}
                onChange={handleChange}
                placeholder="Rejected quantity"
                className={getFieldClassName(validationErrors.reject)}
                min="0"
              />
            </Field>

            <Field label="Accepted Quantity">
              <input
                type="number"
                name="good"
                value={form.good}
                className={getFieldClassName(false, true)}
                readOnly
                tabIndex={-1}
              />
            </Field>

            <Field label="Production Loss Time">
              <input
                type="number"
                name="lossTime"
                value={form.lossTime}
                className={getFieldClassName(false, true)}
                readOnly
                tabIndex={-1}
              />
            </Field>
          </div>

          <SectionTitle title="Rejection Breakdown" />

          {showRejectBreakdown ? (
            <div className="breakdown-card">
              <div className="breakdown-head">
                <div>
                  <h3 className="breakdown-title">Reason-wise Rejection Allocation</h3>
                  <p className="breakdown-subtitle">
                    Enter rejected quantity first, then allocate the quantity across rejection reasons.
                  </p>
                </div>

                <div className="breakdown-stats">
                  <div className="stat-chip">
                    Rejected <strong>{rejectQty}</strong>
                  </div>
                  <div className="stat-chip">
                    Allocated <strong>{rejectBreakdownTotal}</strong>
                  </div>
                  <div
                    className={`stat-chip ${
                      rejectDifference === 0 ? "ok-chip" : "error-chip"
                    }`}
                  >
                    Difference <strong>{rejectDifference}</strong>
                  </div>
                </div>
              </div>

              {validationErrors.rejectBreakdown ? (
                <p className="inline-error section-error">
                  {validationErrors.rejectBreakdown}
                </p>
              ) : null}

              <div className="selected-reject-chips">
                {form.rejectBreakdown
                  .filter((item) => item.reason && Number(item.qty || 0) > 0)
                  .map((item) => (
                    <div key={item.id} className="reason-chip">
                      <span>{item.reason}</span>
                      <strong>{item.qty}</strong>
                    </div>
                  ))}
              </div>

              <div className="reject-rows">
                {form.rejectBreakdown.map((item, index) => {
                  const rowError = validationErrors[`rejectRow-${item.id}`];
                  const availableReasons = getAvailableRejectReasons(
                    form.rejectBreakdown,
                    item.id
                  );

                  const options = [
                    ...(item.reason ? [item.reason] : []),
                    ...availableReasons,
                  ].filter((value, idx, arr) => value && arr.indexOf(value) === idx);

                  return (
                    <div
                      key={item.id}
                      className={`reject-row ${rowError ? "row-error" : ""}`}
                    >
                      <Field label={`Rejection Reason ${index + 1}`}>
                        <select
                          value={item.reason}
                          onChange={(e) =>
                            handleRejectRowChange(item.id, "reason", e.target.value)
                          }
                          className={getFieldClassName(rowError)}
                        >
                          <option value="">Select rejection reason</option>
                          {options.map((reason) => (
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
                            handleRejectRowChange(item.id, "qty", e.target.value)
                          }
                          className={getFieldClassName(rowError)}
                          placeholder="0"
                        />
                      </Field>

                      <div className="field-wrap action-field">
                        <label className="field-label">Action</label>
                        <button
                          type="button"
                          className="secondary-btn danger-outline"
                          onClick={() => removeRejectRow(item.id)}
                          disabled={form.rejectBreakdown.length === 1}
                        >
                          Remove
                        </button>
                      </div>

                      {rowError ? <p className="inline-error full-row">{rowError}</p> : null}
                    </div>
                  );
                })}
              </div>

              <div className="reject-actions">
                <button
                  type="button"
                  className="secondary-btn small-btn"
                  onClick={addRejectRow}
                  disabled={
                    form.rejectBreakdown.filter((item) => item.reason).length >=
                    rejectReasonOptions.length
                  }
                >
                  + Add Rejection Reason
                </button>
              </div>
            </div>
          ) : (
            <div className="breakdown-card compact-note">
              <p className="breakdown-subtitle">
                Rejection breakdown is not required when rejected quantity is zero.
              </p>
            </div>
          )}

          {showLossTimeFields && (
            <>
              <SectionTitle title="Loss Time Breakdown" />

              <div className="responsibility-card">
                <div className="responsibility-head">
                  <div>
                    <h3 className="breakdown-title">Loss Time Responsibility Allocation</h3>
                    <p className="breakdown-subtitle">
                      Map production loss time to valid reasons, quantities and responsible personnel.
                    </p>
                  </div>

                  <div className="breakdown-stats">
                    <div className="stat-chip">
                      Loss Time <strong>{lossTimeQty}</strong>
                    </div>
                    <div className="stat-chip">
                      Allocated <strong>{lossTimeBreakdownTotal}</strong>
                    </div>
                    <div
                      className={`stat-chip ${
                        lossTimeDifference === 0 ? "ok-chip" : "error-chip"
                      }`}
                    >
                      Difference <strong>{lossTimeDifference}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="secondary-btn small-btn"
                    onClick={addLossTimeRow}
                  >
                    + Add Row
                  </button>
                </div>

                {validationErrors.lossTimeBreakdown ? (
                  <p className="inline-error section-error">
                    {validationErrors.lossTimeBreakdown}
                  </p>
                ) : null}

                <div className="responsibility-list">
                  {form.lossTimeBreakdown.map((item, index) => {
                    const rowError = validationErrors[`lossRow-${index}`];
                    const suggestions = getResponsibilitySuggestions(item.person);
                    const datalistId = `loss-time-person-list-${index}`;

                    return (
                      <div
                        key={index}
                        className={`loss-row ${rowError ? "row-error" : ""}`}
                      >
                        <Field label="Loss Reason">
                          <select
                            value={item.reason}
                            onChange={(e) =>
                              handleLossTimeRowChange(index, "reason", e.target.value)
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
                              handleLossTimeRowChange(index, "qty", e.target.value)
                            }
                            className={getFieldClassName(rowError)}
                            placeholder="0"
                          />
                        </Field>

                        <Field label="Responsible Person">
                          <input
                            type="text"
                            value={item.person}
                            onChange={(e) =>
                              handleLossTimeRowChange(index, "person", e.target.value)
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
                            value={item.department || "Auto-assigned"}
                            className={getFieldClassName(false, true)}
                            readOnly
                          />
                        </Field>

                        <div className="field-wrap action-field">
                          <label className="field-label">Action</label>
                          <button
                            type="button"
                            className="secondary-btn danger-outline"
                            onClick={() => removeLossTimeRow(index)}
                            disabled={form.lossTimeBreakdown.length === 1}
                          >
                            Remove
                          </button>
                        </div>

                        {rowError ? <p className="inline-error full-row">{rowError}</p> : null}

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
            </>
          )}

          <SectionTitle title="Operational Remarks" />

          <div className="form-grid single-grid">
            <Field label="Remarks">
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                rows="5"
                placeholder="Enter operational remarks, if any"
                className="field textarea-field"
              />
            </Field>
          </div>

          <div className="summary-grid">
            <SummaryCard label="Target" value={form.target || 0} tone="purple" />
            <SummaryCard label="Actual" value={form.actual || 0} tone="blue" />
            <SummaryCard label="Rejected" value={form.reject || 0} tone="red" />
            <SummaryCard label="Accepted" value={form.good || 0} tone="green" />
            <SummaryCard label="Loss Time" value={form.lossTime || 0} tone="amber" />
          </div>

          <div className="action-row">
            <button type="submit" className="primary-btn">
              Save Entry
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="secondary-btn"
            >
              Reset Form
            </button>
          </div>
        </form>
      </div>

      <style>{`
        :root {
          --font-body: "Satoshi", Inter, ui-sans-serif, system-ui, sans-serif;
          --bg: #f4f6f8;
          --bg-2: #eef2f6;
          --surface: #ffffff;
          --surface-soft: #f8fafc;
          --surface-readonly: #f1f5f9;
          --border: #d4dce6;
          --border-strong: #94a3b8;
          --text: #223142;
          --text-soft: #66788a;
          --heading: #0f1720;
          --primary: #0f172a;
          --primary-hover: #1e293b;
          --success: #166534;
          --success-soft: #ecfdf3;
          --danger: #b42318;
          --danger-soft: #fef3f2;
          --warning: #a16207;
          --warning-soft: #fff7e6;
          --info: #1d4ed8;
          --info-soft: #eff6ff;
          --purple: #6d28d9;
          --purple-soft: #f3e8ff;
          --amber: #b45309;
          --amber-soft: #fffbeb;
          --shadow: 0 10px 30px rgba(15, 23, 42, 0.07);
          --shadow-soft: 0 4px 14px rgba(15, 23, 42, 0.05);
          --radius: 16px;
          --radius-sm: 10px;
        }

        [data-theme="dark"] {
          --bg: #0f1720;
          --bg-2: #111827;
          --surface: #111827;
          --surface-soft: #17202d;
          --surface-readonly: #1a2431;
          --border: #334155;
          --border-strong: #475569;
          --text: #e5edf5;
          --text-soft: #94a3b8;
          --heading: #ffffff;
          --primary: #e2e8f0;
          --primary-hover: #cbd5e1;
          --success: #4ade80;
          --success-soft: #14251d;
          --danger: #fb7185;
          --danger-soft: #30131a;
          --warning: #f59e0b;
          --warning-soft: #33250a;
          --info: #60a5fa;
          --info-soft: #172554;
          --purple: #c084fc;
          --purple-soft: #2e1065;
          --amber: #fbbf24;
          --amber-soft: #3f2a06;
          --shadow: 0 14px 34px rgba(0, 0, 0, 0.18);
          --shadow-soft: 0 6px 16px rgba(0, 0, 0, 0.12);
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          font-family: var(--font-body);
          background: linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%);
          color: var(--text);
        }

        .page-shell {
          min-height: 100vh;
          padding: 24px 12px 40px;
        }

        .page-container {
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .page-title {
          margin: 0;
          font-size: clamp(1.7rem, 1.2rem + 1.4vw, 2.5rem);
          color: var(--heading);
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .page-subtitle {
          margin: 8px 0 0;
          color: var(--text-soft);
          font-size: 0.98rem;
          line-height: 1.6;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .theme-toggle,
        .back-link,
        .primary-btn,
        .secondary-btn {
          min-height: 44px;
          border-radius: var(--radius-sm);
          transition: 0.2s ease;
        }

        .theme-toggle,
        .back-link {
          padding: 0 14px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--heading);
          text-decoration: none;
          font-size: 0.92rem;
          font-weight: 700;
          box-shadow: var(--shadow-soft);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .theme-toggle:hover,
        .back-link:hover {
          border-color: var(--border-strong);
          background: var(--surface-soft);
        }

        .form-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 20px;
        }

        .section-title {
          margin: 24px 0 12px;
          color: var(--heading);
          font-size: 0.92rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .section-title:first-child {
          margin-top: 0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .single-grid {
          grid-template-columns: 1fr;
        }

        .field-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: 0.88rem;
          font-weight: 800;
          color: var(--heading);
          line-height: 1.25;
        }

        .field {
          width: 100%;
          min-height: 48px;
          padding: 0.8rem 0.9rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--surface);
          color: var(--heading);
          outline: none;
          font-size: 0.95rem;
          font-weight: 600;
          transition: 0.2s ease;
        }

        .field::placeholder {
          color: var(--text-soft);
          font-weight: 500;
          opacity: 1;
        }

        .field:focus {
          border-color: var(--border-strong);
          box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.15);
        }

        .field-readonly {
          background: var(--surface-readonly);
          color: var(--heading);
          font-weight: 700;
        }

        .field-error {
          border-color: var(--danger) !important;
          background: color-mix(in srgb, var(--danger-soft) 35%, var(--surface) 65%);
          box-shadow: 0 0 0 3px rgba(180, 35, 24, 0.14) !important;
        }

        .field-error:focus {
          border-color: var(--danger) !important;
          box-shadow: 0 0 0 3px rgba(180, 35, 24, 0.18) !important;
        }

        .textarea-field {
          min-height: 110px;
          resize: vertical;
          padding-top: 12px;
        }

        .inline-error {
          margin: 4px 0 0;
          color: var(--danger);
          font-size: 0.78rem;
          font-weight: 700;
          line-height: 1.4;
        }

        .section-error {
          margin-top: 10px;
          margin-bottom: 2px;
        }

        .field-wrap:has(.field-error) .field-label {
          color: var(--danger);
        }

        .breakdown-card,
        .responsibility-card {
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: var(--surface-soft);
          padding: 14px;
        }

        .breakdown-head,
        .responsibility-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .breakdown-title {
          margin: 0;
          color: var(--heading);
          font-size: 1rem;
          font-weight: 900;
        }

        .breakdown-subtitle {
          margin: 5px 0 0;
          color: var(--text-soft);
          font-size: 0.9rem;
          line-height: 1.6;
        }

        .breakdown-stats {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .stat-chip {
          padding: 9px 11px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 999px;
          color: var(--heading);
          font-size: 0.82rem;
          font-weight: 700;
        }

        .ok-chip {
          background: var(--success-soft);
          color: var(--success);
        }

        .error-chip {
          background: var(--danger-soft);
          color: var(--danger);
          border-color: color-mix(in srgb, var(--danger) 35%, var(--border) 65%);
        }

        .selected-reject-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .reason-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--heading);
          font-size: 0.84rem;
          font-weight: 700;
        }

        .reason-chip strong {
          color: var(--danger);
        }

        .reject-rows,
        .responsibility-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .reject-row {
          display: grid;
          grid-template-columns: 1.4fr 0.8fr 130px;
          gap: 12px;
          align-items: end;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--surface);
        }

        .loss-row {
          display: grid;
          grid-template-columns: 1.5fr 0.7fr 1fr 1fr 140px;
          gap: 12px;
          align-items: end;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--surface);
        }

        .row-error {
          border-color: color-mix(in srgb, var(--danger) 55%, var(--border) 45%) !important;
          background: color-mix(in srgb, var(--danger-soft) 22%, var(--surface) 78%) !important;
        }

        .full-row {
          grid-column: 1 / -1;
        }

        .action-field {
          justify-content: flex-end;
        }

        .reject-actions {
          margin-top: 12px;
          display: flex;
          justify-content: flex-start;
        }

        .compact-note {
          padding: 16px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-top: 20px;
        }

        .summary-card {
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: var(--surface-soft);
          padding: 16px;
        }

        .summary-label {
          margin-bottom: 8px;
          color: var(--text-soft);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .summary-value {
          font-size: clamp(1.45rem, 1.2rem + 1vw, 2rem);
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .summary-card.blue {
          background: var(--info-soft);
        }

        .summary-card.blue .summary-value {
          color: var(--info);
        }

        .summary-card.green {
          background: #ecfdf5;
        }

        .summary-card.green .summary-value {
          color: #15803d;
        }

        .summary-card.red {
          background: #fff1f2;
        }

        .summary-card.red .summary-value {
          color: #be123c;
        }

        .summary-card.purple {
          background: var(--purple-soft);
        }

        .summary-card.purple .summary-value {
          color: var(--purple);
        }

        .summary-card.amber {
          background: var(--amber-soft);
        }

        .summary-card.amber .summary-value {
          color: var(--amber);
        }

        .action-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 22px;
        }

        .primary-btn,
        .secondary-btn {
          padding: 0 18px;
          font-size: 0.94rem;
          font-weight: 800;
          border: 1px solid transparent;
        }

        .primary-btn {
          background: var(--primary);
          color: #ffffff;
          border-color: var(--primary);
        }

        .primary-btn:hover {
          background: var(--primary-hover);
          border-color: var(--primary-hover);
        }

        .secondary-btn {
          background: var(--surface);
          color: var(--heading);
          border-color: var(--border);
        }

        .secondary-btn:hover {
          border-color: var(--border-strong);
          background: var(--surface-soft);
        }

        .small-btn {
          min-height: 40px;
          padding: 0 14px;
          font-size: 0.88rem;
        }

        .danger-outline {
          color: var(--danger);
          border-color: var(--danger);
          background: transparent;
        }

        .danger-outline:hover {
          background: var(--danger-soft);
        }

        @media (max-width: 1024px) {
          .form-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .loss-row {
            grid-template-columns: 1fr 1fr;
          }

          .action-field {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 640px) {
          .page-shell {
            padding: 14px 8px 24px;
          }

          .form-card {
            padding: 14px;
          }

          .header-actions {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr;
          }

          .theme-toggle,
          .back-link,
          .primary-btn,
          .secondary-btn {
            width: 100%;
          }

          .form-grid,
          .summary-grid,
          .loss-row,
          .reject-row {
            grid-template-columns: 1fr;
          }

          .breakdown-head,
          .responsibility-head {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

function SectionTitle({ title }) {
  return <div className="section-title">{title}</div>;
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

function SummaryCard({ label, value, tone }) {
  return (
    <div className={`summary-card ${tone}`}>
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  );
}