import * as React from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  LinearProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import SignalCellularAltIcon from "@mui/icons-material/SignalCellularAlt";

// ---------- Types ----------
type ClassLevel = "Beginner" | "Intermediate" | "Advanced";

type ClassItem = {
  id: string;
  title: string;
  coach: string;
  day:
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";
  start: string; // "6:00 PM"
  end: string; // "7:30 PM"
  level: ClassLevel;
  students: number;
  capacity: number;
  status: "Active" | "Cancelled";
  location?: string;
};

// ---------- Dummy data ----------
const DEMO_WEEK_LABEL = "Apr 22 – Apr 28";

const CLASSES: ClassItem[] = [
  {
    id: "c1",
    title: "Junior Class",
    coach: "Coach Alex",
    day: "Monday",
    start: "8:00 AM",
    end: "9:00 AM",
    level: "Beginner",
    students: 9,
    capacity: 12,
    status: "Active",
    location: "Court 2",
  },
  {
    id: "c2",
    title: "Doubles Clinic",
    coach: "Debony",
    day: "Monday",
    start: "10:00 AM",
    end: "11:30 AM",
    level: "Intermediate",
    students: 10,
    capacity: 10,
    status: "Active",
    location: "Court 1",
  },
  {
    id: "c3",
    title: "Fundamentals",
    coach: "Thiago",
    day: "Tuesday",
    start: "6:00 PM",
    end: "7:00 PM",
    level: "Beginner",
    students: 6,
    capacity: 12,
    status: "Active",
    location: "Court 3",
  },
  {
    id: "c4",
    title: "Advanced Training",
    coach: "Coach Alex",
    day: "Wednesday",
    start: "12:00 PM",
    end: "1:30 PM",
    level: "Advanced",
    students: 7,
    capacity: 8,
    status: "Active",
    location: "Court 1",
  },
  {
    id: "c5",
    title: "Cardio Tennis",
    coach: "Debony",
    day: "Thursday",
    start: "7:00 PM",
    end: "8:00 PM",
    level: "Intermediate",
    students: 8,
    capacity: 10,
    status: "Active",
    location: "Court 2",
  },
  {
    id: "c6",
    title: "Beginner Intro",
    coach: "Thiago",
    day: "Friday",
    start: "5:30 PM",
    end: "6:30 PM",
    level: "Beginner",
    students: 4,
    capacity: 12,
    status: "Cancelled",
    location: "Court 4",
  },
];

// ---------- Helpers ----------
const DAYS: ClassItem["day"][] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function levelDotColor(level: ClassLevel): string {
  if (level === "Beginner") return "#22C55E";
  if (level === "Intermediate") return "#F59E0B";
  return "#3B82F6";
}

function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  const v = (n / d) * 100;
  return Math.max(0, Math.min(100, v));
}

