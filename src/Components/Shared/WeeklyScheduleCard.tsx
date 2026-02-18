import * as React from "react";
import {
  Box,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

export type WeeklyClass = {
  id: string;
  level: string;
  startAt: string;
  finishesAt: string;
  date: string;
  students?: number;
  capacity?: number | null;
  isFull?: boolean;
};

const WEAKLY_CLASSES: WeeklyClass[] = [
  {
    id: "1",
    level: "advanced",
    startAt: "8:00 AM",
    finishesAt: "9:00 AM",
    date: "Monday",
    students: 10,
    capacity: 12,
    isFull: false,
  },
  {
    id: "2",
    level: "advanced",
    startAt: "9:00 AM",
    finishesAt: "10:00 AM",
    date: "Monday",
    students: 12,
    capacity: 12,
    isFull: true,
  },
  {
    id: "5",
    level: "advanced",
    startAt: "8:00 AM",
    finishesAt: "9:00 AM",
    date: "Tuesday",
    students: 8,
    capacity: 12,
    isFull: false,
  },
  {
    id: "6",
    level: "advanced",
    startAt: "9:00 AM",
    finishesAt: "10:00 AM",
    date: "Tuesday",
    students: 9,
    capacity: 12,
    isFull: false,
  },
];

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const DEFAULT_VISIBLE_PER_DAY = 3;

function levelTone(level: string) {
  const normalized = level.trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized === "beginner") {
    return { dot: "#16A34A", ring: "rgba(22,163,74,0.16)" };
  }
  if (normalized === "intermediate") {
    return { dot: "#0284C7", ring: "rgba(2,132,199,0.16)" };
  }
  if (normalized === "advanced") {
    return { dot: "#EA580C", ring: "rgba(234,88,12,0.16)" };
  }
  return { dot: "#7C3AED", ring: "rgba(124,58,237,0.16)" };
}

