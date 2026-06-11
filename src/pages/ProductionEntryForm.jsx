import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { halls, machineMap, durationSlots } from "../data/formData";
import { operatorMaster } from "../data/operatorDetails";
import { useProduction } from "../context/ProductionContext";

const rejectReasonOptions = [
  "Short Fill",
  "Power Cut",
  "Scratch",
  "Dent",
  "Black Dot",
  "Flow Mark",
  "Burn Mark",
  "Crack",
];

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const convertTo24Hour = (timeStr) => {
  const value = timeStr.trim().toUpperCase();
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

const getInitialFormState = () => ({
  date: getTodayDate(),
  hall: "",
  machine: "",
  duration: "",
  shift: "",
  part: "",
  operatorId: "",
  operator: "",
  target: "",
  actual: "",
  good: "",
  reject: "",
  remarks: "",
  rejectBreakdown: createRejectBreakdown(),
});

const getRejectBreakdownTotal = (breakdown) =>
  breakdown.reduce((sum, item) => sum + Number(item.qty || 0), 0);

const calculateReject = (actualValue, goodValue) => {
  const actual = Number(actualValue || 0);
  const good = Number(goodValue || 0);
  const reject = actual - good;
  return reject >= 0 ? String(reject) : "0";
};

export default function ProductionEntryForm() {
  const navigate = useNavigate();
  const { addProductionEntry } = useProduction();

  const [theme, setTheme] = useState("light");
  const [form, setForm] = useState(getInitialFormState);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const machineOptions = useMemo(() => {
    return form.hall ? machineMap[form.hall] || [] : [];
  }, [form.hall]);

  const rejectQty = Number(form.reject || 0);
  const rejectBreakdownTotal = getRejectBreakdownTotal(form.rejectBreakdown);
  const rejectDifference = rejectQty - rejectBreakdownTotal;

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "hall") {
      setForm((prev) => ({
        ...prev,
        hall: value,
        machine: "",
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
        (item) => item.id.toUpperCase() === cleanValue
      );

      setForm((prev) => ({
        ...prev,
        operatorId: cleanValue,
        operator: matchedOperator ? matchedOperator.name : "",
      }));
      return;
    }

    if (name === "actual") {
      setForm((prev) => ({
        ...prev,
        actual: value,
        reject: calculateReject(value, prev.good),
      }));
      return;
    }

    if (name === "good") {
      setForm((prev) => ({
        ...prev,
        good: value,
        reject: calculateReject(prev.actual, value),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRejectQtyChange = (reason, value) => {
    const cleanValue = value === "" ? "" : Math.max(0, Number(value));

    setForm((prev) => ({
      ...prev,
      rejectBreakdown: prev.rejectBreakdown.map((item) =>
        item.reason === reason
          ? { ...item, qty: cleanValue === "" ? "" : String(cleanValue) }
          : item
      ),
    }));
  };

  const handleReset = () => {
    setForm(getInitialFormState());
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const actual = Number(form.actual || 0);
    const good = Number(form.good || 0);
    const reject = Math.max(actual - good, 0);

    const finalRejectBreakdown = form.rejectBreakdown
      .map((item) => ({
        reason: item.reason,
        qty: Number(item.qty || 0),
      }))
      .filter((item) => item.qty > 0);

    const rejectBreakdownTotal = getRejectBreakdownTotal(form.rejectBreakdown);

    if (good > actual) {
      alert("Good production actual production se zyada nahi ho sakta.");
      return;
    }

    if (!form.shift) {
      alert("Duration select karo, shift auto set ho jayegi.");
      return;
    }

    if (!form.operatorId || !form.operator) {
      alert("Valid operator ID dalo jisse operator name fetch ho sake.");
      return;
    }

    if (reject > 0 && finalRejectBreakdown.length === 0) {
      alert("Reject quantity hai to reject breakdown fill karo.");
      return;
    }

    if (reject > 0 && rejectBreakdownTotal !== reject) {
      alert(
        `Reject breakdown total ${rejectBreakdownTotal} hai. Isse reject quantity ${reject} ke equal karo.`
      );
      return;
    }

    addProductionEntry({
      ...form,
      target: Number(form.target || 0),
      actual,
      good,
      reject,
      rejectBreakdown: finalRejectBreakdown,
    });

    alert("Production entry captured successfully");
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
       

          <div className="header-actions">
            
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
                  <option key={machine} value={machine}>
                    {machine}
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

            <Field label="Operator Name">
              <input
                type="text"
                name="operator"
                value={form.operator || "Auto fetched from operator ID"}
                className="field field-readonly"
                readOnly
              />
            </Field>

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
                onChange={handleChange}
                placeholder="Good qty"
                className="field"
                min="0"
                required
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
          </div>

          <SectionTitle title="Reject Breakdown" />

          <div className="breakdown-card">
            <div className="breakdown-head">
              <div>
                <h3 className="breakdown-title">Reason-wise Rejection Split</h3>
                <p className="breakdown-subtitle">
                  Total reject quantity ko reason wise distribute karo.
                </p>
              </div>

              <div className="breakdown-stats">
                <div className="stat-chip">
                  Total Reject <strong>{rejectQty}</strong>
                </div>
                <div className="stat-chip">
                  Breakdown <strong>{rejectBreakdownTotal}</strong>
                </div>
                <div
                  className={`stat-chip ${
                    rejectDifference === 0 ? "ok-chip" : "warn-chip"
                  }`}
                >
                  Remaining <strong>{rejectDifference}</strong>
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
                    disabled={rejectQty === 0}
                  />
                </div>
              ))}
            </div>
          </div>

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
            <SummaryCard label="Actual" value={form.actual || 0} tone="blue" />
            <SummaryCard label="Good" value={form.good || 0} tone="green" />
            <SummaryCard label="Reject" value={form.reject || 0} tone="red" />
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
          --font-display: "Satoshi", Inter, ui-sans-serif, system-ui, sans-serif;
          --bg: #f4f6f8;
          --bg-2: #eef2f6;
          --surface: #ffffff;
          --surface-soft: #f8fafc;
          --surface-readonly: #f1f5f9;
          --border: #cfd8e3;
          --border-strong: #94a3b8;
          --text: #223142;
          --text-soft: #66788a;
          --heading: #0f1720;
          --primary: #0f172a;
          --primary-hover: #1e293b;
          --primary-soft: #e8edf3;
          --success: #166534;
          --success-soft: #ecfdf3;
          --danger: #b42318;
          --danger-soft: #fef3f2;
          --warning: #a16207;
          --warning-soft: #fff7e6;
          --shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
          --shadow-soft: 0 4px 12px rgba(15, 23, 42, 0.04);
          --radius: 0px;
          --radius-sm: 0px;
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
          --primary-soft: #1e293b;
          --success: #4ade80;
          --success-soft: #14251d;
          --danger: #fb7185;
          --danger-soft: #30131a;
          --warning: #f59e0b;
          --warning-soft: #33250a;
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
          padding: 20px 12px 32px;
        }

        .page-container {
          width: min(1160px, 100%);
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .header-copy {
          max-width: 760px;
        }

        .eyebrow {
          display: inline-block;
          margin-bottom: 10px;
          padding: 6px 10px;
          background: var(--surface-soft);
          color: var(--text-soft);
          border: 1px solid var(--border);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .page-title {
          margin: 0;
          font-size: clamp(2rem, 1.7rem + 1.5vw, 2.6rem);
          line-height: 1.08;
          letter-spacing: -0.04em;
          font-weight: 900;
          color: var(--heading);
        }

        .page-subtitle {
          margin: 10px 0 0;
          color: var(--text-soft);
          font-size: 0.98rem;
          line-height: 1.7;
          max-width: 60ch;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .theme-toggle,
        .back-link {
          min-height: 44px;
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
          transition: 0.2s ease;
        }

        .theme-toggle:hover,
        .back-link:hover {
          border-color: var(--border-strong);
          background: var(--surface-soft);
        }

        .form-card {
          background: var(--surface);
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          padding: 16px;
        }

        .top-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 16px;
        }

        .pill {
          background: var(--surface-soft);
          border: 1px solid var(--border);
          padding: 12px 14px;
        }

        .pill-label {
          margin-bottom: 4px;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--text-soft);
          font-weight: 800;
        }

        .pill-value {
          font-size: 0.94rem;
          font-weight: 800;
          color: var(--heading);
        }

        .section-title {
          margin: 18px 0 12px;
          color: var(--heading);
          font-size: 0.92rem;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
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
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--heading);
          padding: 0.8rem 0.9rem;
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
          box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.15);
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

        select.field option {
          background: #ffffff;
          color: #0f172a;
        }

        .breakdown-card {
          margin-top: 2px;
          border: 1px solid var(--border);
          background: var(--surface-soft);
          padding: 14px;
        }

        .breakdown-head {
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
          font-size: 0.98rem;
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

        .breakdown-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 20px;
        }

        .summary-card {
          border: 1px solid var(--border);
          background: var(--surface-soft);
          padding: 16px;
        }

        .summary-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: var(--text-soft);
          font-weight: 800;
          margin-bottom: 8px;
        }

        .summary-value {
          font-size: clamp(1.7rem, 1.35rem + 1vw, 2.2rem);
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .summary-card.blue {
          background: #eff6ff;
        }

        .summary-card.blue .summary-value {
          color: #1d4ed8;
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

        .action-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 22px;
        }

        .primary-btn,
        .secondary-btn {
          min-height: 46px;
          padding: 0 18px;
          font-size: 0.94rem;
          font-weight: 800;
          transition: 0.2s ease;
        }

        .primary-btn {
          background: var(--primary);
          color: #ffffff;
          border: 1px solid var(--primary);
        }

        .primary-btn:hover {
          background: var(--primary-hover);
          border-color: var(--primary-hover);
        }

        .secondary-btn {
          background: var(--surface);
          color: var(--heading);
          border: 1px solid var(--border);
        }

        .secondary-btn:hover {
          border-color: var(--border-strong);
          background: var(--surface-soft);
        }

        @media (max-width: 1024px) {
          .form-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .top-strip,
          .summary-grid,
          .breakdown-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .top-strip .pill:last-child,
          .summary-grid .summary-card:last-child {
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

          .top-strip,
          .form-grid,
          .summary-grid,
          .breakdown-grid {
            grid-template-columns: 1fr;
          }

          .breakdown-head {
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

function InfoPill({ label, value }) {
  return (
    <div className="pill">
      <div className="pill-label">{label}</div>
      <div className="pill-value">{value}</div>
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