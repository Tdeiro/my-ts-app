import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Paper,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  getLoggedInRole,
  getLoggedInUserId,
  hasCreatorAccess,
  getToken,
} from "../auth/tokens";

/* ===========================
   Backend Event Shape
=========================== */
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

/* ===========================
   UI Model (same structure)
=========================== */
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
  status: "Open"; // until backend provides status
  isPublic: boolean;
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

/* ===========================
   Status Chip (UNCHANGED)
=========================== */
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
  }, []);

  React.useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((t) => {
      const matchesQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.locationName.toLowerCase().includes(q);

      const matchesSport = sportFilter === "All" || t.sport === sportFilter;

      return matchesQuery && matchesSport;
    });
  }, [items, query, sportFilter]);

  const uniqueSports = React.useMemo(() => {
    const s = new Set(items.map((i) => i.sport));
    return ["All", ...Array.from(s)];
  }, [items]);

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
      <Box sx={{ width: "100%", maxWidth: 1100 }}>
        {/* ================= HEADER (UNCHANGED DESIGN) ================= */}
        <Paper
          sx={{
            mb: 2,
            p: { xs: 2, sm: 2.5 },
            borderRadius: 2,
            background:
              "linear-gradient(180deg, rgba(139,92,246,0.10) 0%, rgba(255,255,255,0) 70%)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h2" sx={{ mb: 0.5, fontWeight: 900 }}>
                Tournaments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View and manage all tournaments in one place.
              </Typography>
            </Box>

            {canCreate ? (
              <Button
                variant="contained"
                onClick={() => navigate("/tournaments/new")}
                sx={{ borderRadius: 999 }}
              >
                Create Tournament
              </Button>
            ) : null}
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* ================= FILTERS (UNCHANGED DESIGN) ================= */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Search by name or venue"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root:focus-within": {
                    boxShadow: "0 0 0 3px rgba(255, 107, 92, 0.12)",
                  },
                }}
              />

              <FormControl sx={{ minWidth: 200 }}>
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

        {/* ================= LIST (IDENTICAL DESIGN) ================= */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 2.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 900 }}>
                All Tournaments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {loading
                  ? "Loading…"
                  : `${filtered.length} result${
                      filtered.length === 1 ? "" : "s"
                    }`}
              </Typography>
            </Box>

            <Divider />

            {loading ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <CircularProgress />
              </Box>
            ) : filtered.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Typography>No tournaments found</Typography>
              </Box>
            ) : (
              <Stack sx={{ p: 2.5 }} spacing={1.25}>
                {filtered.map((t) => {
                  const status = statusChipSx();
                  const isOwner = t.ownerId != null && t.ownerId === Number(currentUserId);

                  return (
                    <Box
                      key={t.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "rgba(15, 23, 42, 0.08)",
                        bgcolor: "background.paper",
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        transition:
                          "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          borderColor: "rgba(139,92,246,0.22)",
                          boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
                        },
                      }}
                    >
                      {/* LEFT */}
                      <Box sx={{ minWidth: 280 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body1" sx={{ fontWeight: 900 }}>
                            {t.name}
                          </Typography>

                          <Chip
                            size="small"
                            label={status.label}
                            variant={status.variant}
                            sx={status.sx}
                          />

                          {!t.isPublic && (
                            <Chip
                              size="small"
                              label="Private"
                              variant="outlined"
                              sx={{
                                borderColor: "rgba(255, 107, 92, 0.30)",
                                color: "rgba(255, 107, 92, 0.95)",
                              }}
                            />
                          )}
                        </Stack>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.25 }}
                        >
                          {t.locationName}
                        </Typography>
                      </Box>

                      {/* TAGS */}
                      <Stack direction="row" spacing={1}>
                        {[t.sport, t.format, t.level].map((tag) => (
                          <Chip
                            key={tag}
                            size="small"
                            label={tag}
                            variant="outlined"
                            sx={{
                              borderColor: "rgba(139,92,246,0.18)",
                              bgcolor: "rgba(139,92,246,0.05)",
                            }}
                          />
                        ))}
                      </Stack>

                      {/* RIGHT */}
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.25}
                        alignItems={{ sm: "center" }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {t.startDate} • {t.entryFee} {t.currency}
                        </Typography>

                        {canCreate && isOwner ? (
                          <>
                            <Button
                              variant="outlined"
                              onClick={() => navigate(`/tournaments/${t.id}/edit`)}
                              sx={{
                                borderRadius: 999,
                                borderColor: "rgba(15,23,42,0.20)",
                                color: "text.primary",
                                "&:hover": {
                                  borderColor: "rgba(15,23,42,0.40)",
                                  backgroundColor: "rgba(15,23,42,0.04)",
                                },
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={() => navigate(`/tournaments/${t.id}/setup`)}
                              sx={{
                                borderRadius: 999,
                                borderColor: "rgba(139,92,246,0.35)",
                                color: "primary.main",
                                "&:hover": {
                                  borderColor: "primary.main",
                                  backgroundColor: "rgba(139,92,246,0.08)",
                                  boxShadow: "0 0 0 3px rgba(255, 107, 92, 0.12)",
                                },
                              }}
                            >
                              Manage
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outlined"
                            onClick={() =>
                              navigate(
                                `/tournaments/invite?inviteTournamentId=${encodeURIComponent(t.id)}`,
                              )
                            }
                            sx={{
                              borderRadius: 999,
                              borderColor: "rgba(139,92,246,0.35)",
                              color: "primary.main",
                              "&:hover": {
                                borderColor: "primary.main",
                                backgroundColor: "rgba(139,92,246,0.08)",
                                boxShadow: "0 0 0 3px rgba(255, 107, 92, 0.12)",
                              },
                            }}
                          >
                            View
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
