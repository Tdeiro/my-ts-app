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
} from "../features/auth/services/tokens";
import { designTokens } from "../Theme/designTokens";
import { useTournamentsList } from "../features/tournaments/hooks/useTournamentsList";
import {
  deriveDisplayMeta,
  formatDate,
  formatDateShort,
} from "../features/tournaments/utils/tournamentListFormatters";
import { readSubscribedEventIds } from "../features/tournaments/utils/tournamentListStorage";

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
  const { items, loading, error } = useTournamentsList({ currentUserId });

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

  const ownedItems = React.useMemo(
    () =>
      items.filter(
        (t) => t.ownerId != null && t.ownerId === Number(currentUserId),
      ),
    [items, currentUserId],
  );
  const subscribedEventIds = React.useMemo(() => readSubscribedEventIds(), []);
  const discoverItems = React.useMemo(
    () =>
      filtered.filter(
        (item) =>
          item.isPublic &&
          !(item.ownerId != null && item.ownerId === Number(currentUserId)),
      ),
    [filtered, currentUserId],
  );
  const ownedSectionTitle = "My Tournaments";

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
                  meta.totalSpots > 0
                    ? ((meta.totalSpots - meta.spotsLeft) / meta.totalSpots) *
                      100
                    : 0;
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
              const isRegistered = subscribedEventIds.has(String(t.id));
              const status = statusChipSx();
              const meta = deriveDisplayMeta(t);
              const spotPctUsed =
                meta.totalSpots > 0
                  ? ((meta.totalSpots - meta.spotsLeft) / meta.totalSpots) *
                    100
                  : 0;

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

                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.75 }}>
                          <StarRoundedIcon sx={{ color: "warning.main", fontSize: 16 }} />
                          <Typography variant="body2" color="text.secondary">
                            {meta.organizer}
                          </Typography>
                        </Stack>
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
                      ) : isRegistered ? (
                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={() =>
                            navigate(
                              `/tournaments/invite?inviteTournamentId=${encodeURIComponent(
                                t.id,
                              )}&mode=view`,
                            )
                          }
                          endIcon={<ChevronRightRoundedIcon />}
                          sx={{ borderRadius: 2 }}
                        >
                          View Registration
                        </Button>
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
