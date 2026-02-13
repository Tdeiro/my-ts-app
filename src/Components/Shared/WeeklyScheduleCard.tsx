import * as React from "react";
import { Box, Divider, Paper, Stack, Typography, Button } from "@mui/material";
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
  // 1) Group
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
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h3" sx={{ fontSize: "1.15rem", mb: 2 }}>
        Recent Schedule
      </Typography>

      <Stack spacing={3}>
        {days.map((day) => (
          <Box key={day}>
            {/* Day header */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1.25 }}
            >
              {day}
            </Typography>

            {/* Day items */}
            <Stack spacing={1.5}>
              {dailyClassesGroup[day].map((c, idx) => (
                <React.Fragment key={c.id}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
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
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "primary.main",
                          flex: "0 0 auto",
                        }}
                      />

                      {/* Text */}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{ fontWeight: 600, textTransform: "capitalize" }}
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
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      View
                    </Button>
                  </Box>

                  {/* divider between rows in same day */}
                  {idx !== dailyClassesGroup[day].length - 1 ? (
                    <Divider />
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
