import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import { useLocation, useNavigate } from "react-router-dom";
import { getLoggedInUserId, getToken } from "../auth/tokens";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type ApiEvent = {
  id: number | string;
  createdBy?: number | string;
  name?: string;
  title?: string;
  locationName?: string;
  eventType?: string;
  status?: string;
  subscriptionStatus?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  registrationDeadline?: string;
  currency?: string;
  entryFee?: number | string;
};

type DashboardApiResp = {
  events?: ApiEvent[] | null;
};

type CategoryDetail = {
  id: number;
  name?: string;
  level?: string;
  gender?: string;
  partnerName?: string | null;
  partnerNote?: string | null;
  teamFormat?: string | null;
  isDoubles?: boolean | null;
};

type CategoriesResp = {
  selectedCategories?: CategoryDetail[];
};

type TournamentCategoryResp = Array<{
  id?: number | string;
  name?: string;
  level?: string;
  gender?: string;
}>;

type EventDetailsState = {
  loading: boolean;
  error: string | null;
  categories: CategoryDetail[];
};

function toDateOnly(value?: string): string {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
}

function getQueryEventId(search: string): number | null {
  const params = new URLSearchParams(search);
  const raw = params.get("eventId");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function EventInviteHeader({
  title,
  locationLabel,
  dateLabel,
  timeLabel,
  feeLabel,
  deadlineLabel,
  stageLabel,
}: {
  title: string;
  locationLabel: string;
  dateLabel: string;
  timeLabel: string;
  feeLabel: string;
  deadlineLabel: string;
  stageLabel: string;
}) {
  return (
    <Paper
      sx={(theme) => ({
        position: "relative",
        overflow: "visible",
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: 2,
        bgcolor: "background.paper",
        "&::before": {
          content: '""',
          position: "absolute",
          width: 18,
          height: 18,
          borderRadius: "50%",
          left: -9,
          top: "50%",
          transform: "translateY(-50%)",
          bgcolor: "background.default",
          boxShadow: `inset -1px 0 0 ${theme.palette.divider}`,
        },
        "&::after": {
          content: '""',
          position: "absolute",
          width: 18,
          height: 18,
          borderRadius: "50%",
          right: -9,
          top: "50%",
          transform: "translateY(-50%)",
          bgcolor: "background.default",
          boxShadow: `inset 1px 0 0 ${theme.palette.divider}`,
        },
      })}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          borderRadius: 2.5,
          background:
            "linear-gradient(110deg, rgba(15,23,42,0.02) 0%, rgba(139,92,246,0.07) 40%, rgba(255,255,255,0.92) 100%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 12,
          border: "1px solid",
          borderColor: "rgba(139,92,246,0.35)",
          borderRadius: 2,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <Box sx={{ position: "relative", zIndex: 2, px: { xs: 2, md: 2.5 }, py: { xs: 2, md: 2.5 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "flex-start" }}
          spacing={1.5}
        >
          <Stack spacing={1.25} sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ letterSpacing: 1.1, color: "text.secondary" }}>
              Upcoming Event
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, md: 24 }, lineHeight: 1.2 }}>
              {title}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" variant="outlined" icon={<LocationOnOutlinedIcon />} label={locationLabel} />
              <Chip size="small" variant="outlined" icon={<CalendarMonthOutlinedIcon />} label={dateLabel} />
              <Chip size="small" variant="outlined" icon={<AccessTimeOutlinedIcon />} label={timeLabel} />
              <Chip size="small" variant="outlined" icon={<AttachMoneyOutlinedIcon />} label={feeLabel} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Deadline: {deadlineLabel}
            </Typography>
          </Stack>
          <Chip
            label={stageLabel}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.78)",
              color: "primary.dark",
              fontWeight: 700,
            }}
          />
        </Stack>
      </Box>
    </Paper>
  );
}

function getAttendeeStageLabel(event: ApiEvent): string {
  const rawStatus = String(event.subscriptionStatus ?? event.status ?? "").trim().toUpperCase();
  if (rawStatus === "WITHDRAWN") return "Withdrawn";
  return "Registered";
}

