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
} from "../auth/tokens";
import { UI_FEATURE_FLAGS } from "../config/featureFlags";
import MockDataFlag from "../Components/Shared/MockDataFlag";
import { designTokens } from "../Theme/designTokens";

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
  entryFee?: number | string;
  currency?: string;
  isPublic?: boolean;
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
  };
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

export default function TournamentsListPage() {
  const navigate = useNavigate();
  const role = getLoggedInRole();
  const currentUserId = getLoggedInUserId();
  const canCreate = hasCreatorAccess(role);

  const [query, setQuery] = React.useState("");
  const [sportFilter, setSportFilter] = React.useState("All");

  const [items, setItems] = React.useState<Tournament[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
    } catch {
      setError("Network error loading tournaments.");
      setItems([]);
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
              Discover Tournaments
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Browse and register for upcoming beach volleyball tournaments near you.
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

        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.75 }}>
          <TrendingUpRoundedIcon sx={{ color: "success.main", fontSize: 34 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              Discover Tournaments
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {loading
                ? "Loading tournaments..."
                : `${filtered.length} tournament${filtered.length === 1 ? "" : "s"} available`}
            </Typography>
          </Box>
        </Stack>

        {loading ? (
          <Paper sx={{ p: 5, textAlign: "center" }}>
            <CircularProgress />
          </Paper>
        ) : filtered.length === 0 ? (
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
            {filtered.map((t) => {
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

function MetaRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{ color: designTokens.green[600], display: "grid", placeItems: "center" }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
        {text}
      </Typography>
    </Stack>
  );
}
