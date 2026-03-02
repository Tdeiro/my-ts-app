export type RevenueBreakdown = {
  classesRevenue: number;
  classesSessions: number;
  teamFeesRevenue: number;
  teamsCount: number;
};

export type CoachScheduleItemMock = {
  id: string;
  time: string;
  title: string;
  students?: number;
  capacity?: number | null;
  isClosed?: boolean;
  type: "class" | "tournament";
};

export type CoachScheduleDayMock = {
  day: string;
  dateLabel: string;
  items: CoachScheduleItemMock[];
};

export type CoachDashboardMock = {
  weekRangeLabel: string;
  weekSessions: number;
  weekStudents: number;
  activeTournaments: number;
  weekRevenue: number;
  previousWeekRevenue: number;
  tournamentsManagingCount: number;
  registeredCount: number;
  todaySessions: number;
  revenueByDay: Array<{ label: string; value: number }>;
  revenueBreakdown: RevenueBreakdown & { tournamentsRevenue: number; tournamentsCount: number };
  scheduleDays: CoachScheduleDayMock[];
};

export const dashboardRevenueBreakdownMock: RevenueBreakdown = {
  classesRevenue: 1450,
  classesSessions: 62,
  teamFeesRevenue: 210,
  teamsCount: 3,
};

export const mockPaymentMeta = {
  note: "Payment processing is not connected yet. This UI is using mock checkout data.",
  supportedMethods: ["Visa", "Mastercard", "Amex", "Apple Pay"],
  trustBadges: ["Encrypted Payment", "PCI-ready", "Instant Confirmation"],
};

export const coachDashboardMock: CoachDashboardMock = {
  weekRangeLabel: "Feb 23 - Mar 1",
  weekSessions: 62,
  weekStudents: 142,
  activeTournaments: 5,
  weekRevenue: 2340,
  previousWeekRevenue: 2080,
  tournamentsManagingCount: 1,
  registeredCount: 0,
  todaySessions: 0,
  revenueByDay: [
    { label: "Mon", value: 320 },
    { label: "Tue", value: 450 },
    { label: "Wed", value: 380 },
    { label: "Thu", value: 520 },
    { label: "Fri", value: 410 },
    { label: "Sat", value: 180 },
    { label: "Sun", value: 80 },
  ],
  revenueBreakdown: {
    classesRevenue: 1450,
    classesSessions: 62,
    teamFeesRevenue: 210,
    teamsCount: 3,
    tournamentsRevenue: 680,
    tournamentsCount: 5,
  },
  scheduleDays: [
    {
      day: "Mon",
      dateLabel: "23",
      items: [
        { id: "mon-1", time: "9:00 AM", title: "Beginner Class", students: 10, capacity: 12, type: "class" },
        { id: "mon-2", time: "2:00 PM", title: "Advanced Training", students: 8, capacity: 10, type: "class" },
        { id: "mon-3", time: "5:30 PM", title: "Pro Session", students: 6, capacity: 8, type: "class" },
      ],
    },
    {
      day: "Tue",
      dateLabel: "24",
      items: [
        { id: "tue-1", time: "8:00 AM", title: "Morning Training", students: 15, capacity: 18, type: "class" },
        { id: "tue-2", time: "11:00 AM", title: "Youth Class", students: 20, capacity: 20, isClosed: true, type: "class" },
        { id: "tue-3", time: "3:00 PM", title: "Intermediate", students: 10, capacity: 12, type: "class" },
      ],
    },
    {
      day: "Wed",
      dateLabel: "25",
      items: [
        { id: "wed-1", time: "9:30 AM", title: "Beginner Plus", students: 11, capacity: 14, type: "class" },
        { id: "wed-2", time: "1:00 PM", title: "Practice Match", type: "tournament" },
        { id: "wed-3", time: "4:00 PM", title: "Skills Workshop", students: 16, capacity: 16, isClosed: true, type: "class" },
      ],
    },
    {
      day: "Thu",
      dateLabel: "26",
      items: [
        { id: "thu-1", time: "8:30 AM", title: "Early Birds", students: 13, capacity: 16, type: "class" },
        { id: "thu-2", time: "10:30 AM", title: "Advanced Tech", students: 12, capacity: 12, isClosed: true, type: "class" },
        { id: "thu-3", time: "2:00 PM", title: "Team Tryouts", type: "tournament" },
      ],
    },
    {
      day: "Fri",
      dateLabel: "27",
      items: [
        { id: "fri-1", time: "9:00 AM", title: "Fundamentals", students: 13, capacity: 15, type: "class" },
        { id: "fri-2", time: "12:00 PM", title: "Lunch & Learn", students: 18, capacity: 18, isClosed: true, type: "class" },
        { id: "fri-3", time: "4:30 PM", title: "Weekend Prep", students: 11, capacity: 14, type: "class" },
      ],
    },
    {
      day: "Sat",
      dateLabel: "28",
      items: [
        { id: "sat-1", time: "9:00 AM", title: "Bondi Open", type: "tournament" },
        { id: "sat-2", time: "2:00 PM", title: "Private Lessons", students: 5, capacity: 8, type: "class" },
      ],
    },
    {
      day: "Sun",
      dateLabel: "1",
      items: [
        { id: "sun-1", time: "10:00 AM", title: "Recovery Class", students: 8, capacity: 10, type: "class" },
        { id: "sun-2", time: "1:00 PM", title: "Open Court", students: 12, capacity: 12, isClosed: true, type: "class" },
      ],
    },
  ],
};