export default function WeeklyScheduleCard({
  classes,
}: {
  classes?: WeeklyClass[];
}) {
  const sourceClasses = classes ?? WEAKLY_CLASSES;
  const [dayFilter, setDayFilter] = React.useState<string>("All Days");
  const [expandedDays, setExpandedDays] = React.useState<Record<string, boolean>>(
    {},
  );

  // Group by day
  const dailyClassesGroup = React.useMemo(() => {
    return sourceClasses.reduce<Record<string, WeeklyClass[]>>(
      (groups, item) => {
        (groups[item.date] ??= []).push(item);
        return groups;
      },
      {},
    );
  }, [sourceClasses]);

  const days = React.useMemo(() => {
    const keys = Object.keys(dailyClassesGroup);
    return keys.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  }, [dailyClassesGroup]);
  const visibleDays = React.useMemo(() => {
    if (dayFilter === "All Days") return days;
    return days.filter((d) => d === dayFilter);
  }, [dayFilter, days]);

  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(180deg, rgba(139,92,246,0.06) 0%, rgba(255,255,255,0) 55%)",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "stretch", sm: "baseline" },
          justifyContent: "space-between",
          gap: 1,
          flexDirection: { xs: "column", sm: "row" },
          mb: 2,
        }}
      >
        <Box>
          <Typography
            variant="h3"
            sx={{ fontSize: "1.15rem", fontWeight: 900 }}
          >
            Weekly Schedule
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Your classes for this week by day
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel id="week-day-filter-label">Day</InputLabel>
          <Select
            labelId="week-day-filter-label"
            value={dayFilter}
            label="Day"
            onChange={(e) => setDayFilter(e.target.value)}
          >
            <MenuItem value="All Days">All Days</MenuItem>
            {days.map((day) => (
              <MenuItem key={day} value={day}>
                {day}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Divider sx={{ mb: 2, opacity: 0.7 }} />

      <Stack spacing={2.25}>
        {visibleDays.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No classes scheduled this week.
          </Typography>
        ) : (
          visibleDays.map((day) => (
            <Box key={day}>
              {/* Day header */}
              <Typography
                variant="body2"
                sx={{
                  mb: 1.25,
                  fontWeight: 800,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  fontSize: 12,
                }}
              >
                {day}
              </Typography>

              {/* Day items */}
              <Stack spacing={1}>
                {(expandedDays[day]
                  ? dailyClassesGroup[day]
                  : dailyClassesGroup[day].slice(0, DEFAULT_VISIBLE_PER_DAY)
                ).map((c, idx) => (
                  <React.Fragment key={c.id}>
                    {(() => {
                      const tone = levelTone(c.level);
                      const isFull =
                        typeof c.isFull === "boolean"
                          ? c.isFull
                          : c.capacity != null && Number(c.students ?? 0) >= Number(c.capacity);
                      const occupancyLabel =
                        c.capacity != null
                          ? `${Number(c.students ?? 0)}/${Number(c.capacity)}`
                          : `${Number(c.students ?? 0)} students`;
                      return (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "flex-start", sm: "center" },
                        justifyContent: "space-between",
                        gap: 2,
                        px: 1.5,
                        py: 1.25,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "rgba(15, 23, 42, 0.08)",
                        bgcolor: "background.paper",
                        transition:
                          "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          borderColor: "rgba(139,92,246,0.22)",
                          boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          minWidth: 0,
                        }}
                      >
                        {/* Dot */}
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: tone.dot,
                            boxShadow: `0 0 0 4px ${tone.ring}`,
                            flex: "0 0 auto",
                          }}
                        />

                        {/* Text */}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{ fontWeight: 900, textTransform: "capitalize" }}
                          >
                            {c.level} Class
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {c.startAt} – {c.finishesAt}
                          </Typography>
                          <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}>
                            <Chip
                              size="small"
                              label={isFull ? "Full" : "Open"}
                              sx={{
                                height: 22,
                                borderRadius: 999,
                                bgcolor: isFull
                                  ? "rgba(239,68,68,0.12)"
                                  : "rgba(34,197,94,0.12)",
                                color: isFull ? "error.main" : "success.main",
                                fontWeight: 700,
                              }}
                            />
                            <Chip
                              size="small"
                              variant="outlined"
                              label={occupancyLabel}
                              sx={{ height: 22, borderRadius: 999 }}
                            />
                          </Stack>
                        </Box>
                      </Box>

                      {/* Action */}
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityOutlinedIcon />}
                        onClick={() => console.log("view class", c.id)}
                        sx={{
                          whiteSpace: "nowrap",
                          borderRadius: 999,
                          px: 1.5,
                          width: { xs: "100%", sm: "auto" },
                          borderColor: "rgba(139,92,246,0.35)",
                          color: "primary.main",
                          "&:hover": {
                            borderColor: "primary.main",
                            backgroundColor: "rgba(139,92,246,0.08)",
                            boxShadow: `0 0 0 3px rgba(255, 107, 92, 0.14)`,
                          },
                        }}
                      >
                        View
                      </Button>
                    </Box>
                      );
                    })()}

                    {idx !==
                    (expandedDays[day]
                      ? dailyClassesGroup[day].length
                      : Math.min(
                          DEFAULT_VISIBLE_PER_DAY,
                          dailyClassesGroup[day].length,
                        )) -
                      1 ? (
                      <Divider sx={{ opacity: 0.35 }} />
                    ) : null}
                  </React.Fragment>
                ))}
                {dailyClassesGroup[day].length > DEFAULT_VISIBLE_PER_DAY ? (
                  <Box>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() =>
                        setExpandedDays((prev) => ({
                          ...prev,
                          [day]: !prev[day],
                        }))
                      }
                      sx={{ borderRadius: 999 }}
                    >
                      {expandedDays[day]
                        ? `Show less (keep ${DEFAULT_VISIBLE_PER_DAY})`
                        : `Show more (${dailyClassesGroup[day].length - DEFAULT_VISIBLE_PER_DAY})`}
                    </Button>
                  </Box>
                ) : null}
              </Stack>
            </Box>
          ))
        )}
      </Stack>
    </Paper>
  );
}
