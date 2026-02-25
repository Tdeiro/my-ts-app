import * as React from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Chip,
  Alert,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import {
  getLoggedInRole,
  getToken,
  hasCreatorAccess,
  isParticipantRole,
} from "../auth/tokens";
import SelectActionCard from "../Components/Shared/SelectActionCard";
import WeeklyScheduleCard, {
  type WeeklyClass,
} from "../Components/Shared/WeeklyScheduleCard";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type DashboardState = {
  loading: boolean;
  error: string | null;
  apiStatus: number | null;
  viewData: DashboardViewData;
};

type DashboardViewData = {
  upcomingTitle: string;
  upcomingSubtitle: string;
  todaySessions: number;
  todayStudents: number;
  activeTournaments: number;
  weekRangeLabel: string;
  weekSessions: number;
  weekStudents: number;
  weeklyClasses: WeeklyClass[];
  openTournaments: Array<{
    id: string;
    name: string;
    when: string;
  }>;
  joinedTournaments: Array<{
    id: string;
    eventId: number;
    name: string;
    when: string;
  }>;
  myTournaments: Array<{
    id: string;
    name: string;
    when: string;
  }>;
  openClasses: Array<{
    id: string;
    title: string;
    when: string;
  }>;
  latestClasses: Array<{
    id: string;
    title: string;
    when: string;
  }>;
  upcomingClasses: Array<{
    id: string;
    title: string;
    when: string;
  }>;
};

type ApiEvent = {
  id: number | string;
  createdBy?: number | string;
  userId?: number | string;
  user_id?: number | string;
  name?: string;
  title?: string;
  eventType?: string;
  startDate?: string;
  status?: string;
};

type ApiClass = {
  id: number | string;
  userId?: number | string;
  user_id?: number | string;
  title?: string;
  level?: string;
  weekDay?: string;
  monthDate?: string;
  startTime?: string;
  endTime?: string;
  students?: number | string;
  capacity?: number | string;
  status?: string;
};

type DashboardApiResp = {
  events?: ApiEvent[] | null;
  classes?: ApiClass[] | null;
};

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

function toDateOnly(value?: string): string {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
}

function toClock(value?: string): string {
  if (!value) return "—";
  const match = String(value).match(/^(\d{2}):(\d{2})/);
  if (!match) return String(value);
  const hour = Number(match[1]);
  const minute = match[2];
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}

