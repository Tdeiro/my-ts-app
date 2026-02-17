import * as React from "react";
import {
  Box,
  Divider,
  Paper,
  Stack,
  Typography,
  Button,
  useTheme,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

type WeeklyClass = {
  id: string;
  level: string;
  startAt: string;
  finishesAt: string;
  date: string;
};

const WEAKLY_CLASSES: WeeklyClass[] = [
  {
    id: "1",
    level: "advanced",
    startAt: "8:00 AM",
    finishesAt: "9:00 AM",
    date: "Monday",
  },
  {
    id: "2",
    level: "advanced",
    startAt: "9:00 AM",
    finishesAt: "10:00 AM",
    date: "Monday",
  },
  {
    id: "5",
    level: "advanced",
    startAt: "8:00 AM",
    finishesAt: "9:00 AM",
    date: "Tuesday",
  },
  {
    id: "6",
    level: "advanced",
    startAt: "9:00 AM",
    finishesAt: "10:00 AM",
    date: "Tuesday",
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

export default function WeeklyScheduleCard() {
  const theme = useTheme();

  // Group by day
  const dailyClassesGroup = React.useMemo(() => {
    return WEAKLY_CLASSES.reduce<Record<string, WeeklyClass[]>>(
      (groups, item) => {
        (groups[item.date] ??= []).push(item);
        return groups;
      },
      {},
    );
  }, []);

  const days = React.useMemo(() => {
    const keys = Object.keys(dailyClassesGroup);
    return keys.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  }, [dailyClassesGroup]);

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
          alignItems: "baseline",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box>
          <Typography
            variant="h3"
            sx={{ fontSize: "1.15rem", fontWeight: 900 }}
          >
            Recent Schedule
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Your latest classes by day
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 2, opacity: 0.7 }} />

      <Stack spacing={2.25}>
        {days.map((day) => (
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
              {dailyClassesGroup[day].map((c, idx) => (
                <React.Fragment key={c.id}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
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
                          bgcolor: "primary.main",
                          boxShadow: "0 0 0 4px rgba(139,92,246,0.10)",
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
                        borderColor: "rgba(139,92,246,0.35)",
                        color: "primary.main",
                        "&:hover": {
                          borderColor: "primary.main",
                          backgroundColor: "rgba(139,92,246,0.08)",
                          // tiny orange hint on hover (matches the dot in the logo)
                          boxShadow: `0 0 0 3px rgba(255, 107, 92, 0.14)`,
                        },
                      }}
                    >
                      View
                    </Button>
                  </Box>

                  {/* divider between rows in same day (optional, lighter now) */}
                  {idx !== dailyClassesGroup[day].length - 1 ? (
                    <Divider sx={{ opacity: 0.35 }} />
                  ) : null}
                </React.Fragment>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}
