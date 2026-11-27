// Dummy data generator: parts master + ~7 days of hourly production entries.
import { halls, machineMap, durationSlots } from "../src/data/formData.js";
import { operatorMaster } from "../src/data/operatorDetails.js";
import { partCycleTimeData } from "../src/data/partCycleTimeData.js";

const REJECT_REASONS = [
  "Short Moulding", "Silver Mark", "Black Spot", "Colour Variation",
  "Warpage", "Flow Mark", "Shrinkage", "Burn Mark", "Weld Line",
];

const LOSS_REASONS = [
  "Breakdown - Machine Breakdown",
  "Breakdown - Mould Breakdown",
  "Setup Adjustment - Mould Change",
  "Minor Stoppages - Under 10 Min",
  "Management Loss - No Manpower",
  "Management Loss - Raw Material Shortage",
  "Start-up Loss - Shift Start Delay",
];

const RESPONSIBLE = [
  { person: "Jitendra", department: "Moulding" },
  { person: "Bholay", department: "Maintenance" },
  { person: "Haridas", department: "Tool Room" },
  { person: "Pushpendra", department: "Material" },
  { person: "Umesh", department: "Maintenance" },
  { person: "Rajan", department: "Moulding" },
];

const CATEGORIES = ["Washing Machine", "Cooler", "Fan", "Refrigerator", "General"];

const DAYS = 7;
const MACHINES_PER_HALL = 4;

// Small deterministic PRNG so the dummy data is the same every reset.
function makeRandom(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ymd(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function slotStartMinutes(slot) {
  const m = slot.split("-")[0].trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  let h = Number(m[1]);
  const period = m[3].toUpperCase();
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return h * 60 + Number(m[2]);
}

function shiftForSlot(slot) {
  const start = slotStartMinutes(slot);
  return start >= 8 * 60 && start < 20 * 60 ? "Shift A" : "Shift B";
}

export function seedDatabase(db, { now = new Date() } = {}) {
  const rand = makeRandom(20261127);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const between = (a, b) => a + Math.floor(rand() * (b - a + 1));

  // ---------- parts ----------
  const realParts = partCycleTimeData.filter((p) => p.cycleTime > 0);
  const insertPart = db.prepare(
    "INSERT OR IGNORE INTO parts (part_name, part_number, prod_cat, machine, cycle_time) VALUES (?, ?, ?, ?, ?)"
  );
  const allMachines = halls.flatMap((h) => machineMap[h] || []);

  db.exec("BEGIN");
  realParts.forEach((p, i) => {
    insertPart.run(
      p.partName,
      `DX-${String(10001 + i)}`,
      pick(CATEGORIES),
      pick(allMachines).code,
      p.cycleTime
    );
  });
  db.exec("COMMIT");

  // ---------- production entries ----------
  const insertEntry = db.prepare(`INSERT INTO production_entries_v2 (
    entryId, hall, machine, machineCode, machineName, machineDisplayName, date, shift, shiftLabel,
    hour, duration, operatorId, operator, part, partNumber, partCategory, standardCycleTime,
    actualCycleTime, target, actual, good, reject, lossTime, lossTimeMinutes, rejectReason,
    rejectBreakdown, lossTimeBreakdown, responsibilities, remarks, isNewOperator, createdAt, updatedAt
  ) VALUES (${new Array(32).fill("?").join(", ")})`);

  const partRows = db.prepare("SELECT * FROM parts").all();

  // Production "day" starts 08:00 AM (same rule as the entry form).
  const prodToday = new Date(now);
  if (prodToday.getHours() < 8) prodToday.setDate(prodToday.getDate() - 1);
  const minutesSince8 =
    (((now.getHours() * 60 + now.getMinutes()) - 8 * 60) + 1440) % 1440;

  let count = 0;
  db.exec("BEGIN");

  halls.forEach((hall) => {
    const machines = (machineMap[hall] || []).slice(0, MACHINES_PER_HALL);

    machines.forEach((m) => {
      const part = pick(partRows);
      const opA = pick(operatorMaster);
      const opB = pick(operatorMaster);

      for (let d = DAYS - 1; d >= 0; d--) {
        const day = new Date(prodToday);
        day.setDate(day.getDate() - d);
        const date = ymd(day);

        durationSlots.forEach((slot, slotIndex) => {
          // For today, only fill hours that are already over.
          if (d === 0 && (slotIndex + 1) * 60 > minutesSince8) return;
          // ~5% of hours the machine was idle / not logged.
          if (rand() < 0.05) return;

          const shift = shiftForSlot(slot);
          const op = shift === "Shift A" ? opA : opB;
          const std = Number(part.cycle_time) || 60;
          const target = Math.floor(3600 / std);
          const actualCycle = +(std * (1 + rand() * 0.15)).toFixed(1);

          const lossTimeBreakdown = [];
          let lossMinutes = 0;
          if (rand() < 0.25) {
            lossMinutes = between(5, 25);
            const who = pick(RESPONSIBLE);
            lossTimeBreakdown.push({
              reason: pick(LOSS_REASONS),
              qty: Math.ceil((lossMinutes * 60) / std),
              minutes: lossMinutes,
              person: who.person,
              department: who.department,
            });
          }

          const capacity = Math.floor(((60 - lossMinutes) * 60) / actualCycle);
          const actual = Math.max(0, Math.min(target, capacity));
          const reject = rand() < 0.4 ? Math.min(actual, between(1, 4)) : 0;
          const good = actual - reject;
          const lossTime = Math.max(target - actual, 0);

          const rejectBreakdown = reject > 0 ? [{ reason: pick(REJECT_REASONS), qty: reject }] : [];
          const responsibilities = lossTimeBreakdown.map(({ person, department }) => ({ person, department }));
          const ts = `${date} ${String(Math.floor(slotStartMinutes(slot) / 60)).padStart(2, "0")}:59:00`;

          insertEntry.run(
            null, hall, m.displayName, m.code, m.name, m.displayName, date, shift, shift,
            slot, slot, op.id, op.name, part.part_name, part.part_number, part.prod_cat,
            std, actualCycle, target, actual, good, reject, lossTime, lossMinutes,
            rejectBreakdown[0]?.reason || null,
            JSON.stringify(rejectBreakdown), JSON.stringify(lossTimeBreakdown),
            JSON.stringify(responsibilities),
            lossMinutes > 0 ? "Dummy entry with loss" : null,
            0, ts, ts
          );
          count++;
        });
      }
    });
  });

  db.exec("COMMIT");
  console.log(`[db] Seeded ${partRows.length} parts and ${count} production entries.`);
}
