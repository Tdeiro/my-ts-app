import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { designTokens } from "../../Theme/designTokens";

export type CoachScheduleDay = {
  day: string;
  dateLabel: string;
  items: Array<{
    id: string;
    time: string;
    title: string;
    students?: number;
    capacity?: number | null;
    isClosed?: boolean;
    type: "class" | "tournament";
  }>;
};

export default function CoachWeeklyScheduleBoard({
  days,
}: {
  days: CoachScheduleDay[];
}) {
  const timeSlots = buildTimeSlots(days);
  const dayByKey = Object.fromEntries(days.map((d) => [d.day, d])) as Record<
    string,
    CoachScheduleDay
  >;
  const orderedDayKeys = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ].filter((k) => dayByKey[k]);
  const weeklyClassItems = days.flatMap((day) =>
    day.items.filter((item) => item.type === "class"),
  );
  const weeklyOpenSpots = weeklyClassItems.reduce((sum, item) => {
    if (item.capacity == null) return sum;
    const spots = Math.max(
      0,
      Number(item.capacity) - Number(item.students ?? 0),
    );
    return sum + spots;
  }, 0);
  const closedClasses = weeklyClassItems.filter((item) => {
    if (item.isClosed) return true;
    if (item.capacity == null) return false;
    return Number(item.students ?? 0) >= Number(item.capacity);
  }).length;

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background:
            "linear-gradient(90deg, #8B5CF6 0%, #A855F7 50%, #EC4899 100%)",
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header Section */}
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Stack spacing={0.5}>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, fontSize: "1.5rem" }}
              >
                Weekly Schedule
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.875rem" }}
              >
                Your classes and tournaments for this week
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <LegendDot color="#8B5CF6" label="Classes" />
              <LegendDot color={designTokens.orange[500]} label="Tournaments" />
            </Stack>
          </Stack>

          {/* Summary Stats */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <SummaryChip
              label="Available Spots This Week"
              value={String(weeklyOpenSpots)}
              color="#8B5CF6"
              bgColor="linear-gradient(135deg, #FAF5FF 0%, #FDF2F8 100%)"
              borderColor="#E9D5FF"
            />
            <SummaryChip
              label="Closed Classes"
              value={String(closedClasses)}
              color="#F97316"
              bgColor="#FFF7ED"
              borderColor="#FED7AA"
            />
          </Stack>

          {/* Calendar Grid */}
          <Box
            sx={{
              border: "1px solid #E5E7EB",
              borderRadius: 2.5,
              overflowX: "auto",
              bgcolor: "background.paper",
              boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "100px repeat(7, minmax(160px, 1fr))",
                minWidth: 1220,
              }}
            >
              {/* Time Column Header */}
              <Box
                sx={{
                  borderRight: "1px solid #E5E7EB",
                  borderBottom: "1px solid #E5E7EB",
                  p: 2,
                  bgcolor: "#F9FAFB",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Time
                </Typography>
              </Box>

              {/* Day Headers */}
              {orderedDayKeys.map((key) => {
                const day = dayByKey[key];
                return (
                  <Box
                    key={`head-${key}`}
                    sx={{
                      borderBottom: "1px solid #E5E7EB",
                      borderRight: "1px solid #E5E7EB",
                      p: 2,
                      textAlign: "center",
                      bgcolor: "#F9FAFB",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        color: "#6B7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        display: "block",
                        mb: 0.5,
                      }}
                    >
                      {day.day}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: "1.75rem",
                        lineHeight: 1,
                        color: "#111827",
                      }}
                    >
                      {day.dateLabel}
                    </Typography>
                  </Box>
                );
              })}

              {/* Time Slots and Events */}
              {timeSlots.map((slot, rowIdx) => (
                <Box key={`slot-${slot}`} sx={{ display: "contents" }}>
                  <Box
                    sx={{
                      borderRight: "1px solid #E5E7EB",
                      borderBottom:
                        rowIdx === timeSlots.length - 1
                          ? "none"
                          : "1px solid #E5E7EB",
                      p: 2,
                      bgcolor: "#F9FAFB",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.8125rem",
                        color: "#6B7280",
                      }}
                    >
                      {slot}
                    </Typography>
                  </Box>
                  {orderedDayKeys.map((key) => {
                    const day = dayByKey[key];
                    const slotItems = day.items.filter((item) =>
                      isSameTimeSlot(item.time, slot),
                    );
                    return (
                      <Box
                        key={`${key}-${slot}`}
                        sx={{
                          minHeight: 100,
                          p: 1,
                          borderRight: "1px solid #E5E7EB",
                          borderBottom:
                            rowIdx === timeSlots.length - 1
                              ? "none"
                              : "1px solid #E5E7EB",
                          bgcolor: slotItems.length ? "transparent" : "#FAFAFA",
                        }}
                      >
                        <Stack spacing={0.75}>
                          {slotItems.map((item) => (
                            <EventBlock key={item.id} item={item} />
                          ))}
                        </Stack>
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          bgcolor: color,
          boxShadow: `0 0 0 3px ${color}20`,
        }}
      />
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          fontSize: "0.8125rem",
          color: "#6B7280",
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}

function EventBlock({ item }: { item: CoachScheduleDay["items"][number] }) {
  const isClosed =
    item.isClosed ||
    (item.capacity != null &&
      Number(item.students ?? 0) >= Number(item.capacity));
  const status =
    item.type === "tournament"
      ? "Tournament"
      : isClosed
        ? "Closed"
        : item.capacity == null
          ? "Open"
          : `${Math.max(0, Number(item.capacity) - Number(item.students ?? 0))} spots`;

  const typeColor =
    item.type === "tournament" ? designTokens.orange[500] : "#8B5CF6";
  const typeBgColor = item.type === "tournament" ? "#FFF7ED" : "#FAF5FF";

  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 1.5,
        borderLeft: "3px solid",
        borderLeftColor: typeColor,
        bgcolor: typeBgColor,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          boxShadow: `0 4px 6px -1px ${typeColor}20`,
          transform: "translateY(-1px)",
        },
      }}
    >
      <Typography
        sx={{
          fontSize: "0.6875rem",
          fontWeight: 700,
          lineHeight: 1.3,
          color: "#6B7280",
          mb: 0.25,
        }}
      >
        {item.time}
      </Typography>
      <Typography
        sx={{
          fontSize: "0.8125rem",
          fontWeight: 700,
          color: "#111827",
          lineHeight: 1.3,
          mb: 0.5,
        }}
      >
        {item.title}
      </Typography>
      <Box
        sx={{
          display: "inline-flex",
          px: 0.75,
          py: 0.25,
          borderRadius: 1,
          bgcolor:
            item.type === "tournament"
              ? "#FFEDD5"
              : isClosed
                ? "#FEE2E2"
                : "#DCFCE7",
        }}
      >
        <Typography
          sx={{
            fontSize: "0.6875rem",
            lineHeight: 1.3,
            fontWeight: 700,
            color:
              item.type === "tournament"
                ? "#EA580C"
                : isClosed
                  ? "#DC2626"
                  : "#16A34A",
          }}
        >
          {status}
        </Typography>
      </Box>
    </Box>
  );
}

function isSameTimeSlot(itemTime: string, slotTime: string): boolean {
  return hourValue(itemTime) === hourValue(slotTime);
}

function hourValue(value: string): number | null {
  const raw = value.trim().toUpperCase();
  const match = raw.match(/^(\d{1,2}):\d{2}\s*(AM|PM)$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const period = match[2];
  if (period === "AM") {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }
  return hour;
}

function formatHourLabel(hour24: number): string {
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:00 ${period}`;
}

function buildTimeSlots(days: CoachScheduleDay[]): string[] {
  const base = [8, 10, 12, 14, 16, 18];
  const fromEvents = days
    .flatMap((day) => day.items.map((item) => hourValue(item.time)))
    .filter((value): value is number => value != null);
  const merged = Array.from(new Set([...base, ...fromEvents])).sort(
    (a, b) => a - b,
  );
  return merged.map(formatHourLabel);
}

function SummaryChip({
  label,
  value,
  color,
  bgColor,
  borderColor,
}: {
  label: string;
  value: string;
  color: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <Box
      sx={{
        border: `1.5px solid ${borderColor}`,
        borderRadius: 2,
        px: 2,
        py: 1.5,
        flex: 1,
        minWidth: 200,
        background: bgColor,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
        },
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: "block",
          lineHeight: 1.2,
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "#6B7280",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          mb: 0.75,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontWeight: 800,
          color,
          fontSize: "1.75rem",
          lineHeight: 1,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
