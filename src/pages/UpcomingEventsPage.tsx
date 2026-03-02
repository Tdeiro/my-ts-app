// This is the REDESIGNED Upcoming Events page matching the Figma screenshot
// To use this: rename this file to upcoming-events.tsx

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
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { useLocation, useNavigate } from "react-router-dom";
import { getLoggedInUserId, getToken } from "../auth/tokens";
import { UI_FEATURE_FLAGS } from "../config/featureFlags";
import MockDataFlag from "../Components/Shared/MockDataFlag";

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

function prettyDate(value?: string): string {
  if (!value) return "TBD";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return toDateOnly(value) || "TBD";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function prettyTimeRange(start?: string, end?: string): string {
  const s = start || "--:--";
  if (!end) return s;
  return `${s} - ${end}`;
}

function getQueryEventId(search: string): number | null {
  const params = new URLSearchParams(search);
  const raw = params.get("eventId");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function daysUntil(value?: string): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function getAttendeeStageLabel(event: ApiEvent): string {
  const rawStatus = String(event.subscriptionStatus ?? event.status ?? "")
    .trim()
    .toUpperCase();
  if (rawStatus === "WITHDRAWN") return "Withdrawn";
  return "Registered";
}

function deriveMockStats(eventId: number) {
  const seed = Number(String(eventId).replace(/\D/g, "").slice(-3) || "1");
  const registered = 12 + (seed % 28);
  const fillRate = 40 + (seed % 51);
  const revenue = registered * 30;
  return { registered, fillRate, revenue };
}

function derivePreviewCategories(eventId: number): string[] {
  const presets = [
    ["Advanced - Men", "Beginner - Mixed"],
    ["Intermediate - Men", "Open - Women"],
    ["Advanced - Mixed", "Beginner - Men"],
  ];
  return presets[Math.abs(eventId) % presets.length];
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
  const [expandedByEvent, setExpandedByEvent] = React.useState<
    Record<number, boolean>
  >({});
  const [detailsByEvent, setDetailsByEvent] = React.useState<
    Record<number, EventDetailsState>
  >({});

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
          const res = await fetch(
            `${API_URL}/tournament-categories?eventId=${eventId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const body: TournamentCategoryResp | null = await res
            .json()
            .catch(() => null);
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

        const res = await fetch(
          `${API_URL}/events/${eventId}/subscriptions/me/categories`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
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
        const body: DashboardApiResp | null = await res
          .json()
          .catch(() => null);
        if (!res.ok) {
          const msg =
            (body as any)?.message?.[0] ||
            (body as any)?.error ||
            "Could not load events.";
          throw new Error(msg);
        }

        const today = toDateOnly(new Date().toISOString());
        const rawEvents = Array.isArray(body?.events) ? body.events : [];
        const upcomingEvents = rawEvents
          .filter(
            (event) =>
              String(event.eventType ?? "").toUpperCase() === "TOURNAMENT",
          )
          .filter((event) => {
            const date = toDateOnly(event.startDate);
            return !date || date >= today;
          })
          .sort((a, b) =>
            toDateOnly(a.startDate).localeCompare(toDateOnly(b.startDate)),
          );

        if (cancelled) return;
        setEvents(upcomingEvents);

        if (focusEventId != null) {
          const focusEvent = upcomingEvents.find(
            (event) => Number(event.id) === focusEventId,
          );
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
  }, [token, currentUserId, focusEventId, loadEventDetails]);

  const toggleDetails = (eventId: number, isCreator: boolean) => {
    const nextExpanded = !expandedByEvent[eventId];
    setExpandedByEvent((prev) => ({ ...prev, [eventId]: nextExpanded }));
    if (nextExpanded && !detailsByEvent[eventId]) {
      void loadEventDetails(eventId, isCreator);
    }
  };

  const managedEvents = React.useMemo(
    () =>
      events.filter(
        (event) => Number(event.createdBy) === Number(currentUserId),
      ),
    [events, currentUserId],
  );

  const registeredEvents = React.useMemo(
    () =>
      events.filter(
        (event) => Number(event.createdBy) !== Number(currentUserId),
      ),
    [events, currentUserId],
  );

  const totalEvents = events.length;
  const upcomingThisWeek = events.filter((event) => {
    const d = daysUntil(event.startDate);
    return d != null && d >= 0 && d <= 7;
  }).length;
  const nextEventDays = Math.min(
    ...events
      .map((event) => daysUntil(event.startDate))
      .filter((value): value is number => value != null && value >= 0),
    Number.MAX_SAFE_INTEGER,
  );

  const hasEvents = !loading && !error && events.length > 0;

  return (
    <Box component="main" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={3} sx={{ maxWidth: 1120, mx: "auto" }}>
        {/* Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Button variant="outlined" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
          {UI_FEATURE_FLAGS.enableMockData ? (
            <MockDataFlag label="Event performance stats are mocked when endpoint data is unavailable" />
          ) : null}
        </Stack>

        {/* Purple Gradient Hero Section */}
        <Box
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: "18px",
            color: "#FFFFFF",
            minHeight: 220,
            background:
              "linear-gradient(102deg, #9810FA 0%, #7C3AED 50%, #5B5DE6 100%)",
            boxShadow: "0 10px 22px rgba(152, 16, 250, 0.24)",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            spacing={3}
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: { xs: "2rem", md: "3rem" },
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: "#FFFFFF",
                  mb: 0.5,
                }}
              >
                Upcoming Events
              </Typography>
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.95)",
                  fontSize: { xs: "0.875rem", md: "1rem" },
                  lineHeight: 1.5,
                }}
              >
                Your tournament schedule and management hub
              </Typography>
            </Box>

            {/* Next Event Card */}
            <Box
              sx={{
                border: "1px solid rgba(255,255,255,0.22)",
                bgcolor: "rgba(255,255,255,0.12)",
                borderRadius: "16px",
                px: 2.5,
                py: 1.5,
                minWidth: 180,
                backdropFilter: "blur(10px)",
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 0.5 }}
              >
                <NotificationsActiveRoundedIcon
                  sx={{ color: "#FDE68A", fontSize: 18 }}
                />
                <Typography
                  sx={{
                    fontSize: "0.8125rem",
                    color: "rgba(255,255,255,0.85)",
                    fontWeight: 600,
                  }}
                >
                  Next Event
                </Typography>
              </Stack>
              <Typography
                sx={{
                  fontSize: "2.5rem",
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "#FFFFFF",
                }}
              >
                {Number.isFinite(nextEventDays)
                  ? `${nextEventDays} days`
                  : "No events"}
              </Typography>
            </Box>
          </Stack>

          {/* Stats Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
              gap: 1.5,
            }}
          >
            <StatCard
              icon={<EventRoundedIcon />}
              label="Total Events"
              value={String(totalEvents)}
            />
            <StatCard
              icon={<SettingsRoundedIcon />}
              label="Managing"
              value={String(managedEvents.length)}
            />
            <StatCard
              icon={<EmojiEventsRoundedIcon />}
              label="Registered"
              value={String(registeredEvents.length)}
            />
            <StatCard
              icon={<AutoAwesomeRoundedIcon />}
              label="This Week"
              value={String(upcomingThisWeek)}
            />
          </Box>
        </Box>

        {loading ? (
          <Card sx={{ borderRadius: 3 }}>
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

        {!loading && !error && !hasEvents ? (
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <EventRoundedIcon
                sx={{ fontSize: 56, color: "#9810FA", mb: 1 }}
              />
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                No upcoming events
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                You don't have any tournaments scheduled yet.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate("/tournaments")}
              >
                Browse Tournaments
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <ManagedEventsSection
          events={managedEvents}
          expandedByEvent={expandedByEvent}
          detailsByEvent={detailsByEvent}
          onToggleDetails={toggleDetails}
          onManage={(eventId) => navigate(`/tournaments/${eventId}/setup`)}
        />

        <RegisteredEventsSection
          events={registeredEvents}
          expandedByEvent={expandedByEvent}
          detailsByEvent={detailsByEvent}
          onViewDetails={(eventId) => navigate(`/tournaments/${eventId}`)}
        />
      </Stack>
    </Box>
  );
}

// Hero Stat Card Component
function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: "12px",
        bgcolor: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.15)",
        backdropFilter: "blur(10px)",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Box sx={{ color: "rgba(255,255,255,0.9)", fontSize: 18 }}>{icon}</Box>
        <Typography
          sx={{
            fontSize: "0.8125rem",
            color: "rgba(255,255,255,0.8)",
            fontWeight: 500,
          }}
        >
          {label}
        </Typography>
      </Stack>
      <Typography
        sx={{
          fontSize: "2rem",
          fontWeight: 900,
          lineHeight: 1,
          color: "#FFFFFF",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// Managed Events Section
function ManagedEventsSection({
  events,
  expandedByEvent,
  detailsByEvent,
  onToggleDetails,
  onManage,
}: {
  events: ApiEvent[];
  expandedByEvent: Record<number, boolean>;
  detailsByEvent: Record<number, EventDetailsState>;
  onToggleDetails: (eventId: number, isCreator: boolean) => void;
  onManage: (eventId: number) => void;
}) {
  if (!events.length) return null;

  return (
    <Box>
      {/* Section Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "14px",
            background: "linear-gradient(135deg, #E17100 0%, #F54900 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          <EmojiEventsRoundedIcon sx={{ fontSize: 24, color: "#FFFFFF" }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#101828",
              lineHeight: 1.33,
            }}
          >
            Tournaments I'm Managing
          </Typography>
          <Typography
            sx={{
              fontSize: "0.875rem",
              color: "#4A5565",
              lineHeight: 1.43,
            }}
          >
            Monitor performance and manage your events
          </Typography>
        </Box>
        <Chip
          label={`${events.length} Active`}
          sx={{
            bgcolor: "#FEF3C6",
            color: "#BB4D00",
            fontWeight: 700,
            fontSize: "0.875rem",
            height: 36,
            borderRadius: "999px",
            px: 1,
          }}
        />
      </Stack>

      {/* Event Cards */}
      <Stack spacing={2}>
        {events.map((event) => {
          const eventId = Number(event.id);
          const expanded = Boolean(expandedByEvent[eventId]);
          const details = detailsByEvent[eventId];
          const stats = deriveMockStats(eventId);
          const dUntil = daysUntil(event.startDate);

          return (
            <Card
              key={`managed-${eventId}`}
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid #FFC795",
                boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
              }}
            >
              {/* Orange gradient top border */}
              <Box
                sx={{
                  height: 6,
                  background:
                    "linear-gradient(90deg, #FE9A00 0%, #FF6900 50%, #E17100 100%)",
                }}
              />
              <CardContent sx={{ p: 3 }}>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
                  {/* Left: Icon + Info */}
                  <Stack direction="row" spacing={2} sx={{ flex: 1 }}>
                    {/* Icon */}
                    <Box sx={{ position: "relative", flexShrink: 0 }}>
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: "16px",
                          background:
                            "linear-gradient(135deg, #E17100 0%, #F54900 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow:
                            "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.1)",
                        }}
                      >
                        <EmojiEventsRoundedIcon
                          sx={{ fontSize: 40, color: "#FFFFFF" }}
                        />
                      </Box>
                      {/* Crown badge */}
                      <Box
                        sx={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, #FE9A00 0%, #FF6900 100%)",
                          border: "2px solid #FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow:
                            "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.1)",
                        }}
                      >
                        <WorkspacePremiumRoundedIcon
                          sx={{ fontSize: 20, color: "#FFFFFF" }}
                        />
                      </Box>
                      {/* Days until badge */}
                      {dUntil != null && dUntil <= 7 ? (
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: -8,
                            left: -8,
                            height: 32,
                            px: 1.5,
                            borderRadius: "999px",
                            bgcolor: "#FF6900",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow:
                              "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.1)",
                            opacity: 0.76,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#FFFFFF",
                              lineHeight: "16px",
                            }}
                          >
                            {dUntil === 0 ? "TODAY" : `${dUntil}d`}
                          </Typography>
                        </Box>
                      ) : null}
                    </Box>

                    {/* Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
                        <Typography
                          sx={{
                            fontSize: "1.25rem",
                            fontWeight: 700,
                            color: "#101828",
                            lineHeight: 1.4,
                          }}
                        >
                          {event.name || event.title || "Tournament"}
                        </Typography>
                        <Chip
                          icon={
                            <WorkspacePremiumRoundedIcon
                              sx={{
                                fontSize: 12,
                                color: "#BB4D00",
                                ml: "4px !important",
                              }}
                            />
                          }
                          label="ORGANIZER"
                          sx={{
                            background:
                              "linear-gradient(90deg, #FEF3C6 0%, #FFEDD4 100%)",
                            border: "1px solid #FFD230",
                            color: "#BB4D00",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            height: 26,
                            borderRadius: "999px",
                          }}
                        />
                      </Stack>

                      {/* Location, Date, Time Grid */}
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            md: "repeat(3, 1fr)",
                          },
                          gap: 1.5,
                          mb: 1.5,
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: "10px",
                              bgcolor: "#FEF3C6",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <LocationOnOutlinedIcon
                              sx={{ fontSize: 16, color: "#E17100" }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: "0.75rem",
                                color: "#6A7282",
                                lineHeight: 1.33,
                              }}
                            >
                              Location
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "#101828",
                                lineHeight: 1.43,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {event.locationName || "TBD"}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: "10px",
                              bgcolor: "#FEF3C6",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <CalendarMonthOutlinedIcon
                              sx={{ fontSize: 16, color: "#E17100" }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: "0.75rem",
                                color: "#6A7282",
                                lineHeight: 1.33,
                              }}
                            >
                              Date
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "#101828",
                                lineHeight: 1.43,
                              }}
                            >
                              {prettyDate(event.startDate)}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: "10px",
                              bgcolor: "#FEF3C6",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <AccessTimeOutlinedIcon
                              sx={{ fontSize: 16, color: "#E17100" }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: "0.75rem",
                                color: "#6A7282",
                                lineHeight: 1.33,
                              }}
                            >
                              Time
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "#101828",
                                lineHeight: 1.43,
                              }}
                            >
                              {prettyTimeRange(event.startTime, event.endTime)}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>

                      {/* Category badges */}
                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        {(details?.categories?.length
                          ? details.categories.map(
                              (category) =>
                                category.name || `Category #${category.id}`,
                            )
                          : derivePreviewCategories(eventId)
                        )
                          .slice(0, 3)
                          .map((label) => (
                            <Chip
                              key={`managed-cat-${eventId}-${label}`}
                              label={label}
                              sx={{
                                bgcolor: "#FEF3C6",
                                border: "1px solid #FFE5A0",
                                color: "#BB4D00",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                height: 24,
                                borderRadius: "6px",
                              }}
                            />
                          ))}
                      </Stack>
                    </Box>
                  </Stack>

                  {/* Right: Stats + Actions */}
                  <Stack
                    spacing={2}
                    sx={{
                      minWidth: { lg: 320 },
                      width: { xs: "100%", lg: "auto" },
                    }}
                  >
                    {/* Stats Box */}
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: "#FEF3C6",
                        border: "1px solid #FFE5A0",
                      }}
                    >
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: 2,
                        }}
                      >
                        {/* Registered */}
                        <Stack spacing={0.5} alignItems="center">
                          <GroupsRoundedIcon
                            sx={{ fontSize: 20, color: "#E17100" }}
                          />
                          <Typography
                            sx={{
                              fontSize: "1.5rem",
                              fontWeight: 700,
                              color: "#E17100",
                              lineHeight: 1,
                            }}
                          >
                            {stats.registered}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.75rem",
                              color: "#6A7282",
                              textAlign: "center",
                            }}
                          >
                            Registered
                          </Typography>
                        </Stack>

                        {/* Fill Rate */}
                        <Stack spacing={0.5} alignItems="center">
                          <TrendingUpRoundedIcon
                            sx={{ fontSize: 20, color: "#00A63E" }}
                          />
                          <Typography
                            sx={{
                              fontSize: "1.5rem",
                              fontWeight: 700,
                              color: "#00A63E",
                              lineHeight: 1,
                            }}
                          >
                            {stats.fillRate}%
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.75rem",
                              color: "#6A7282",
                              textAlign: "center",
                            }}
                          >
                            Fill Rate
                          </Typography>
                        </Stack>

                        {/* Revenue */}
                        <Stack spacing={0.5} alignItems="center">
                          <AttachMoneyRoundedIcon
                            sx={{ fontSize: 20, color: "#364153" }}
                          />
                          <Typography
                            sx={{
                              fontSize: "1.5rem",
                              fontWeight: 700,
                              color: "#364153",
                              lineHeight: 1,
                            }}
                          >
                            ${stats.revenue}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.75rem",
                              color: "#6A7282",
                              textAlign: "center",
                            }}
                          >
                            Revenue
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={1.5}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => onManage(eventId)}
                        startIcon={
                          <SettingsRoundedIcon sx={{ fontSize: 16 }} />
                        }
                        endIcon={<ChevronRightRoundedIcon />}
                        sx={{
                          borderRadius: "10px",
                          background: "#E17100",
                          fontWeight: 600,
                          px: 3,
                          py: 1.5,
                          textTransform: "none",
                          fontSize: "1rem",
                          "&:hover": {
                            background: "#C96400",
                          },
                        }}
                      >
                        Manage
                      </Button>
                      <IconButton
                        onClick={() => onToggleDetails(eventId, true)}
                        sx={{
                          borderRadius: "10px",
                          bgcolor: "#FEF3C6",
                          border: "1px solid #FFE5A0",
                          width: 56,
                          height: 56,
                          "&:hover": {
                            bgcolor: "#FFEDD4",
                          },
                        }}
                      >
                        <GroupsRoundedIcon
                          sx={{ fontSize: 20, color: "#E17100" }}
                        />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Stack>

                <Collapse in={expanded}>
                  {details?.loading ? (
                    <Box sx={{ mt: 2 }}>
                      <CircularProgress size={20} />
                    </Box>
                  ) : details?.error ? (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {details.error}
                    </Alert>
                  ) : null}
                </Collapse>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}

