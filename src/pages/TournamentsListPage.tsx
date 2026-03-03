import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import { useNavigate } from "react-router-dom";
import {
  getLoggedInRole,
  getLoggedInUserId,
  hasCreatorAccess,
  getToken,
  isPlayerRole,
} from "../auth/tokens";
import { UI_FEATURE_FLAGS } from "../config/featureFlags";
import MockDataFlag from "../Components/Shared/MockDataFlag";
import { designTokens } from "../Theme/designTokens";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const UPCOMING_SUBSCRIBED_EVENTS_KEY = "upcoming.subscribedEventIds";

type ApiEvent = {
  id: number;
  userId?: number | string;
  user_id?: number | string;
  createdBy?: number | string;
  name: string;
  eventType: string;
  sport?: string;
  format?: string;
  level?: string;
  locationName?: string;
  startDate: string;
  status?: string;
  subscriptionStatus?: string;
  entryFee?: number | string;
  currency?: string;
  isPublic?: boolean;
};

type DashboardApiResp = {
  events?: ApiEvent[] | null;
};

type Tournament = {
  id: string;
  ownerId: number | null;
  name: string;
  sport: string;
  format: string;
  level: string;
  locationName: string;
  startDate: string;
  entryFee: number;
  currency: string;
  status: "Open";
  isPublic: boolean;
  apiStatus?: string;
  subscriptionStatus?: string;
};

type TournamentDisplayMeta = {
  timeLabel: string;
  organizer: string;
  totalSpots: number;
  spotsLeft: number;
  registrationDeadline: string;
};