export default function UpcomingEventsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = getToken();
  const currentUserId = getLoggedInUserId();
  const focusEventId = getQueryEventId(location.search);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [events, setEvents] = React.useState<ApiEvent[]>([]);
  const [expandedByEvent, setExpandedByEvent] = React.useState<Record<number, boolean>>({});
  const [detailsByEvent, setDetailsByEvent] = React.useState<Record<number, EventDetailsState>>(
    {},
  );

  const loadEventDetails = React.useCallback(
    async (eventId: number, isCreator: boolean) => {
      setDetailsByEvent((prev) => ({
        ...prev,
        [eventId]: {
          loading: true,
          error: null,
          categories: prev[eventId]?.categories ?? [],
        },
      }));
      try {
        if (isCreator) {
          const res = await fetch(`${API_URL}/tournament-categories?eventId=${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const body: TournamentCategoryResp | null = await res.json().catch(() => null);
          if (!res.ok) {
            const msg =
              (body as any)?.message?.[0] ||
              (body as any)?.error ||
              "Could not load event categories.";
            throw new Error(msg);
          }
          const categories: CategoryDetail[] = Array.isArray(body)
            ? body.map((item) => ({
                id: Number(item.id),
                name: item.name,
                level: item.level,
                gender: item.gender,
              }))
            : [];
          setDetailsByEvent((prev) => ({
            ...prev,
            [eventId]: { loading: false, error: null, categories },
          }));
          return;
        }

        const res = await fetch(`${API_URL}/events/${eventId}/subscriptions/me/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body: CategoriesResp | null = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            (body as any)?.message?.[0] ||
            (body as any)?.error ||
            "Could not load event details.";
          throw new Error(msg);
        }
        const categories = Array.isArray(body?.selectedCategories)
          ? body?.selectedCategories
          : [];
        setDetailsByEvent((prev) => ({
          ...prev,
          [eventId]: { loading: false, error: null, categories },
        }));
      } catch (e: any) {
        setDetailsByEvent((prev) => ({
          ...prev,
          [eventId]: {
            loading: false,
            error: e?.message || "Could not load event details.",
            categories: [],
          },
        }));
      }
    },
    [token],
  );

  React.useEffect(() => {
    if (!token || currentUserId == null) {
      setError("You need to be logged in.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body: DashboardApiResp | null = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = (body as any)?.message?.[0] || (body as any)?.error || "Could not load events.";
          throw new Error(msg);
        }

        const today = toDateOnly(new Date().toISOString());
        const rawEvents = Array.isArray(body?.events) ? body.events : [];
        const upcomingEvents = rawEvents
          .filter((event) => String(event.eventType ?? "").toUpperCase() === "TOURNAMENT")
          .filter((event) => {
            const date = toDateOnly(event.startDate);
            return !date || date >= today;
          })
          .sort((a, b) => toDateOnly(a.startDate).localeCompare(toDateOnly(b.startDate)));

        if (cancelled) return;
        setEvents(upcomingEvents);

        if (focusEventId != null) {
          const focusEvent = upcomingEvents.find((event) => Number(event.id) === focusEventId);
          const exists = Boolean(focusEvent);
          if (exists) {
            setExpandedByEvent((prev) => ({ ...prev, [focusEventId]: true }));
            void loadEventDetails(
              focusEventId,
              Number(focusEvent?.createdBy) === Number(currentUserId),
            );
          }
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Could not load events.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, currentUserId, focusEventId]);

  const toggleDetails = (eventId: number, isCreator: boolean) => {
    const nextExpanded = !expandedByEvent[eventId];
    setExpandedByEvent((prev) => ({ ...prev, [eventId]: nextExpanded }));
    if (nextExpanded && !detailsByEvent[eventId]) {
      void loadEventDetails(eventId, isCreator);
    }
  };

  return (
    <Box component="main" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2} sx={{ maxWidth: 1100, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Upcoming Events
            </Typography>
            <Typography variant="body2" color="text.secondary">
              See your upcoming tournaments and registration details.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </Stack>

        {loading ? (
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Loading upcoming events...
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        {error ? <Alert severity="error">{error}</Alert> : null}

        {!loading && !error && events.length === 0 ? (
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                No upcoming events found.
              </Typography>
            </CardContent>
          </Card>
        ) : null}

        {events.map((event) => {
          const eventId = Number(event.id);
          const isCreator = Number(event.createdBy) === Number(currentUserId);
          const expanded = Boolean(expandedByEvent[eventId]);
          const details = detailsByEvent[eventId];
          return (
            <Card key={String(event.id)} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Stack spacing={1.5}>
                  <EventInviteHeader
                    title={event.name || event.title || "Tournament"}
                    locationLabel={event.locationName || "Location TBD"}
                    dateLabel={`${toDateOnly(event.startDate) || "TBD"}${
                      event.endDate ? ` to ${toDateOnly(event.endDate)}` : ""
                    }`}
                    timeLabel={`${event.startTime || "--:--"}${
                      event.endTime ? ` - ${event.endTime}` : ""
                    }`}
                    feeLabel={
                      event.currency ? `${event.entryFee ?? 0} ${event.currency}` : "Fee not set"
                    }
                    deadlineLabel={toDateOnly(event.registrationDeadline) || "TBD"}
                    stageLabel={isCreator ? "Creator" : getAttendeeStageLabel(event)}
                  />

                  <Divider />

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    {isCreator ? (
                      <Button
                        variant="contained"
                        onClick={() => navigate(`/tournaments/${eventId}/setup`)}
                      >
                        Manage
                      </Button>
                    ) : null}
                    <Button
                      variant="outlined"
                      endIcon={<ExpandMoreRoundedIcon />}
                      onClick={() => toggleDetails(eventId, isCreator)}
                    >
                      {expanded ? "Hide Details" : "See Details"}
                    </Button>
                  </Stack>

                  <Collapse in={expanded}>
                    <Box sx={{ pt: 1 }}>
                      {details?.loading ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CircularProgress size={18} />
                          <Typography variant="body2" color="text.secondary">
                            Loading categories...
                          </Typography>
                        </Stack>
                      ) : details?.error ? (
                        <Alert severity="error">{details.error}</Alert>
                      ) : details?.categories?.length ? (
                        <Stack spacing={1}>
                          {details.categories.map((category) => (
                            <Box
                              key={category.id}
                              sx={{
                                p: 1.25,
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 1.5,
                              }}
                            >
                              <Typography sx={{ fontWeight: 700 }}>
                                {category.name || `Category #${category.id}`}
                              </Typography>
                              {isCreator ? (
                                <Typography variant="body2" color="text.secondary">
                                  {category.level || "Open"}
                                  {category.gender ? ` • ${category.gender}` : ""}
                                </Typography>
                              ) : (
                                <>
                                  <Typography variant="body2" color="text.secondary">
                                    Partner: {category.partnerName?.trim() || "Not informed"}
                                  </Typography>
                                  {category.partnerNote?.trim() ? (
                                    <Typography variant="body2" color="text.secondary">
                                      Note: {category.partnerNote}
                                    </Typography>
                                  ) : null}
                                </>
                              )}
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No category details found for this event.
                        </Typography>
                      )}
                    </Box>
                  </Collapse>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
