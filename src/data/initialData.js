export const STORAGE_KEY = "production-dashboard-live-data";

export const initialDashboardData = {
  summary: {
    totalProduction: 0,
    goodProduction: 0,
    rejection: 0,
    rejectionPercent: "0%",
  },

  dayWiseTrend: [
    { date: "01 Jun", production: 0, rejection: 0 },
    { date: "02 Jun", production: 0, rejection: 0 },
    { date: "03 Jun", production: 0, rejection: 0 },
    { date: "04 Jun", production: 0, rejection: 0 },
    { date: "05 Jun", production: 0, rejection: 0 },
  ],

  shiftWiseProduction: [
    { shift: "Shift A", actual: 0, rejection: 0 },
    { shift: "Shift B", actual: 0, rejection: 0 },
    { shift: "Shift C", actual: 0, rejection: 0 },
  ],

  rejectionBreakdown: [
    { reason: "Short Fill", value: 0 },
    { reason: "Power Cut", value: 0 },
    { reason: "Scratch", value: 0 },
    { reason: "Dent", value: 0 },
    { reason: "Black Dot", value: 0 },
  ],

  hourlyTable: [],
};