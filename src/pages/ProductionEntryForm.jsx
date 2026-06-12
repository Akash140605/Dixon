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
  "Colour Change / Variation",
  "Warpage",
  "Flow Mark / Cut Mark",
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

const createRejectBreakdown = () =>
  rejectReasonOptions.map((reason) => ({
    reason,
    qty: "",
  }));

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

const calculateRejectFromBreakdown = (breakdown) =>
  String(getRejectBreakdownTotal(breakdown));

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
  } catch (error) {
    return fallbackValue;
  }
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
  rejectBreakdown:
    Array.isArray(draft?.rejectBreakdown) && draft.rejectBreakdown.length
      ? draft.rejectBreakdown
      : createRejectBreakdown(),
  lossTimeBreakdown:
    Array.isArray(draft?.lossTimeBreakdown) && draft.lossTimeBreakdown.length
      ? draft.lossTimeBreakdown
      : [createLossTimeRow()],
});

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
  const showNewOperatorNameField = form.isNewOperator;

  const syncDerivedValues = (draft) => {
    const reject = calculateRejectFromBreakdown(draft.rejectBreakdown);
    const good = calculateGood(draft.actual, reject);
    const lossTime = calculateLossTime(draft.target, draft.actual);

    return {
      ...draft,
      reject,
      good,
      lossTime,
      lossTimeBreakdown:
        Number(lossTime) > 0 ? draft.lossTimeBreakdown : [createLossTimeRow()],
    };
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

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

    if (name === "target" || name === "actual") {
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
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRejectQtyChange = (reason, value) => {
    const cleanValue = value === "" ? "" : Math.max(0, Number(value));

    setForm((prev) => {
      const updatedBreakdown = prev.rejectBreakdown.map((item) =>
        item.reason === reason
          ? { ...item, qty: cleanValue === "" ? "" : String(cleanValue) }
          : item
      );

      return syncDerivedValues({
        ...prev,
        rejectBreakdown: updatedBreakdown,
      });
    });
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
    const reject = getRejectBreakdownTotal(form.rejectBreakdown);
    const good = Math.max(actual - reject, 0);
    const lossTime = Math.max(target - actual, 0);

    const finalRejectBreakdown = form.rejectBreakdown
      .map((item) => ({
        reason: item.reason,
        qty: Number(item.qty || 0),
      }))
      .filter((item) => item.qty > 0);

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

    if (!form.shift) {
      alert("Duration select karo, shift auto set ho jayegi.");
      return;
    }

    if (!form.hall) {
      alert("Hall select karna zaroori hai.");
      return;
    }

    if (!form.machineCode) {
      alert("Machine select karna zaroori hai.");
      return;
    }

    if (!form.part.trim()) {
      alert("Part name dalna zaroori hai.");
      return;
    }

    if (!normalizedOperatorId) {
      alert("Operator ID dalna zaroori hai.");
      return;
    }

    if (!normalizedOperatorName) {
      alert("Operator name required hai.");
      return;
    }

    if (reject > actual) {
      alert("Reject quantity actual production se zyada nahi ho sakti.");
      return;
    }

    if (reject > 0 && finalRejectBreakdown.length === 0) {
      alert("Reject breakdown fill karo.");
      return;
    }

    if (lossTime > 0) {
      if (!finalLossTimeBreakdown.length) {
        alert("Loss time hai to uska breakdown fill karo.");
        return;
      }

      const hasInvalidLossTimeRows = finalLossTimeBreakdown.some(
        (item) => !item.reason || item.qty <= 0 || !item.person || !item.validPerson
      );

      if (hasInvalidLossTimeRows) {
        alert("Loss time breakdown me valid reason, qty aur responsible person fill karo.");
        return;
      }

      const totalLossTimeBreakdown = finalLossTimeBreakdown.reduce(
        (sum, item) => sum + item.qty,
        0
      );

      if (totalLossTimeBreakdown !== lossTime) {
        alert(
          `Loss time breakdown total ${totalLossTimeBreakdown} hai. Isse loss time ${lossTime} ke equal karo.`
        );
        return;
      }
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
      rejectBreakdown: finalRejectBreakdown,
      lossTimeBreakdown: finalLossTimeBreakdown.map(({ validPerson, ...rest }) => rest),
      createdAt: new Date().toISOString(),
    };

    if (addProductionEntry) {
      addProductionEntry(finalEntry);
    }

    const existingEntries = getStoredJson(STORAGE_KEYS.ENTRIES, []);
    const updatedEntries = [finalEntry, ...existingEntries];
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedEntries));

    alert("Production entry captured successfully");
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
              Fill production, rejection and loss time details in one clean flow.
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

            <Field label="Hall">
              <select
                name="hall"
                value={form.hall}
                onChange={handleChange}
                className="field"
                required
              >
                <option value="">Select Hall</option>
                {halls.map((hall) => (
                  <option key={hall} value={hall}>
                    {hall}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Machine Name">
              <select
                name="machine"
                value={form.machine}
                onChange={handleChange}
                className="field"
                required
                disabled={!form.hall}
              >
                <option value="">
                  {form.hall ? "Select Machine" : "Select Hall First"}
                </option>
                {machineOptions.map((machine) => (
                  <option key={machine.code} value={machine.code}>
                    {machine.displayName}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Duration">
              <select
                name="duration"
                value={form.duration}
                onChange={handleChange}
                className="field"
                required
              >
                <option value="">Select Duration</option>
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
                value={form.shift || "Auto after duration select"}
                className="field field-readonly"
                readOnly
              />
            </Field>

            <Field label="Part Name">
              <input
                type="text"
                name="part"
                value={form.part}
                onChange={handleChange}
                placeholder="Enter part name"
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

            <Field
              label={showNewOperatorNameField ? "New Operator Name" : "Operator Name"}
            >
              <input
                type="text"
                name="operator"
                value={form.operator}
                onChange={handleChange}
                placeholder={
                  showNewOperatorNameField
                    ? "New operator name enter karo"
                    : "Auto fetched from operator ID"
                }
                className={`field ${showNewOperatorNameField ? "" : "field-readonly"}`}
                readOnly={!showNewOperatorNameField}
                required
              />
            </Field>
          </div>

          <SectionTitle title="Production Metrics" />

          <div className="form-grid">
            <Field label="Target Production">
              <input
                type="number"
                name="target"
                value={form.target}
                onChange={handleChange}
                placeholder="Target qty"
                className="field"
                min="0"
              />
            </Field>

            <Field label="Actual Production">
              <input
                type="number"
                name="actual"
                value={form.actual}
                onChange={handleChange}
                placeholder="Actual qty"
                className="field"
                min="0"
                required
              />
            </Field>

            <Field label="Good Production">
              <input
                type="number"
                name="good"
                value={form.good}
                className="field field-readonly"
                readOnly
                tabIndex={-1}
              />
            </Field>

            <Field label="Reject Quantity">
              <input
                type="number"
                name="reject"
                value={form.reject}
                className="field field-readonly reject-field"
                readOnly
                tabIndex={-1}
              />
            </Field>

            <Field label="Loss Time">
              <input
                type="number"
                name="lossTime"
                value={form.lossTime}
                className="field field-readonly"
                readOnly
                tabIndex={-1}
              />
            </Field>
          </div>

          <SectionTitle title="Reject Breakdown" />

          <div className="breakdown-card">
            <div className="breakdown-head">
              <div>
                <h3 className="breakdown-title">Reason-wise Rejection Split</h3>
                <p className="breakdown-subtitle">
                  Reject breakdown fill karte hi reject aur good auto update honge.
                </p>
              </div>

              <div className="breakdown-stats">
                <div className="stat-chip">
                  Reject <strong>{rejectQty}</strong>
                </div>
                <div className="stat-chip">
                  Breakdown <strong>{rejectBreakdownTotal}</strong>
                </div>
                <div
                  className={`stat-chip ${
                    rejectDifference === 0 ? "ok-chip" : "warn-chip"
                  }`}
                >
                  Difference <strong>{rejectDifference}</strong>
                </div>
              </div>
            </div>

            <div className="breakdown-grid">
              {form.rejectBreakdown.map((item) => (
                <div key={item.reason} className="breakdown-item">
                  <label className="mini-label">{item.reason}</label>
                  <input
                    type="number"
                    min="0"
                    value={item.qty}
                    onChange={(e) =>
                      handleRejectQtyChange(item.reason, e.target.value)
                    }
                    className="field"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          {showLossTimeFields && (
            <>
              <SectionTitle title="Loss Time Breakdown" />

              <div className="responsibility-card">
                <div className="responsibility-head">
                  <div>
                    <h3 className="breakdown-title">Loss Time with Responsibility</h3>
                    <p className="breakdown-subtitle">
                      Loss time ke saath exact reason, qty aur responsible person map karo.
                    </p>
                  </div>

                  <div className="breakdown-stats">
                    <div className="stat-chip">
                      Loss Time <strong>{lossTimeQty}</strong>
                    </div>
                    <div className="stat-chip">
                      Breakdown <strong>{lossTimeBreakdownTotal}</strong>
                    </div>
                    <div
                      className={`stat-chip ${
                        lossTimeDifference === 0 ? "ok-chip" : "warn-chip"
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

                <div className="responsibility-list">
                  {form.lossTimeBreakdown.map((item, index) => {
                    const suggestions = getResponsibilitySuggestions(item.person);
                    const datalistId = `loss-time-person-list-${index}`;

                    return (
                      <div key={index} className="loss-row">
                        <Field label="Reason">
                          <select
                            value={item.reason}
                            onChange={(e) =>
                              handleLossTimeRowChange(index, "reason", e.target.value)
                            }
                            className="field"
                          >
                            <option value="">Select reason</option>
                            {lossTimeReasonOptions.map((reason) => (
                              <option key={reason} value={reason}>
                                {reason}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="Qty">
                          <input
                            type="number"
                            min="0"
                            value={item.qty}
                            onChange={(e) =>
                              handleLossTimeRowChange(index, "qty", e.target.value)
                            }
                            className="field"
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
                            placeholder="Type person name"
                            className="field"
                            list={datalistId}
                            autoComplete="off"
                          />
                        </Field>

                        <Field label="Department">
                          <input
                            type="text"
                            value={item.department || "Auto fetched"}
                            className="field field-readonly"
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

          <SectionTitle title="Remarks" />

          <div className="form-grid single-grid">
            <Field label="Remarks">
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                rows="5"
                placeholder="Optional remarks"
                className="field textarea-field"
              />
            </Field>
          </div>

          <div className="summary-grid">
            <SummaryCard label="Target" value={form.target || 0} tone="purple" />
            <SummaryCard label="Actual" value={form.actual || 0} tone="blue" />
            <SummaryCard label="Good" value={form.good || 0} tone="green" />
            <SummaryCard label="Reject" value={form.reject || 0} tone="red" />
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

        .field-label,
        .mini-label {
          font-size: 0.88rem;
          font-weight: 800;
          color: var(--heading);
          line-height: 1.25;
        }

        .mini-label {
          font-size: 0.8rem;
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

        .field:disabled {
          opacity: 0.8;
          cursor: not-allowed;
          background: var(--surface-soft);
        }

        .field-readonly {
          background: var(--surface-readonly);
          color: var(--heading);
          font-weight: 700;
        }

        .reject-field {
          color: var(--danger);
        }

        .textarea-field {
          min-height: 110px;
          resize: vertical;
          padding-top: 12px;
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

        .warn-chip {
          background: var(--warning-soft);
          color: var(--warning);
        }

        .breakdown-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .breakdown-item,
        .responsibility-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
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

        .action-field {
          justify-content: flex-end;
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

          .summary-grid,
          .breakdown-grid {
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
          .breakdown-grid,
          .loss-row {
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

function Field({ label, children }) {
  return (
    <div className="field-wrap">
      <label className="field-label">{label}</label>
      {children}
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