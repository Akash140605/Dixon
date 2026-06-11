export const STORAGE_KEY = "production-dashboard-live-data";

export const initialDashboardData = {
  summary: {
    totalProduction: 12450,
    goodProduction: 11980,
    rejection: 470,
    rejectionPercent: "3.77%",
  },

  dayWiseTrend: [
    { date: "01 Jun", production: 2100, rejection: 80 },
    { date: "02 Jun", production: 2300, rejection: 65 },
    { date: "03 Jun", production: 2200, rejection: 90 },
    { date: "04 Jun", production: 2450, rejection: 70 },
    { date: "05 Jun", production: 2400, rejection: 85 },
  ],

  shiftWiseProduction: [
    { shift: "Shift A", actual: 4200, rejection: 110 },
    { shift: "Shift B", actual: 3980, rejection: 140 },
    { shift: "Shift C", actual: 4270, rejection: 220 },
  ],

  rejectionBreakdown: [
    { reason: "Short Fill", value: 120 },
    { reason: "Power Cut", value: 70 },
    { reason: "Scratch", value: 95 },
    { reason: "Dent", value: 80 },
    { reason: "Black Dot", value: 105 },
  ],

  hourlyTable: [
    {
      date: "2026-06-10",
      hall: "Hall 1",
      machine: "M-01",
      shift: "A",
      hour: "06-07",
      part: "Base Knob",
      actual: 120,
      good: 115,
      reject: 5,
      operator: "Ravi",
      rejectReason: "Short Fill",
      remarks: "",
    },
  ],
};