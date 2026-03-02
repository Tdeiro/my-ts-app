import * as React from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Chip,
  Alert,
  Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import {
  getLoggedInRole,
  getToken,
  hasCreatorAccess,
  isParticipantRole,
} from "../auth/tokens";
import { type WeeklyClass } from "../Components/Shared/WeeklyScheduleCard";
import CoachWeeklyScheduleBoard, {
  type CoachScheduleDay,
} from "../Components/Shared/CoachWeeklyScheduleBoard";
import {
  NavigateSummaryCard,
  RevenueMiniBars,
  SectionCard,
} from "../Components/Shared/DashboardDesign";
import { UI_FEATURE_FLAGS } from "../config/featureFlags";
import { coachDashboardMock } from "../mocks/ui";
import { designTokens } from "../Theme/designTokens";
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
  weekRevenue: number;
  previousWeekRevenue: number;
  revenueByDay: Array<{ label: string; value: number }>;
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
  entryFee?: number | string;
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

function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isDateInRange(dateStr: string, start: Date, end: Date): boolean {
  const target = parseDateOnly(dateStr);
  return target >= start && target <= end;
}

function toMoney(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
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
      weekRevenue: 0,
      previousWeekRevenue: 0,
      revenueByDay: [],
      weeklyClasses: [],
      openTournaments: [],
      joinedTournaments: [],
      myTournaments: [],
      openClasses: [],
      latestClasses: [],
      upcomingClasses: [],
    },
  });
  const [withdrawingEventId, setWithdrawingEventId] = React.useState<
    number | null
  >(null);
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
      const res = await fetch(
        `${API_URL}/events/${eventId}/subscriptions/me/withdraw`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
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
          dashboardBody && typeof dashboardBody === "object"
            ? dashboardBody
            : {};
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
        const previousWeekStart = new Date(weekStart);
        previousWeekStart.setDate(weekStart.getDate() - 7);
        const previousWeekEnd = new Date(weekEnd);
        previousWeekEnd.setDate(weekEnd.getDate() - 7);
        const weekRangeLabel = `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`;
        const tournaments = scopedEvents.filter(
          (e) => String(e.eventType ?? "").toUpperCase() === "TOURNAMENT",
        );
        const joinedTournaments = tournaments
          .filter((t) => Number(t.createdBy) !== currentUserId)
          .sort((a, b) =>
            toDateOnly(a.startDate).localeCompare(toDateOnly(b.startDate)),
          )
          .map((t) => ({
            id: String(t.id),
            eventId: Number(t.id),
            name: String(t.name ?? t.title ?? "Tournament"),
            when: toDateOnly(t.startDate) || "TBD",
          }));
        const myTournaments = tournaments
          .filter((t) => Number(t.createdBy) === currentUserId)
          .sort((a, b) =>
            toDateOnly(a.startDate).localeCompare(toDateOnly(b.startDate)),
          )
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
          .sort((a, b) =>
            toDateOnly(a.startDate).localeCompare(toDateOnly(b.startDate)),
          )[0];

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
        const weekRevenue = tournaments.reduce((sum, t) => {
          const date = toDateOnly(t.startDate);
          if (!date || !isDateInRange(date, weekStart, weekEnd)) return sum;
          const fee = Number(t.entryFee ?? 0);
          return sum + (Number.isFinite(fee) ? Math.max(0, fee) : 0);
        }, 0);
        const previousWeekRevenue = tournaments.reduce((sum, t) => {
          const date = toDateOnly(t.startDate);
          if (!date || !isDateInRange(date, previousWeekStart, previousWeekEnd))
            return sum;
          const fee = Number(t.entryFee ?? 0);
          return sum + (Number.isFinite(fee) ? Math.max(0, fee) : 0);
        }, 0);

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
            return String(a.startTime ?? "").localeCompare(
              String(b.startTime ?? ""),
            );
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
        const revenueByDay = Array.from({ length: 7 }).map((_, idx) => {
          const current = new Date(weekStart);
          current.setDate(weekStart.getDate() + idx);
          const dayLabel = current.toLocaleDateString("en-US", {
            weekday: "short",
          });
          const dayIso = current.toISOString().slice(0, 10);
          const dayValue = tournaments.reduce((sum, t) => {
            const date = toDateOnly(t.startDate);
            if (date !== dayIso) return sum;
            const fee = Number(t.entryFee ?? 0);
            return sum + (Number.isFinite(fee) ? Math.max(0, fee) : 0);
          }, 0);
          return { label: dayLabel, value: dayValue };
        });

        const openTournaments = tournaments
          .filter((t) => {
            const status = String(t.status ?? "").toUpperCase();
            if (status) return ["OPEN", "ACTIVE", "ONGOING"].includes(status);
            const date = toDateOnly(t.startDate);
            return !!date && date >= todayStr;
          })
          .sort((a, b) =>
            toDateOnly(a.startDate).localeCompare(toDateOnly(b.startDate)),
          )
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
          .sort((a, b) =>
            toDateOnly(a.monthDate).localeCompare(toDateOnly(b.monthDate)),
          )
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
          .sort((a, b) =>
            toDateOnly(b.monthDate).localeCompare(toDateOnly(a.monthDate)),
          )
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
          .sort((a, b) =>
            toDateOnly(a.monthDate).localeCompare(toDateOnly(b.monthDate)),
          )
          .slice(0, 4)
          .map((c) => ({
            id: String(c.id),
            title: String(c.title ?? "Class"),
            when: `${toDateOnly(c.monthDate)} • ${toClock(c.startTime)}`,
          }));

        const upcomingTitle = upcomingTournament
          ? String(
              upcomingTournament.name ??
                upcomingTournament.title ??
                "Tournament",
            )
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
            weekRevenue,
            previousWeekRevenue,
            revenueByDay,
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

  const userDisplayName =
    String(user?.fullName ?? user?.email ?? "user")
      .split("@")[0]
      .trim() || "user";
  const managedTournamentsCount = viewData.myTournaments.length;
  const registeredTournamentsCount = viewData.joinedTournaments.length;
  const derivedCoachScheduleDays = buildCoachScheduleDaysFromWeeklyClasses(
    viewData.weeklyClasses,
  );
  const hasRealCoachScheduleItems = derivedCoachScheduleDays.some(
    (day) => day.items.length > 0,
  );
  const shouldUseCoachMock =
    UI_FEATURE_FLAGS.enableMockData &&
    !isParticipant &&
    !hasRealCoachScheduleItems;
  const coachData = shouldUseCoachMock ? coachDashboardMock : null;
  const coachWeekRangeLabel =
    coachData?.weekRangeLabel ?? viewData.weekRangeLabel;
  const coachWeekSessions = coachData?.weekSessions ?? viewData.weekSessions;
  const coachWeekStudents = coachData?.weekStudents ?? viewData.weekStudents;
  const coachActiveTournaments =
    coachData?.activeTournaments ?? viewData.activeTournaments;
  const coachWeekRevenue = coachData?.weekRevenue ?? viewData.weekRevenue;
  const coachPreviousWeekRevenue =
    coachData?.previousWeekRevenue ?? viewData.previousWeekRevenue;
  const coachRevenueByDay = coachData?.revenueByDay ?? viewData.revenueByDay;
  const coachManagedTournamentsCount =
    coachData?.tournamentsManagingCount ?? managedTournamentsCount;
  const coachRegisteredCount =
    coachData?.registeredCount ?? registeredTournamentsCount;
  const coachTodaySessions = coachData?.todaySessions ?? viewData.todaySessions;
  const revenueGrowthPct =
    coachPreviousWeekRevenue > 0
      ? ((coachWeekRevenue - coachPreviousWeekRevenue) /
          coachPreviousWeekRevenue) *
        100
      : null;
  const coachScheduleDays: CoachScheduleDay[] =
    coachData?.scheduleDays ?? derivedCoachScheduleDays;

  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        minWidth: 0,
        p: { xs: 2, md: 3 },
        background: designTokens.gray[50],
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
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: 38, md: 44 },
              lineHeight: 1.05,
              fontWeight: 900,
            }}
          >
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
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: "primary.main" }}
            >
              {userDisplayName}
            </Typography>

            {role ? (
              <Chip
                size="small"
                label={String(role)}
                sx={{
                  bgcolor: "#FAF5FF",
                  color: "primary.main",
                  fontWeight: 700,
                }}
              />
            ) : null}
          </Stack>
        </Stack>

        <Tooltip
          title={
            canCreate ? "" : "Upgrade your account to create and manage events."
          }
          disableHoverListener={canCreate}
        >
          <span>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddRoundedIcon />}
              onClick={handleRedirect}
              disabled={!canCreate}
              sx={{
                width: { xs: "100%", sm: "auto" },
                minWidth: { xs: 0, sm: 200 },
                borderRadius: 2,
                background: canCreate
                  ? designTokens.purple[600]
                  : designTokens.gray[300],
                color: canCreate ? "#FFFFFF" : designTokens.gray[500],
                "&:hover": {
                  background: canCreate
                    ? designTokens.purple[700]
                    : designTokens.gray[300],
                },
              }}
            >
              Create Event
            </Button>
          </span>
        </Tooltip>
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
          <>
            <SectionCard>
              <Stack spacing={0.25} sx={{ mb: 2.25 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Weekly Overview
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {viewData.weekRangeLabel}
                </Typography>
              </Stack>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr 1fr",
                    md: "repeat(4, minmax(0,1fr))",
                  },
                  gap: { xs: 1.25, md: 2.25 },
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.25 }}
                  >
                    Joined Tournaments
                  </Typography>
                  <Typography
                    sx={{ fontSize: 42, lineHeight: 1.05, fontWeight: 900 }}
                  >
                    {viewData.joinedTournaments.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.25 }}
                  >
                    Latest Classes
                  </Typography>
                  <Typography
                    sx={{ fontSize: 42, lineHeight: 1.05, fontWeight: 900 }}
                  >
                    {viewData.latestClasses.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.25 }}
                  >
                    Upcoming Classes
                  </Typography>
                  <Typography
                    sx={{ fontSize: 42, lineHeight: 1.05, fontWeight: 900 }}
                  >
                    {viewData.upcomingClasses.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.25 }}
                  >
                    Open Tournaments
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 42,
                      lineHeight: 1.05,
                      fontWeight: 900,
                      color: "primary.main",
                    }}
                  >
                    {viewData.openTournaments.length}
                  </Typography>
                </Box>
              </Box>
            </SectionCard>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <NavigateSummaryCard
                title="Explore Classes"
                count={viewData.openClasses.length}
                subtitle="Open sessions"
                icon={<CalendarMonthRoundedIcon fontSize="small" />}
                color="default"
                onClick={() => navigate("/classes")}
              />
              <NavigateSummaryCard
                title="Explore Tournaments"
                count={viewData.openTournaments.length}
                subtitle="Available now"
                icon={<EmojiEventsRoundedIcon fontSize="small" />}
                color="primary"
                onClick={() => navigate("/tournaments")}
              />
              <NavigateSummaryCard
                title="My Tournaments"
                count={viewData.joinedTournaments.length}
                subtitle="Registered"
                icon={<EmojiEventsRoundedIcon fontSize="small" />}
                color="warning"
                onClick={() => navigate("/events/upcoming")}
              />
            </Stack>

            <SectionCard>
              <Stack
                direction={{ xs: "column", md: "row" }}
                alignItems={{ md: "center" }}
                justifyContent="space-between"
                spacing={1}
                sx={{ mb: 1.5 }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Explore Open Tournaments
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Join upcoming events and manage your registrations.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  sx={{ borderRadius: 999 }}
                  onClick={() => navigate("/tournaments")}
                >
                  View All Open Tournaments
                </Button>
              </Stack>
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
                          sx={{
                            borderRadius: 999,
                            width: { xs: "100%", sm: "auto" },
                          }}
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
                          sx={{
                            borderRadius: 999,
                            width: { xs: "100%", sm: "auto" },
                          }}
                        >
                          Join
                        </Button>
                      )}
                    </Box>
                  ))
                )}
              </Stack>
            </SectionCard>

            <SectionCard>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
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
                        <Typography sx={{ fontWeight: 700 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.when}
                        </Typography>
                      </Box>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            navigate(
                              `/events/upcoming?eventId=${encodeURIComponent(String(item.eventId))}`,
                            )
                          }
                          sx={{
                            borderRadius: 999,
                            width: { xs: "100%", sm: "auto" },
                          }}
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
                          sx={{
                            borderRadius: 999,
                            width: { xs: "100%", sm: "auto" },
                          }}
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
            </SectionCard>
          </>
        ) : (
          <>
            <SectionCard
              sx={{
                position: "relative",
                overflow: "hidden",
                p: 3,
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
              <Stack spacing={3}>
                {/* Header Section */}
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  spacing={2}
                >
                  <Stack spacing={0.5}>
                    <Typography
                      variant="h2"
                      sx={{ fontWeight: 700, fontSize: "1.5rem" }}
                    >
                      Weekly Overview
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.875rem" }}
                    >
                      {coachWeekRangeLabel}
                    </Typography>
                  </Stack>
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/revenue")}
                    sx={{
                      borderRadius: 2,
                      borderWidth: "1.5px",
                      fontWeight: 600,
                      "&:hover": {
                        borderWidth: "1.5px",
                      },
                    }}
                  >
                    View Analytics
                  </Button>
                </Stack>

                {/* Stats Grid */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr 1fr",
                      md: "repeat(4, minmax(0,1fr))",
                    },
                    gap: { xs: 2, md: 3 },
                  }}
                >
                  {/* Sessions Card */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        borderColor: "#D1D5DB",
                        boxShadow: "0 2px 4px 0 rgb(0 0 0 / 0.05)",
                      },
                    }}
                  >
                    <Stack spacing={1}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Sessions
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "2rem",
                          lineHeight: 1,
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {coachWeekSessions}
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Students Card */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        borderColor: "#D1D5DB",
                        boxShadow: "0 2px 4px 0 rgb(0 0 0 / 0.05)",
                      },
                    }}
                  >
                    <Stack spacing={1}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Students
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "2rem",
                          lineHeight: 1,
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {coachWeekStudents}
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Tournaments Card */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        borderColor: "#D1D5DB",
                        boxShadow: "0 2px 4px 0 rgb(0 0 0 / 0.05)",
                      },
                    }}
                  >
                    <Stack spacing={1}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Tournaments
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "2rem",
                          lineHeight: 1,
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {coachActiveTournaments}
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Revenue Card */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      background:
                        "linear-gradient(135deg, #FAF5FF 0%, #FDF2F8 100%)",
                      border: "1px solid #E9D5FF",
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 10px 15px -3px rgb(139 92 246 / 0.2)",
                      },
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "3px",
                        background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
                      },
                    }}
                  >
                    <Stack spacing={1}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Revenue
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="flex-end">
                        <Typography
                          sx={{
                            fontSize: "2rem",
                            lineHeight: 1,
                            fontWeight: 700,
                            background:
                              "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                          }}
                        >
                          {toMoney(coachWeekRevenue)}
                        </Typography>
                        {typeof revenueGrowthPct === "number" ? (
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.25,
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              backgroundColor:
                                revenueGrowthPct >= 0 ? "#DCFCE7" : "#FEE2E2",
                              mb: 0.25,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                color:
                                  revenueGrowthPct >= 0 ? "#16A34A" : "#DC2626",
                              }}
                            >
                              {revenueGrowthPct >= 0 ? "↗" : "↘"}{" "}
                              {Math.abs(revenueGrowthPct).toFixed(0)}%
                            </Typography>
                          </Box>
                        ) : null}
                      </Stack>
                    </Stack>
                  </Box>
                </Box>

                {/* Daily Breakdown Chart */}
                <Box
                  sx={{
                    pt: 3,
                    borderTop: "1px solid #E5E7EB",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 2 }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        color: "#6B7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Daily Breakdown
                    </Typography>
                  </Stack>
                  <RevenueMiniBars
                    items={coachRevenueByDay}
                    formatValue={toMoney}
                  />
                </Box>
              </Stack>
            </SectionCard>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <NavigateSummaryCard
                title="Tournaments I'm Managing"
                count={coachManagedTournamentsCount}
                subtitle="Active Events"
                icon={<SettingsRoundedIcon fontSize="small" />}
                color="warning"
                onClick={() => navigate("/events/upcoming")}
              />
              <NavigateSummaryCard
                title="My Tournaments"
                count={coachRegisteredCount}
                subtitle="Registered"
                icon={<EmojiEventsRoundedIcon fontSize="small" />}
                color="primary"
                onClick={() => navigate("/events/upcoming")}
              />
              <NavigateSummaryCard
                title="Today's Classes"
                count={coachTodaySessions}
                subtitle="Sessions"
                icon={<CalendarMonthRoundedIcon fontSize="small" />}
                color="default"
              />
            </Stack>
            <CoachWeeklyScheduleBoard days={coachScheduleDays} />
          </>
        )}
      </Box>
    </Box>
  );
}

function buildCoachScheduleDaysFromWeeklyClasses(
  classes: WeeklyClass[],
): CoachScheduleDay[] {
  const dayOrder = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const shortByDay: Record<string, string> = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
    Sunday: "Sun",
  };

  const groups = dayOrder.map((dayName, idx) => {
    const dayClasses = classes.filter((c) => c.date === dayName).slice(0, 3);
    return {
      day: shortByDay[dayName] ?? dayName.slice(0, 3),
      dateLabel: String(23 + idx),
      items: dayClasses.map((item) => ({
        id: item.id,
        time: item.startAt,
        title: `${capitalize(item.level)} Class`,
        students: Number(item.students ?? 0),
        capacity: item.capacity ?? null,
        isClosed:
          typeof item.isFull === "boolean"
            ? item.isFull
            : item.capacity != null &&
              Number(item.students ?? 0) >= Number(item.capacity),
        type: "class" as const,
      })),
    };
  });
  return groups;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