function toDayLabel(input: unknown): string {
  const value = String(input ?? "");
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  if (dayNames.includes(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split("-").map(Number);
    return dayNames[new Date(y, m - 1, d).getDay()];
  }
  return "Monday";
}

function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = target.getTime() - today.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function Dashboard() {
  const navigate = useNavigate();

  const token = getToken(); // pp_token
  const user = token ? parseJwt(token) : null;
  const role = getLoggedInRole();
  const isParticipant = isParticipantRole(role);
  const canCreate = hasCreatorAccess(role);

  const [state, setState] = React.useState<DashboardState>({
    loading: false,
    error: null,
    apiStatus: null,
    viewData: {
      upcomingTitle: "No upcoming events",
      upcomingSubtitle: "—",
      todaySessions: 0,
      todayStudents: 0,
      activeTournaments: 0,
      weekRangeLabel: "This week",
      weekSessions: 0,
      weekStudents: 0,
      weeklyClasses: [],
      openTournaments: [],
      joinedTournaments: [],
      myTournaments: [],
      openClasses: [],
      latestClasses: [],
      upcomingClasses: [],
    },
  });
  const [withdrawingEventId, setWithdrawingEventId] = React.useState<number | null>(null);
  const viewData = state.viewData;
  const joinedTournamentIds = React.useMemo(
    () => new Set(viewData.joinedTournaments.map((item) => item.id)),
    [viewData.joinedTournaments],
  );

  const handleRedirect = () => navigate("/tournaments/new");

  const handleWithdrawJoinedTournament = async (eventId: number) => {
    if (!token) return;
      setWithdrawingEventId(eventId);
    try {
      const res = await fetch(`${API_URL}/events/${eventId}/subscriptions/me/withdraw`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          body?.message?.[0] ||
          body?.error ||
          "Could not withdraw from this tournament.";
        throw new Error(msg);
      }

      setState((prev) => ({
        ...prev,
        viewData: {
          ...prev.viewData,
          joinedTournaments: prev.viewData.joinedTournaments.filter(
            (item) => Number(item.eventId) !== Number(eventId),
          ),
        },
      }));
    } catch (e: any) {
      setState((s) => ({
        ...s,
        error: e?.message || "Could not withdraw from this tournament.",
      }));
    } finally {
      setWithdrawingEventId(null);
    }
  };

  React.useEffect(() => {
    // No token? Don’t call backend.
    if (!token) {
      setState((s) => ({
        ...s,
        error: "No token found. Please sign in again.",
        apiStatus: null,
      }));
      return;
    }

    let cancelled = false;

    const run = async () => {
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const dashboardRes = await fetch(`${API_URL}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dashboardBody = await dashboardRes.json().catch(() => null);

        if (cancelled) return;

        if (!dashboardRes.ok) {
          const message =
            dashboardBody?.message?.[0] ||
            dashboardBody?.error ||
            "Failed to load dashboard data";
          setState((s) => ({
            ...s,
            loading: false,
            apiStatus: dashboardRes.status,
            error: message,
          }));
          return;
        }

        const currentUserId = Number(user?.id);
        const payload: DashboardApiResp =
          dashboardBody && typeof dashboardBody === "object" ? dashboardBody : {};
        const scopedEvents: ApiEvent[] = Array.isArray(payload.events)
          ? payload.events
          : [];
        const scopedClasses: ApiClass[] = Array.isArray(payload.classes)
          ? payload.classes
          : [];

        const todayStr = toDateOnly(new Date().toISOString());
        const weekStart = getMonday(new Date());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const weekRangeLabel = `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`;
        const tournaments = scopedEvents.filter(
          (e) => String(e.eventType ?? "").toUpperCase() === "TOURNAMENT",
        );
        const joinedTournaments = tournaments
          .filter((t) => Number(t.createdBy) !== currentUserId)
          .sort((a, b) => toDateOnly(a.startDate).localeCompare(toDateOnly(b.startDate)))
          .map((t) => ({
            id: String(t.id),
            eventId: Number(t.id),
            name: String(t.name ?? t.title ?? "Tournament"),
            when: toDateOnly(t.startDate) || "TBD",
          }));
        const myTournaments = tournaments
          .filter((t) => Number(t.createdBy) === currentUserId)
          .sort((a, b) => toDateOnly(a.startDate).localeCompare(toDateOnly(b.startDate)))
          .map((t) => ({
            id: String(t.id),
            name: String(t.name ?? t.title ?? "Tournament"),
            when: toDateOnly(t.startDate) || "TBD",
          }));
        const upcomingTournament = tournaments
          .filter((e) => {
            const date = toDateOnly(e.startDate);
            return !!date && date >= todayStr;
          })
          .sort((a, b) => toDateOnly(a.startDate).localeCompare(toDateOnly(b.startDate)))[0];

        const todayClasses = scopedClasses.filter(
          (c) => toDateOnly(c.monthDate) === todayStr,
        );
        const todayStudents = todayClasses.reduce(
          (sum, c) => sum + Math.max(0, Number(c.students ?? 0) || 0),
          0,
        );

        const activeTournaments = tournaments.filter((t) => {
          const status = String(t.status ?? "").toUpperCase();
          if (status) return ["ACTIVE", "OPEN", "ONGOING"].includes(status);
          const date = toDateOnly(t.startDate);
          return !!date && date >= todayStr;
        }).length;

        const weeklyClasses: WeeklyClass[] = scopedClasses
          .filter((c) => !!c.monthDate)
          .filter((c) => {
            const date = toDateOnly(c.monthDate);
            if (!date) return false;
            const target = new Date(`${date}T00:00:00`);
            return target >= weekStart && target <= weekEnd;
          })
          .sort((a, b) => {
            const dateCompare = toDateOnly(a.monthDate).localeCompare(
              toDateOnly(b.monthDate),
            );
            if (dateCompare !== 0) return dateCompare;
            return String(a.startTime ?? "").localeCompare(String(b.startTime ?? ""));
          })
          .slice(0, 12)
          .map((c, idx) => ({
            id: String(c.id ?? `c-${idx}`),
            level: String(c.level ?? "beginner").toLowerCase(),
            startAt: toClock(c.startTime),
            finishesAt: toClock(c.endTime),
            date: toDayLabel(c.weekDay ?? c.monthDate),
            students: Math.max(0, Number(c.students ?? 0) || 0),
            capacity:
              c.capacity == null ? null : Math.max(0, Number(c.capacity) || 0),
            isFull:
              String(c.status ?? "").toUpperCase() === "FULL" ||
              (c.capacity != null &&
                Number(c.capacity) > 0 &&
                Number(c.students ?? 0) >= Number(c.capacity)),
          }));
        const weekStudents = weeklyClasses.reduce((sum, w) => {
          const source = scopedClasses.find((c) => String(c.id) === w.id);
          return sum + Math.max(0, Number(source?.students ?? 0) || 0);
        }, 0);

        const openTournaments = tournaments
          .filter((t) => {
            const status = String(t.status ?? "").toUpperCase();
            if (status) return ["OPEN", "ACTIVE", "ONGOING"].includes(status);
            const date = toDateOnly(t.startDate);
            return !!date && date >= todayStr;
          })
          .sort((a, b) => toDateOnly(a.startDate).localeCompare(toDateOnly(b.startDate)))
          .slice(0, 4)
          .map((t) => ({
            id: String(t.id),
            name: String(t.name ?? t.title ?? "Tournament"),
            when: toDateOnly(t.startDate) || "TBD",
          }));

        const openClasses = scopedClasses
          .filter((c) => {
            const date = toDateOnly(c.monthDate);
            if (!date || date < todayStr) return false;
            const status = String(c.status ?? "").toUpperCase();
            return !status || status === "ACTIVE" || status === "OPEN";
          })
          .sort((a, b) => toDateOnly(a.monthDate).localeCompare(toDateOnly(b.monthDate)))
          .slice(0, 4)
          .map((c) => ({
            id: String(c.id),
            title: String(c.title ?? "Class"),
            when: `${toDateOnly(c.monthDate)} • ${toClock(c.startTime)}`,
          }));

        const latestClasses = scopedClasses
          .filter((c) => {
            const date = toDateOnly(c.monthDate);
            return !!date && date < todayStr;
          })
          .sort((a, b) => toDateOnly(b.monthDate).localeCompare(toDateOnly(a.monthDate)))
          .slice(0, 4)
          .map((c) => ({
            id: String(c.id),
            title: String(c.title ?? "Class"),
            when: `${toDateOnly(c.monthDate)} • ${toClock(c.startTime)}`,
          }));

        const upcomingClasses = scopedClasses
          .filter((c) => {
            const date = toDateOnly(c.monthDate);
            return !!date && date >= todayStr;
          })
          .sort((a, b) => toDateOnly(a.monthDate).localeCompare(toDateOnly(b.monthDate)))
          .slice(0, 4)
          .map((c) => ({
            id: String(c.id),
            title: String(c.title ?? "Class"),
            when: `${toDateOnly(c.monthDate)} • ${toClock(c.startTime)}`,
          }));

        const upcomingTitle = upcomingTournament
          ? String(upcomingTournament.name ?? upcomingTournament.title ?? "Tournament")
          : "No upcoming events";
        const upcomingSubtitle = upcomingTournament
          ? (() => {
              const days = daysUntil(toDateOnly(upcomingTournament.startDate));
              if (days <= 0) return "Today";
              if (days === 1) return "In 1 day";
              return `In ${days} days`;
            })()
          : "—";

        setState((s) => ({
          ...s,
          loading: false,
          apiStatus: 200,
          viewData: {
            upcomingTitle,
            upcomingSubtitle,
            todaySessions: todayClasses.length,
            todayStudents,
            activeTournaments,
            weekRangeLabel,
            weekSessions: weeklyClasses.length,
            weekStudents,
            weeklyClasses,
            openTournaments,
            joinedTournaments,
            myTournaments,
            openClasses,
            latestClasses,
            upcomingClasses,
          },
          error: null,
        }));
      } catch (e: any) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e?.message || "Failed to reach backend",
        }));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token, user?.id]);

  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        minWidth: 0,
        p: { xs: 2, md: 3 },
        // match AppShell’s “premium” background vibe
        background:
          "linear-gradient(180deg, rgba(139,92,246,0.06) 0%, rgba(255,255,255,0) 35%)",
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          maxWidth: 1100,
          mx: "auto",
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
          mb: 2.5,
          flexWrap: "wrap",
        }}
      >
        <Stack spacing={0.75}>
          <Typography variant="h2" sx={{ fontSize: 22, fontWeight: 800 }}>
            Dashboard
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
          >
            <Typography variant="body2" color="text.secondary">
              Welcome back
            </Typography>

            {role ? (
              <Chip
                size="small"
                label={String(role)}
                sx={{
                  bgcolor: "rgba(139, 92, 246, 0.10)",
                  color: "primary.main",
                  fontWeight: 700,
                }}
              />
            ) : null}

          </Stack>
        </Stack>

        {canCreate ? (
          <Button
            variant="contained"
            size="large"
            startIcon={<AddRoundedIcon />}
            onClick={handleRedirect}
            sx={{
              width: { xs: "100%", sm: "auto" },
              minWidth: { xs: 0, sm: 200 },
              borderRadius: 2,
              background:
                "linear-gradient(90deg, #8B5CF6 0%, #A855F7 55%, #7C3AED 100%)",
              "&:hover": {
                background:
                  "linear-gradient(90deg, #7C3AED 0%, #9333EA 55%, #6D28D9 100%)",
              },
            }}
          >
            Create Event
          </Button>
        ) : null}
      </Box>

      {/* Auth/API feedback */}
      <Box sx={{ maxWidth: 1100, mx: "auto", mb: 2 }}>
        {!token ? (
          <Alert severity="warning">
            You’re not authenticated. Go to <b>Sign in</b> and try again.
          </Alert>
        ) : state.error ? (
          <Alert severity="error">{state.error}</Alert>
        ) : state.loading ? (
          <Alert severity="info">Loading dashboard…</Alert>
        ) : null}
      </Box>

      {/* Content cards */}
      <Box
        sx={{
          maxWidth: 1100,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {isParticipant ? (
          <Stack spacing={2}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
                  Welcome back, {user?.fullName || "Player"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Track your latest classes, see what is coming next, and
                  explore open tournaments to participate.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                  <Button
                    variant="contained"
                    onClick={() => navigate("/classes")}
                    sx={{ borderRadius: 999 }}
                  >
                    Browse Classes
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/tournaments")}
                    sx={{ borderRadius: 999 }}
                  >
                    Explore Tournaments
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
              <Card sx={{ flex: 1, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                    Your Joined Tournaments
                  </Typography>
                  <Stack spacing={1.25}>
                    {viewData.joinedTournaments.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No tournament subscriptions yet.
                      </Typography>
                    ) : (
                      viewData.joinedTournaments.map((item) => (
                        <Box
                          key={item.id}
                          sx={{
                            p: 1.25,
                            border: "1px solid rgba(15,23,42,0.08)",
                            borderRadius: 1.5,
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: { xs: "flex-start", sm: "center" },
                            justifyContent: "space-between",
                            gap: 1.5,
                          }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.when}
                            </Typography>
                          </Box>
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() =>
                                navigate(
                                  `/events/upcoming?eventId=${encodeURIComponent(String(item.eventId))}`
                                )
                              }
                              sx={{ borderRadius: 999, width: { xs: "100%", sm: "auto" } }}
                            >
                              View
                            </Button>
                            <Button
                              size="small"
                              color="warning"
                              variant="contained"
                              disabled={withdrawingEventId === item.eventId}
                              onClick={() =>
                                handleWithdrawJoinedTournament(item.eventId)
                              }
                              sx={{ borderRadius: 999, width: { xs: "100%", sm: "auto" } }}
                            >
                              {withdrawingEventId === item.eventId
                                ? "Withdrawing..."
                                : "Withdraw"}
                            </Button>
                          </Stack>
                        </Box>
                      ))
                    )}
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                    Your Latest Classes
                  </Typography>
                  <Stack spacing={1.25}>
                    {viewData.latestClasses.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No previous classes yet.
                      </Typography>
                    ) : (
                      viewData.latestClasses.map((item) => (
                        <Box
                          key={item.id}
                          sx={{
                            p: 1.25,
                            border: "1px solid rgba(15,23,42,0.08)",
                            borderRadius: 1.5,
                          }}
                        >
                          <Typography sx={{ fontWeight: 700 }}>
                            {item.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.when}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                    Upcoming Classes For You
                  </Typography>
                  <Stack spacing={1.25}>
                    {viewData.upcomingClasses.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No upcoming classes right now.
                      </Typography>
                    ) : (
                      viewData.upcomingClasses.map((item) => (
                        <Box
                          key={item.id}
                          sx={{
                            p: 1.25,
                            border: "1px solid rgba(15,23,42,0.08)",
                            borderRadius: 1.5,
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: { xs: "flex-start", sm: "center" },
                            justifyContent: "space-between",
                            gap: 2,
                          }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>
                              {item.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.when}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => navigate("/classes")}
                            sx={{ borderRadius: 999, width: { xs: "100%", sm: "auto" } }}
                          >
                            Participate
                          </Button>
                        </Box>
                      ))
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>

            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                  Explore Open Tournaments
                </Typography>
                <Stack spacing={1.25}>
                  {viewData.openTournaments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No open tournaments right now.
                    </Typography>
                  ) : (
                    viewData.openTournaments.map((item) => (
                      <Box
                        key={item.id}
                        sx={{
                          p: 1.25,
                          border: "1px solid rgba(15,23,42,0.08)",
                          borderRadius: 1.5,
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          alignItems: { xs: "flex-start", sm: "center" },
                          justifyContent: "space-between",
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>
                            {item.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.when}
                          </Typography>
                        </Box>
                        {joinedTournamentIds.has(item.id) ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              navigate(
                                `/events/upcoming?eventId=${encodeURIComponent(item.id)}`,
                              )
                            }
                            sx={{ borderRadius: 999, width: { xs: "100%", sm: "auto" } }}
                          >
                            Joined
                          </Button>
                        ) : (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() =>
                            navigate(
                              `/tournaments/invite?inviteTournamentId=${encodeURIComponent(item.id)}`,
                            )
                          }
                          sx={{ borderRadius: 999, width: { xs: "100%", sm: "auto" } }}
                        >
                          Join
                        </Button>
                        )}
                      </Box>
                    ))
                  )}
                </Stack>
                <Button
                  variant="outlined"
                  sx={{ mt: 1.5, borderRadius: 999 }}
                  onClick={() => navigate("/tournaments")}
                >
                  View All Open Tournaments
                </Button>
              </CardContent>
            </Card>
          </Stack>
        ) : (
          <>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ md: "center" }}
                  sx={{ mb: 1 }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      Weekly Overview
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {viewData.weekRangeLabel}
                    </Typography>
                  </Box>
                </Stack>
                <Divider sx={{ mb: 1.5 }} />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <MetricCard label="Sessions This Week" value={viewData.weekSessions} />
                  <MetricCard label="Students This Week" value={viewData.weekStudents} />
                  <MetricCard
                    label="Active Tournaments"
                    value={viewData.activeTournaments}
                  />
                </Stack>
              </CardContent>
            </Card>
            <SelectActionCard
              upcomingTitle={viewData.upcomingTitle}
              upcomingSubtitle={viewData.upcomingSubtitle}
              todaySessions={viewData.todaySessions}
              todayStudents={viewData.todayStudents}
              activeTournaments={viewData.activeTournaments}
            />
            <WeeklyScheduleCard classes={viewData.weeklyClasses} />
          </>
        )}
      </Box>
    </Box>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 1.5,
        border: "1px solid rgba(15,23,42,0.08)",
        bgcolor: "background.paper",
        minWidth: 0,
        flex: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 900, fontSize: 24, lineHeight: 1.1 }}>
        {value}
      </Typography>
    </Box>
  );
}
