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
  Alert,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import SignalCellularAltIcon from "@mui/icons-material/SignalCellularAlt";
import { useNavigate } from "react-router-dom";
import {
  getLoggedInRole,
  getLoggedInUserId,
  hasCreatorAccess,
  isParticipantRole,
  getToken,
} from "../auth/tokens";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

// ---------- Types ----------
type ClassLevel = "Beginner" | "Intermediate" | "Advanced" | "All levels";
type WeekFilter = "All Dates" | "Last 7 Days" | "Last 30 Days";
type ApiClassEvent = {
  id: number | string;
  userId?: number | string;
  user_id?: number | string;
  isPublic?: boolean;
  title?: string;
  level?: string;
  coach?: string;
  weekDay?: string;
  monthDate?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number | string;
  students?: number | string;
  status?: string;
  location?: string;
};

type ClassItem = {
  id: string;
  title: string;
  coach: string;
  date: string; // YYYY-MM-DD
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
  startMinutes: number;
  level: ClassLevel;
  students: number;
  capacity: number;
  status: "Active" | "Cancelled";
  location?: string;
};

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

// Keep level identity, but align to Onora vibe (purple first-class, orange subtle)
function levelDotSx(level: ClassLevel) {
  switch (level) {
    case "Beginner":
      return { bgcolor: "rgba(255, 107, 92, 0.95)" }; // subtle Onora orange
    case "Intermediate":
      return { bgcolor: "rgba(139, 92, 246, 0.75)" }; // purple
    case "Advanced":
      return { bgcolor: "rgba(139, 92, 246, 1)" }; // stronger purple
    case "All levels":
      return { bgcolor: "rgba(15, 23, 42, 0.45)" };
    default:
      return { bgcolor: "primary.main" };
  }
}

function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  const v = (n / d) * 100;
  return Math.max(0, Math.min(100, v));
}

function formatUtilLabel(students: number, capacity: number) {
  if (capacity <= 0) return "—";
  if (students >= capacity) return "Full";
  if (students === 0) return "Empty";
  return `${students}/${capacity}`;
}

function toDayName(value: string): ClassItem["day"] {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
}