export default function ClassesPage() {
  const [week, setWeek] = React.useState<string>(DEMO_WEEK_LABEL);
  const [coach, setCoach] = React.useState<string>("All");
  const [level, setLevel] = React.useState<string>("All");
  const [activeOnly, setActiveOnly] = React.useState<boolean>(true);

  const uniqueCoaches = React.useMemo(() => {
    const s = new Set(CLASSES.map((c) => c.coach));
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, []);

  const filtered = React.useMemo(() => {
    return CLASSES.filter((c) => {
      if (activeOnly && c.status !== "Active") return false;
      if (coach !== "All" && c.coach !== coach) return false;
      if (level !== "All" && c.level !== level) return false;
      return true;
    });
  }, [activeOnly, coach, level]);

  const groupedByDay = React.useMemo(() => {
    const map = new Map<ClassItem["day"], ClassItem[]>();
    for (const d of DAYS) map.set(d, []);
    for (const item of filtered) map.get(item.day)?.push(item);

    // Sort by time-ish (string sort works for AM/PM poorly; for MVP ok).
    // If you want accurate sorting, store 24h time and sort by that.
    for (const d of DAYS) {
      map.get(d)!.sort((a, b) => `${a.start}`.localeCompare(`${b.start}`));
    }
    return map;
  }, [filtered]);

  const emptyState = filtered.length === 0;

  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        minWidth: 0,
        bgcolor: "background.default",
        p: { xs: 2, md: 3 },
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 1100 }}>
        {/* Header row */}
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
            mb: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              variant="h2"
              sx={{ fontSize: { xs: "1.4rem", sm: "1.6rem" } }}
            >
              Classes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage weekly training sessions.
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => {
              // Hook into your router later: navigate("/classes/new")
              alert("TODO: Navigate to Add Class");
            }}
            sx={{ minWidth: 160 }}
          >
            Add Class
          </Button>
        </Box>

        {/* Filters */}
        <Paper
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 3,
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="week-label">Week</InputLabel>
              <Select
                labelId="week-label"
                label="Week"
                value={week}
                onChange={(e) => setWeek(String(e.target.value))}
                startAdornment={
                  <CalendarMonthIcon
                    fontSize="small"
                    style={{ marginRight: 8 }}
                  />
                }
              >
                <MenuItem value={DEMO_WEEK_LABEL}>{DEMO_WEEK_LABEL}</MenuItem>
                <MenuItem value={"Apr 29 – May 5"}>Apr 29 – May 5</MenuItem>
                <MenuItem value={"May 6 – May 12"}>May 6 – May 12</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="coach-label">Coach</InputLabel>
              <Select
                labelId="coach-label"
                label="Coach"
                value={coach}
                onChange={(e) => setCoach(String(e.target.value))}
                startAdornment={
                  <PersonOutlineIcon
                    fontSize="small"
                    style={{ marginRight: 8 }}
                  />
                }
              >
                {uniqueCoaches.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="level-label">Level</InputLabel>
              <Select
                labelId="level-label"
                label="Level"
                value={level}
                onChange={(e) => setLevel(String(e.target.value))}
                startAdornment={
                  <SignalCellularAltIcon
                    fontSize="small"
                    style={{ marginRight: 8 }}
                  />
                }
              >
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="Beginner">Beginner</MenuItem>
                <MenuItem value="Intermediate">Intermediate</MenuItem>
                <MenuItem value="Advanced">Advanced</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ flex: 1 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                />
              }
              label="Active only"
              sx={{ userSelect: "none" }}
            />
          </Stack>
        </Paper>

        {/* Content */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Box sx={{ mb: 1 }}>
            <Typography variant="h3" sx={{ fontSize: "1.1rem" }}>
              Week Schedule
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing {activeOnly ? "active" : "all"} classes for <b>{week}</b>.
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {emptyState ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography variant="h3" sx={{ fontSize: "1.1rem", mb: 1 }}>
                No classes match your filters
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Try changing coach, level, or turn off “Active only”.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  setCoach("All");
                  setLevel("All");
                  setActiveOnly(true);
                }}
              >
                Reset filters
              </Button>
            </Box>
          ) : (
            <Stack spacing={3}>
              {DAYS.map((day) => {
                const items = groupedByDay.get(day) || [];
                if (items.length === 0) return null;

                return (
                  <Box key={day}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        mb: 1,
                        color: "text.primary",
                      }}
                    >
                      {day}
                    </Typography>

                    <Stack spacing={1.5}>
                      {items.map((c) => (
                        <ClassRow key={c.id} item={c} />
                      ))}
                    </Stack>

                    <Divider sx={{ mt: 3 }} />
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

// ---------- Row component ----------
function ClassRow({ item }: { item: ClassItem }) {
  const isFull = item.students >= item.capacity;
  const utilization = pct(item.students, item.capacity);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: "background.paper",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", gap: 2, minWidth: 0, flex: 1 }}>
        {/* level dot */}
        <Box
          sx={{
            mt: "6px",
            width: 10,
            height: 10,
            borderRadius: "50%",
            flex: "0 0 auto",
            bgcolor: levelDotColor(item.level),
          }}
        />

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              lineHeight: 1.2,
              mb: 0.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={item.title}
          >
            {item.title}
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ color: "text.secondary" }}
            divider={<Divider orientation="vertical" flexItem />}
          >
            <Typography variant="body2">
              {item.start} – {item.end}
            </Typography>
            <Typography variant="body2">Coach: {item.coach}</Typography>
            {item.location ? (
              <Typography variant="body2">{item.location}</Typography>
            ) : null}
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 1, flexWrap: "wrap", rowGap: 1 }}
          >
            <Chip
              size="small"
              label={item.level}
              variant="outlined"
              sx={{ borderRadius: 999 }}
            />
            {item.status !== "Active" ? (
              <Chip
                size="small"
                label="Cancelled"
                color="default"
                variant="outlined"
                sx={{ borderRadius: 999 }}
              />
            ) : isFull ? (
              <Chip
                size="small"
                label="Full"
                color="default"
                variant="outlined"
                sx={{ borderRadius: 999 }}
              />
            ) : (
              <Chip
                size="small"
                label="Active"
                color="default"
                variant="outlined"
                sx={{ borderRadius: 999 }}
              />
            )}
          </Stack>
        </Box>
      </Box>

      {/* right column */}
      <Box sx={{ width: 220, flex: "0 0 auto" }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}
        >
          <span>Students</span>
          <span>
            <b style={{ color: "inherit" }}>
              {item.students}/{item.capacity}
            </b>
          </span>
        </Typography>

        <LinearProgress
          variant="determinate"
          value={utilization}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: "rgba(15, 23, 42, 0.06)",
            "& .MuiLinearProgress-bar": {
              borderRadius: 999,
            },
          }}
        />

        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 1.25, justifyContent: "flex-end" }}
        >
          <Button
            size="small"
            variant="outlined"
            onClick={() => alert(`TODO: View class ${item.id}`)}
          >
            View
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => alert(`TODO: Edit class ${item.id}`)}
            disabled={item.status !== "Active"}
          >
            Edit
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