function formatTournamentLevelLabel(level?: string): string {
  const raw = String(level ?? "").trim();
  if (!raw) return "Open";
  const normalized = raw.toUpperCase().replaceAll("_", " ");
  if (normalized === "ALL LEVELS") return "Open";
  return raw
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapApiEvent(e: ApiEvent): Tournament {
  const ownerRaw = e.createdBy ?? e.userId ?? e.user_id;
  const ownerId = ownerRaw == null ? null : Number(ownerRaw);
  return {
    id: String(e.id),
    ownerId: Number.isFinite(ownerId) ? ownerId : null,
    name: e.name ?? "Untitled",
    sport: e.sport ?? "Other",
    format: e.format ?? "-",
    level: formatTournamentLevelLabel(e.level ?? "All levels"),
    locationName: e.locationName ?? "-",
    startDate: e.startDate,
    entryFee:
      typeof e.entryFee === "string" ? Number(e.entryFee) : (e.entryFee ?? 0),
    currency: (e.currency ?? "AUD").toUpperCase(),
    status: "Open",
    isPublic: e.isPublic ?? true,
    apiStatus: String(e.status ?? "").toUpperCase(),
    subscriptionStatus: String(e.subscriptionStatus ?? "").toUpperCase(),
  };
}

function isSubscribedLikeStatus(value?: string): boolean {
  const status = String(value ?? "").trim().toUpperCase();
  return [
    "REGISTERED",
    "SUBSCRIBED",
    "CONFIRMED",
    "ACTIVE",
    "APPROVED",
  ].includes(status);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function deriveDisplayMeta(item: Tournament): TournamentDisplayMeta {
  const idSeed = Number(String(item.id).replace(/\D/g, "").slice(-3) || "1");
  const totalSpots = 48 + (idSeed % 4) * 16;
  const taken = 8 + (idSeed % Math.max(10, totalSpots - 18));
  const spotsLeft = Math.max(0, totalSpots - taken);
  const start = new Date(item.startDate);
  const deadline = Number.isNaN(start.getTime())
    ? item.startDate
    : new Date(start.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

  return {
    timeLabel: "9:00 AM - 5:00 PM",
    organizer: `${item.sport} Community Club`,
    totalSpots,
    spotsLeft,
    registrationDeadline: formatDate(deadline),
  };
}

function statusChipSx() {
  return {
    label: "Open",
    variant: "outlined" as const,
    sx: {
      bgcolor: "rgba(139,92,246,0.10)",
      color: "primary.main",
      borderColor: "rgba(139,92,246,0.22)",
    },
  };
}

function readSubscribedEventIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(UPCOMING_SUBSCRIBED_EVENTS_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed
        .map((item) => String(item))
        .map((item) => item.trim())
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

export default function TournamentsListPage() {
  const navigate = useNavigate();
  const role = getLoggedInRole();
  const currentUserId = getLoggedInUserId();
  const canCreate = hasCreatorAccess(role);
  const isPlayer = isPlayerRole(role);

  const [query, setQuery] = React.useState("");
  const [sportFilter, setSportFilter] = React.useState("All");

  const [items, setItems] = React.useState<Tournament[]>([]);
  const [scopedItems, setScopedItems] = React.useState<Tournament[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [withdrawingById, setWithdrawingById] = React.useState<
    Record<string, boolean>
  >({});
  const [subscribedHintIds, setSubscribedHintIds] = React.useState<Set<string>>(
    new Set(),
  );

  const loadEvents = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = getToken();
    if (!token) {
      setError("You are not logged in.");
      setLoading(false);
      return;
    }
    if (currentUserId === null) {
      setError("Invalid session. Please sign in again.");
      setLoading(false);
      return;
    }

    try {
      const dashboardRes = await fetch(`${API_URL}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dashboardBody: DashboardApiResp | null = await dashboardRes
        .json()
        .catch(() => null);
      if (dashboardRes.ok) {
        const scopedRaw: ApiEvent[] = Array.isArray(dashboardBody?.events)
          ? dashboardBody.events
          : [];
        const dashboardSubscribed = new Set(
          scopedRaw
            .filter((event) =>
              isSubscribedLikeStatus(
                String(event.subscriptionStatus ?? event.status ?? ""),
              ),
            )
            .map((event) => String(event.id)),
        );
        const scopedMapped = scopedRaw
          .filter((e) => e.eventType?.toUpperCase() === "TOURNAMENT")
          .map(mapApiEvent)
          .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
        setScopedItems(scopedMapped);
        setSubscribedHintIds(dashboardSubscribed);
      } else {
        setScopedItems([]);
        setSubscribedHintIds(new Set());
      }

      const res = await fetch("/events", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          data?.message?.[0] ||
            data?.error ||
            `Failed to load events (${res.status})`,
        );
        setItems([]);
        return;
      }

      const raw: ApiEvent[] = Array.isArray(data) ? data : (data?.data ?? []);
      const apiSubscribedIds = new Set(
        raw
          .filter((event) =>
            isSubscribedLikeStatus(
              String(event.subscriptionStatus ?? event.status ?? ""),
            ),
          )
          .map((event) => String(event.id)),
      );
      const mapped = raw
        .filter((e) => e.eventType?.toUpperCase() === "TOURNAMENT")
        .filter((e) => e.isPublic !== false)
        .filter((e) => {
          const status = String(e.status ?? "").toUpperCase();
          return !status || ["OPEN", "ACTIVE", "ONGOING", "REGISTRATION"].includes(status);
        })
        .map(mapApiEvent)
        .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

      setItems(mapped);
      setSubscribedHintIds((prev) => new Set([...prev, ...apiSubscribedIds]));
    } catch {
      setError("Network error loading tournaments.");
      setItems([]);
      setScopedItems([]);
      setSubscribedHintIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  React.useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((t) => {
      const matchesQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.locationName.toLowerCase().includes(q) ||
        t.sport.toLowerCase().includes(q);

      const matchesSport = sportFilter === "All" || t.sport === sportFilter;

      return matchesQuery && matchesSport;
    });
  }, [items, query, sportFilter]);

  const uniqueSports = React.useMemo(() => {
    const s = new Set(items.map((i) => i.sport));
    return ["All", ...Array.from(s)];
  }, [items]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const mergedPersonalSource = React.useMemo(() => {
    const byId = new Map<string, Tournament>();
    [...items, ...scopedItems].forEach((item) => byId.set(String(item.id), item));
    return Array.from(byId.values());
  }, [items, scopedItems]);
  const ownedItems = React.useMemo(
    () =>
      mergedPersonalSource.filter(
        (t) => t.ownerId != null && t.ownerId === Number(currentUserId),
      ),
    [mergedPersonalSource, currentUserId],
  );
  const subscribedItems = React.useMemo(
    () => {
      const fromDashboard = scopedItems.filter(
        (t) =>
          !(t.ownerId != null && t.ownerId === Number(currentUserId)) &&
          (!t.startDate || String(t.startDate).slice(0, 10) >= todayIso),
      );

      // Fallback: include tournaments known from invite subscriptions in local storage.
      const subscribedIdSet = readSubscribedEventIds();
      const fromStorage = mergedPersonalSource.filter(
        (t) =>
          subscribedIdSet.has(String(t.id)) &&
          !(t.ownerId != null && t.ownerId === Number(currentUserId)) &&
          (!t.startDate || String(t.startDate).slice(0, 10) >= todayIso),
      );
      const fromApiHints = mergedPersonalSource.filter(
        (t) =>
          subscribedHintIds.has(String(t.id)) &&
          !(t.ownerId != null && t.ownerId === Number(currentUserId)) &&
          (!t.startDate || String(t.startDate).slice(0, 10) >= todayIso),
      );

      const byId = new Map<string, Tournament>();
      [...fromDashboard, ...fromStorage, ...fromApiHints].forEach((item) =>
        byId.set(String(item.id), item),
      );
      return Array.from(byId.values());
    },
    [
      scopedItems,
      mergedPersonalSource,
      currentUserId,
      todayIso,
      subscribedHintIds,
    ],
  );
  const personalIds = React.useMemo(
    () => new Set([...ownedItems, ...subscribedItems].map((item) => String(item.id))),
    [ownedItems, subscribedItems],
  );
  const discoverItems = React.useMemo(
    () => filtered.filter((item) => !personalIds.has(String(item.id))),
    [filtered, personalIds],
  );
  const ownedSectionTitle = canCreate && !isPlayer ? "My Tournaments" : "My Events";

  const handleWithdraw = React.useCallback(
    async (eventId: string) => {
      const token = getToken();
      if (!token) return;
      setWithdrawingById((prev) => ({ ...prev, [eventId]: true }));
      setError(null);
      try {
        const res = await fetch(
          `${API_URL}/events/${encodeURIComponent(eventId)}/subscriptions/me/withdraw`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.message?.[0] || body?.error || "Could not withdraw.",
          );
        }
        await loadEvents();
      } catch (e: any) {
        setError(e?.message || "Could not withdraw from event.");
      } finally {
        setWithdrawingById((prev) => ({ ...prev, [eventId]: false }));
      }
    },
    [loadEvents],
  );

  const hasMockMeta = UI_FEATURE_FLAGS.enableMockData;

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
      <Box sx={{ width: "100%", maxWidth: 1120 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h2" sx={{ mb: 0.5, fontWeight: 900 }}>
              Tournaments
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your events, see upcoming registrations, and discover public tournaments.
            </Typography>
          </Box>
          {canCreate ? (
            <Button
              variant="contained"
              onClick={() => navigate("/tournaments/new")}
              sx={{ borderRadius: 2, whiteSpace: "nowrap" }}
            >
              Create Tournament
            </Button>
          ) : null}
        </Stack>

        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
              <TextField
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tournaments by name, location, or sport..."
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <FormControl sx={{ minWidth: { xs: "100%", md: 220 } }}>
                <InputLabel>Sport</InputLabel>
                <Select
                  label="Sport"
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value as string)}
                >
                  {uniqueSports.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

            </Stack>
          </CardContent>
        </Card>

        {hasMockMeta ? (
          <Box sx={{ mb: 1.5 }}>
            <MockDataFlag label="Tournament card details (organizer/spots/deadline) use mock display data" />
          </Box>
        ) : null}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {ownedItems.length > 0 ? (
          <Stack sx={{ mb: 3 }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}>
              <TrendingUpRoundedIcon sx={{ color: designTokens.orange[600], fontSize: 30 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                  {ownedSectionTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Events you created.
                </Typography>
              </Box>
            </Stack>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 1.5,
              }}
            >
              {ownedItems.map((t) => {
                const status = statusChipSx();
                const meta = deriveDisplayMeta(t);
                const spotPctUsed =
                  ((meta.totalSpots - meta.spotsLeft) / meta.totalSpots) * 100;
                return (
                  <Card key={`owned-${t.id}`} sx={{ borderRadius: 2.5, overflow: "hidden" }}>
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1.25 }}>
                        <Box sx={{ width: 54, height: 54, borderRadius: 1.5, bgcolor: designTokens.orange[500], color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                          <EmojiEventsRoundedIcon />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography sx={{ fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>{t.name}</Typography>
                            <Chip size="small" label={status.label} variant={status.variant} sx={status.sx} />
                          </Stack>
                          <Stack spacing={0.5}>
                            <MetaRow icon={<LocationOnRoundedIcon fontSize="small" />} text={t.locationName} color={designTokens.orange[600]} />
                            <MetaRow icon={<CalendarMonthRoundedIcon fontSize="small" />} text={formatDate(t.startDate)} color={designTokens.orange[600]} />
                            <MetaRow icon={<AccessTimeRoundedIcon fontSize="small" />} text={meta.timeLabel} color={designTokens.orange[600]} />
                          </Stack>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
                        {[t.sport, t.format, t.level].map((tag) => (
                          <Chip key={`owned-${t.id}-${tag}`} size="small" label={tag} sx={{ bgcolor: designTokens.orange[50], border: `1px solid ${designTokens.orange[200]}`, color: designTokens.orange[700] }} />
                        ))}
                      </Stack>
                      <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: designTokens.gray[50], mb: 1 }}>
                        <Stack direction="row" justifyContent="space-between" spacing={1.25}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Entry Fee</Typography>
                            <Typography sx={{ fontWeight: 900 }}>{t.entryFee} {t.currency}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Spots Available</Typography>
                            <Typography sx={{ fontWeight: 900 }}>{meta.spotsLeft}/{meta.totalSpots}</Typography>
                          </Box>
                        </Stack>
                      </Box>
                      <Box sx={{ mb: 1.5 }}>
                        <LinearProgress variant="determinate" value={Math.max(2, Math.min(100, spotPctUsed))} color={spotPctUsed > 80 ? "error" : spotPctUsed > 60 ? "warning" : "success"} />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                          Registration closes {formatDateShort(meta.registrationDeadline)}
                        </Typography>
                      </Box>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <Button variant="outlined" fullWidth onClick={() => navigate(`/tournaments/${t.id}/edit`)} sx={{ borderRadius: 2 }}>
                          Edit
                        </Button>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => navigate(`/tournaments/${t.id}/setup`)}
                          endIcon={<ChevronRightRoundedIcon />}
                          sx={{ borderRadius: 2, background: designTokens.orange[500], "&:hover": { background: designTokens.orange[600] } }}
                        >
                          Manage Tournament
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Stack>
        ) : null}

        {isPlayer && subscribedItems.length > 0 ? (
          <Stack sx={{ mb: 3 }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}>
              <CalendarMonthRoundedIcon sx={{ color: "primary.main", fontSize: 30 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                  My Upcoming Events
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tournaments you are subscribed to.
                </Typography>
              </Box>
            </Stack>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 1.5,
              }}
            >
              {subscribedItems.map((t) => {
                const status = statusChipSx();
                const meta = deriveDisplayMeta(t);
                return (
                  <Card key={`subscribed-${t.id}`} sx={{ borderRadius: 2.5, overflow: "hidden" }}>
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1.25 }}>
                        <Box sx={{ width: 54, height: 54, borderRadius: 1.5, bgcolor: designTokens.purple[600], color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                          <EmojiEventsRoundedIcon />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography sx={{ fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>{t.name}</Typography>
                            <Chip size="small" label={status.label} variant={status.variant} sx={status.sx} />
                          </Stack>
                          <Stack spacing={0.5}>
                            <MetaRow icon={<LocationOnRoundedIcon fontSize="small" />} text={t.locationName} color={designTokens.purple[600]} />
                            <MetaRow icon={<CalendarMonthRoundedIcon fontSize="small" />} text={formatDate(t.startDate)} color={designTokens.purple[600]} />
                            <MetaRow icon={<AccessTimeRoundedIcon fontSize="small" />} text={meta.timeLabel} color={designTokens.purple[600]} />
                          </Stack>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
                        {[t.sport, t.format, t.level].map((tag) => (
                          <Chip key={`subscribed-${t.id}-${tag}`} size="small" label={tag} sx={{ bgcolor: designTokens.purple[50], border: `1px solid ${designTokens.purple[200]}`, color: designTokens.purple[700] }} />
                        ))}
                      </Stack>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <Button
                          variant="outlined"
                          color="error"
                          fullWidth
                          disabled={Boolean(withdrawingById[t.id])}
                          onClick={() => void handleWithdraw(t.id)}
                          sx={{ borderRadius: 2 }}
                        >
                          {withdrawingById[t.id] ? "Withdrawing..." : "Withdraw"}
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Stack>
        ) : null}

        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.75 }}>
          <TrendingUpRoundedIcon sx={{ color: "success.main", fontSize: 34 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              Discover Tournaments
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {loading
                ? "Loading tournaments..."
                : `${discoverItems.length} tournament${discoverItems.length === 1 ? "" : "s"} available`}
            </Typography>
          </Box>
        </Stack>

        {loading ? (
          <Paper sx={{ p: 5, textAlign: "center" }}>
            <CircularProgress />
          </Paper>
        ) : discoverItems.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: "center" }}>
            <SearchRoundedIcon sx={{ fontSize: 56, color: "text.disabled", mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
              No tournaments found
            </Typography>
            <Typography color="text.secondary">Try adjusting your search query.</Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 1.5,
            }}
          >
            {discoverItems.map((t) => {
              const isOwner = t.ownerId != null && t.ownerId === Number(currentUserId);
              const status = statusChipSx();
              const meta = deriveDisplayMeta(t);
              const spotPctUsed = ((meta.totalSpots - meta.spotsLeft) / meta.totalSpots) * 100;

              return (
                <Card key={t.id} sx={{ borderRadius: 2.5, overflow: "hidden" }}>
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1.25 }}>
                      <Box
                        sx={{
                          width: 54,
                          height: 54,
                          borderRadius: 1.5,
                          bgcolor: designTokens.green[600],
                          color: "#fff",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <EmojiEventsRoundedIcon />
                      </Box>

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                          <Typography sx={{ fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>
                            {t.name}
                          </Typography>
                          <Chip size="small" label={status.label} variant={status.variant} sx={status.sx} />
                        </Stack>

                        <Stack spacing={0.5}>
                            <MetaRow icon={<LocationOnRoundedIcon fontSize="small" />} text={t.locationName} />
                            <MetaRow icon={<CalendarMonthRoundedIcon fontSize="small" />} text={formatDate(t.startDate)} />
                            <MetaRow icon={<AccessTimeRoundedIcon fontSize="small" />} text={meta.timeLabel} />
                        </Stack>

                        {hasMockMeta ? (
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.75 }}>
                            <StarRoundedIcon sx={{ color: "warning.main", fontSize: 16 }} />
                            <Typography variant="body2" color="text.secondary">
                              {meta.organizer}
                            </Typography>
                          </Stack>
                        ) : null}
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
                      {[t.sport, t.format, t.level].map((tag) => (
                        <Chip
                          key={`${t.id}-${tag}`}
                          size="small"
                          label={tag}
                          sx={{
                            bgcolor: designTokens.green[50],
                            border: `1px solid ${designTokens.green[200]}`,
                            color: designTokens.green[700],
                          }}
                        />
                      ))}
                    </Stack>

                    <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: designTokens.gray[50], mb: 1 }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1.25}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Entry Fee
                          </Typography>
                          <Typography sx={{ fontWeight: 900 }}>
                            {t.entryFee} {t.currency}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Spots Available
                          </Typography>
                          <Typography sx={{ fontWeight: 900 }}>
                            {meta.spotsLeft}/{meta.totalSpots}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    <Box sx={{ mb: 1.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.max(2, Math.min(100, spotPctUsed))}
                        color={spotPctUsed > 80 ? "error" : spotPctUsed > 60 ? "warning" : "success"}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                        Registration closes {formatDateShort(meta.registrationDeadline)}
                      </Typography>
                    </Box>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      {canCreate && isOwner ? (
                        <>
                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => navigate(`/tournaments/${t.id}/edit`)}
                            sx={{ borderRadius: 2 }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={() => navigate(`/tournaments/${t.id}/setup`)}
                            endIcon={<ChevronRightRoundedIcon />}
                            sx={{
                              borderRadius: 2,
                              background: designTokens.gradients.brand,
                            }}
                          >
                            Manage Tournament
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() =>
                            navigate(
                              `/tournaments/invite?inviteTournamentId=${encodeURIComponent(t.id)}`,
                            )
                          }
                          endIcon={<ChevronRightRoundedIcon />}
                          sx={{
                            borderRadius: 2,
                            background: designTokens.green[600],
                            "&:hover": { background: designTokens.green[700] },
                          }}
                        >
                          Register Now
                        </Button>
                      )}
                    </Stack>

                    {!t.isPublic ? (
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                        <GroupsRoundedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                        <Typography variant="caption" color="text.secondary">
                          Private tournament
                        </Typography>
                      </Stack>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function MetaRow({
  icon,
  text,
  color = designTokens.green[600],
}: {
  icon: React.ReactNode;
  text: string;
  color?: string;
}) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{ color, display: "grid", placeItems: "center" }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
        {text}
      </Typography>
    </Stack>
  );
}