function formatClock(time?: string) {
  if (!time) return "—";
  const [h, mm] = time.split(":");
  const hour = Number(h);
  if (Number.isNaN(hour)) return "—";
  const minute = mm ?? "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}

function toMinutes(time?: string) {
  if (!time) return Number.MAX_SAFE_INTEGER;
  const [h, mm] = time.split(":");
  const hour = Number(h);
  const minute = Number(mm ?? 0);
  if (Number.isNaN(hour) || Number.isNaN(minute))
    return Number.MAX_SAFE_INTEGER;
  return hour * 60 + minute;
}

function parseLevel(value?: string): ClassLevel {
  if (value === "Beginner" || value === "Intermediate" || value === "Advanced")
    return value;
  if (value === "All levels") return value;
  return "All levels";
}

function parseStatus(value?: string): ClassItem["status"] {
  return value?.toUpperCase() === "CANCELLED" ? "Cancelled" : "Active";
}

function mapApiClass(event: ApiClassEvent): ClassItem | null {
  if (!event.monthDate) return null;
  const capacity = Number(event.capacity ?? 0);
  const students = Number(event.students ?? 0);
  const day = DAYS.includes(event.weekDay as ClassItem["day"])
    ? (event.weekDay as ClassItem["day"])
    : toDayName(event.monthDate);
  return {
    id: String(event.id),
    title: event.title?.trim() || "Untitled Class",
    coach: event.coach || "TBA",
    date: event.monthDate,
    day,
    start: formatClock(event.startTime),
    end: formatClock(event.endTime),
    startMinutes: toMinutes(event.startTime),
    level: parseLevel(event.level),
    students: Number.isFinite(students) ? students : 0,
    capacity: Number.isFinite(capacity) ? capacity : 0,
    status: parseStatus(event.status),
    location: event.location || undefined,
  };
}

function isWithinLastDays(dateString: string, days: number) {
  const [y, m, d] = dateString.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  const floorNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const minDate = new Date(floorNow);
  minDate.setDate(minDate.getDate() - days);
  return date >= minDate && date <= floorNow;
}

export default function ClassesPage() {
  const navigate = useNavigate();
  const role = getLoggedInRole();
  const canCreateOrEdit = hasCreatorAccess(role);
  const [week, setWeek] = React.useState<WeekFilter>("All Dates");
  const [coach, setCoach] = React.useState<string>("All");
  const [level, setLevel] = React.useState<string>("All");
  const [activeOnly, setActiveOnly] = React.useState<boolean>(true);
  const [classes, setClasses] = React.useState<ClassItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadClasses = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = getToken();
    const currentUserId = getLoggedInUserId();
    if (!token) {
      setError("You are not logged in.");
      setClasses([]);
      setLoading(false);
      return;
    }
    const participant = isParticipantRole(getLoggedInRole());
    if (!participant && currentUserId === null) {
      setError("Invalid session. Please sign in again.");
      setClasses([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          data?.message?.[0] ||
            data?.error ||
            `Failed to load classes (${res.status})`,
        );
        setClasses([]);
        return;
      }

      const raw: ApiClassEvent[] = Array.isArray(data)
        ? data
        : (data?.data ?? []);
      const hasOwnerField = raw.some((c) => c.userId != null || c.user_id != null);
      const scoped = participant
        ? raw.filter((c) => c.isPublic === true)
        : hasOwnerField
          ? raw.filter((c) => {
              const owner = Number(c.userId ?? c.user_id);
              return Number.isFinite(owner) && owner === currentUserId;
            })
          : raw;

      const mapped = scoped
        .map(mapApiClass)
        .filter((item): item is ClassItem => Boolean(item))
        .sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return b.startMinutes - a.startMinutes;
        });

      setClasses(mapped);
    } catch {
      setError("Network error loading classes.");
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const uniqueCoaches = React.useMemo(() => {
    const s = new Set(classes.map((c) => c.coach));
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [classes]);

  const filtered = React.useMemo(() => {
    return classes.filter((c) => {
      if (activeOnly && c.status !== "Active") return false;
      if (coach !== "All" && c.coach !== coach) return false;
      if (level !== "All" && c.level !== level) return false;
      if (week === "Last 7 Days" && !isWithinLastDays(c.date, 7)) return false;
      if (week === "Last 30 Days" && !isWithinLastDays(c.date, 30))
        return false;
      return true;
    });
  }, [activeOnly, classes, coach, level, week]);

  const groupedByDay = React.useMemo(() => {
    const map = new Map<ClassItem["day"], ClassItem[]>();
    for (const d of DAYS) map.set(d, []);
    for (const item of filtered) map.get(item.day)?.push(item);

    for (const d of DAYS) {
      map.get(d)!.sort((a, b) => a.startMinutes - b.startMinutes);
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
        {/* Header (soft gradient wash like Tournaments page) */}
        <Paper
          sx={{
            mb: 2,
            p: { xs: 2, sm: 2.5 },
            borderRadius: 2,
            background:
              "linear-gradient(180deg, rgba(139,92,246,0.10) 0%, rgba(255,255,255,0) 70%)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h2" sx={{ mb: 0.5, fontWeight: 900 }}>
                Classes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage weekly training sessions.
              </Typography>
            </Box>

            {canCreateOrEdit ? (
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => navigate("/classes/new")}
                sx={{
                  alignSelf: { xs: "flex-start", sm: "auto" },
                  borderRadius: 999,
                  px: 2,
                }}
              >
                Add Class
              </Button>
            ) : null}
          </Stack>
        </Paper>

        {/* Filters */}
        <CardShell>
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
                onChange={(e) => setWeek(e.target.value as WeekFilter)}
                startAdornment={
                  <CalendarMonthIcon
                    fontSize="small"
                    style={{ marginRight: 8, opacity: 0.8 }}
                  />
                }
                sx={{
                  "&:focus-within": {
                    boxShadow: "0 0 0 3px rgba(255,107,92,0.10)", // subtle orange
                  },
                }}
              >
                <MenuItem value={"All Dates"}>All Dates</MenuItem>
                <MenuItem value={"Last 7 Days"}>Last 7 Days</MenuItem>
                <MenuItem value={"Last 30 Days"}>Last 30 Days</MenuItem>
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
                    style={{ marginRight: 8, opacity: 0.8 }}
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
                    style={{ marginRight: 8, opacity: 0.8 }}
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
        </CardShell>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Content */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Box sx={{ mb: 1 }}>
            <Typography
              variant="h3"
              sx={{ fontSize: "1.1rem", fontWeight: 900 }}
            >
              Week Schedule
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing {activeOnly ? "active" : "all"} classes for <b>{week}</b>.
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {loading ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <CircularProgress size={28} sx={{ mb: 1.5 }} />
              <Typography variant="body2" color="text.secondary">
                Loading latest classes...
              </Typography>
            </Box>
          ) : emptyState ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography
                variant="h3"
                sx={{ fontSize: "1.1rem", mb: 1, fontWeight: 900 }}
              >
                No classes match your filters
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Try changing coach, level, or turn off “Active only”.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  setWeek("All Dates");
                  setCoach("All");
                  setLevel("All");
                  setActiveOnly(true);
                }}
                sx={{
                  borderRadius: 999,
                  borderColor: "rgba(139,92,246,0.35)",
                  color: "primary.main",
                  "&:hover": {
                    borderColor: "primary.main",
                    backgroundColor: "rgba(139,92,246,0.08)",
                    boxShadow: "0 0 0 3px rgba(255,107,92,0.10)",
                  },
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
                      sx={{ fontWeight: 900, mb: 1, color: "text.primary" }}
                    >
                      {day}
                    </Typography>

                    <Stack spacing={1.25}>
                      {items.map((c) => (
                        <ClassRow
                          key={c.id}
                          item={c}
                          canEdit={canCreateOrEdit}
                          onEdit={() => navigate(`/classes/${c.id}/edit`)}
                        />
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

// Small wrapper to keep the filters looking like Onora “clean card”
function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      sx={{
        p: 2,
        mb: 3,
        borderRadius: 3,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "none",
        bgcolor: "background.paper",
      }}
    >
      {children}
    </Paper>
  );
}

// ---------- Row component ----------
function ClassRow({
  item,
  canEdit,
  onEdit,
}: {
  item: ClassItem;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const isFull = item.students >= item.capacity;
  const utilization = pct(item.students, item.capacity);

  const accent =
    item.status !== "Active"
      ? "rgba(15,23,42,0.10)"
      : isFull
        ? "rgba(255,107,92,0.55)" // orange for full
        : "rgba(139,92,246,0.35)"; // purple for active

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        bgcolor: "background.paper",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
        position: "relative",
        transition:
          "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
        "&:hover": {
          transform: "translateY(-1px)",
          borderColor: "rgba(139,92,246,0.22)",
          boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
        },
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: 10,
          bottom: 10,
          width: 4,
          borderRadius: 999,
          bgcolor: accent,
        },
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
            ...levelDotSx(item.level),
          }}
        />

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 900,
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
              sx={{
                borderRadius: 999,
                borderColor: "rgba(139,92,246,0.18)",
                bgcolor: "rgba(139,92,246,0.05)",
              }}
            />
            {item.status !== "Active" ? (
              <Chip
                size="small"
                label="Cancelled"
                variant="outlined"
                sx={{
                  borderRadius: 999,
                  borderColor: "rgba(15,23,42,0.14)",
                  color: "text.secondary",
                }}
              />
            ) : isFull ? (
              <Chip
                size="small"
                label="Full"
                variant="outlined"
                sx={{
                  borderRadius: 999,
                  borderColor: "rgba(255,107,92,0.35)",
                  color: "rgba(255,107,92,0.95)",
                  bgcolor: "rgba(255,107,92,0.06)",
                }}
              />
            ) : (
              <Chip
                size="small"
                label="Active"
                variant="outlined"
                sx={{
                  borderRadius: 999,
                  borderColor: "rgba(139,92,246,0.22)",
                  color: "primary.main",
                  bgcolor: "rgba(139,92,246,0.06)",
                }}
              />
            )}
          </Stack>
        </Box>
      </Box>

      {/* right column */}
      <Box sx={{ width: 240, flex: "0 0 auto" }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}
        >
          <span>Students</span>
          <span>
            <b>{formatUtilLabel(item.students, item.capacity)}</b>
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
              // keep bar neutral; theme can control actual color
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
            sx={{
              borderRadius: 999,
              borderColor: "rgba(139,92,246,0.35)",
              color: "primary.main",
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: "rgba(139,92,246,0.08)",
                boxShadow: "0 0 0 3px rgba(255,107,92,0.10)",
              },
            }}
          >
            View
          </Button>

          {canEdit ? (
            <Button
              size="small"
              variant="contained"
              onClick={onEdit}
              disabled={item.status !== "Active"}
              sx={{ borderRadius: 999 }}
            >
              Edit
            </Button>
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}