// Registered Events Section
function RegisteredEventsSection({
  events,
  expandedByEvent,
  detailsByEvent,
  onViewDetails,
}: {
  events: ApiEvent[];
  expandedByEvent: Record<number, boolean>;
  detailsByEvent: Record<number, EventDetailsState>;
  onViewDetails: (eventId: number) => void;
}) {
  if (!events.length) return null;

  return (
    <Box>
      {/* Section Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "14px",
            background: "linear-gradient(135deg, #8B5CF6 0%, #4F46E5 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          <EmojiEventsRoundedIcon sx={{ fontSize: 24, color: "#FFFFFF" }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#101828",
              lineHeight: 1.33,
            }}
          >
            My Tournaments
          </Typography>
          <Typography
            sx={{
              fontSize: "0.875rem",
              color: "#4A5565",
              lineHeight: 1.43,
            }}
          >
            Events you're participating in
          </Typography>
        </Box>
        <Chip
          label={`${events.length} Registered`}
          sx={{
            bgcolor: "#F3E8FF",
            color: "#8200DB",
            fontWeight: 700,
            fontSize: "0.875rem",
            height: 36,
            borderRadius: "999px",
            px: 1,
          }}
        />
      </Stack>

      {/* Event Cards */}
      <Stack spacing={2}>
        {events.map((event) => {
          const eventId = Number(event.id);
          const expanded = Boolean(expandedByEvent[eventId]);
          const details = detailsByEvent[eventId];
          const dUntil = daysUntil(event.startDate);

          return (
            <Card
              key={`registered-${eventId}`}
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid #E5E7EB",
                boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction={{ xs: "column", lg: "row" }}
                  spacing={3}
                  alignItems={{ lg: "center" }}
                >
                  {/* Left: Icon + Info */}
                  <Stack direction="row" spacing={2} sx={{ flex: 1 }}>
                    {/* Icon */}
                    <Box sx={{ position: "relative", flexShrink: 0 }}>
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: "16px",
                          background:
                            "linear-gradient(135deg, #8B5CF6 0%, #4F46E5 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow:
                            "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.1)",
                        }}
                      >
                        <EmojiEventsRoundedIcon
                          sx={{ fontSize: 40, color: "#FFFFFF" }}
                        />
                      </Box>
                      {/* Days until badge - top-right corner like in the screenshot */}
                      {dUntil != null && dUntil <= 7 ? (
                        <Box
                          sx={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                            height: 32,
                            px: 1.5,
                            borderRadius: "999px",
                            bgcolor: "#FF6900",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow:
                              "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.1)",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#FFFFFF",
                              lineHeight: "16px",
                            }}
                          >
                            {dUntil === 0 ? "TODAY" : `${dUntil}d`}
                          </Typography>
                        </Box>
                      ) : null}
                    </Box>

                    {/* Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
                        <Typography
                          sx={{
                            fontSize: "1.25rem",
                            fontWeight: 700,
                            color: "#101828",
                            lineHeight: 1.4,
                          }}
                        >
                          {event.name || event.title || "Tournament"}
                        </Typography>
                        <Chip
                          icon={
                            <CheckCircleRoundedIcon
                              sx={{
                                fontSize: 12,
                                color: "#008236",
                                ml: "4px !important",
                              }}
                            />
                          }
                          label={getAttendeeStageLabel(event).toUpperCase()}
                          sx={{
                            bgcolor: "#DCFCE7",
                            color: "#008236",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            height: 26,
                            borderRadius: "999px",
                          }}
                        />
                      </Stack>

                      {/* Location, Date, Time */}
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            md: "repeat(3, 1fr)",
                          },
                          gap: 1.5,
                          mb: 1.5,
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: "10px",
                              bgcolor: "#F3E8FF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <LocationOnOutlinedIcon
                              sx={{ fontSize: 16, color: "#8B5CF6" }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: "0.75rem",
                                color: "#6A7282",
                                lineHeight: 1.33,
                              }}
                            >
                              Location
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "#101828",
                                lineHeight: 1.43,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {event.locationName || "TBD"}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: "10px",
                              bgcolor: "#F3E8FF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <CalendarMonthOutlinedIcon
                              sx={{ fontSize: 16, color: "#8B5CF6" }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: "0.75rem",
                                color: "#6A7282",
                                lineHeight: 1.33,
                              }}
                            >
                              Date
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "#101828",
                                lineHeight: 1.43,
                              }}
                            >
                              {prettyDate(event.startDate)}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: "10px",
                              bgcolor: "#F3E8FF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <AccessTimeOutlinedIcon
                              sx={{ fontSize: 16, color: "#8B5CF6" }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: "0.75rem",
                                color: "#6A7282",
                                lineHeight: 1.33,
                              }}
                            >
                              Time
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "#101828",
                                lineHeight: 1.43,
                              }}
                            >
                              {prettyTimeRange(event.startTime, event.endTime)}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>

                      {/* Category badges */}
                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        {(details?.categories?.length
                          ? details.categories.map(
                              (category) =>
                                category.name || `Category #${category.id}`,
                            )
                          : derivePreviewCategories(eventId)
                        )
                          .slice(0, 3)
                          .map((label) => (
                            <Chip
                              key={`registered-cat-${eventId}-${label}`}
                              label={label}
                              sx={{
                                bgcolor: "#F3E8FF",
                                border: "1px solid #E9D5FF",
                                color: "#8200DB",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                height: 24,
                                borderRadius: "6px",
                              }}
                            />
                          ))}
                      </Stack>
                    </Box>
                  </Stack>

                  {/* Right: Action Button */}
                  <Button
                    variant="contained"
                    onClick={() => onViewDetails(eventId)}
                    endIcon={<ChevronRightRoundedIcon />}
                    sx={{
                      borderRadius: "10px",
                      background: "#9810FA",
                      fontWeight: 600,
                      px: 4,
                      py: 1.5,
                      textTransform: "none",
                      fontSize: "1rem",
                      minWidth: { lg: 180 },
                      "&:hover": {
                        background: "#8200DB",
                      },
                    }}
                  >
                    View Details
                  </Button>
                </Stack>

                <Collapse in={expanded}>
                  {details?.loading ? (
                    <Box sx={{ mt: 2 }}>
                      <CircularProgress size={20} />
                    </Box>
                  ) : details?.error ? (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {details.error}
                    </Alert>
                  ) : null}
                </Collapse>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
