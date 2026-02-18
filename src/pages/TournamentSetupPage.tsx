import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useNavigate, useParams } from "react-router-dom";
import { getLoggedInUserId, getToken } from "../auth/tokens";
import {
  BracketPreviewCard,
  GroupStagePreviewCard,
  RoundsProgressionCard,
} from "../Components/Shared/TournamentVisuals";
import {
  type TournamentCategory,
  saveTournamentSetup,
  loadTournamentSetup,
} from "../Utils/tournamentPlanner";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type ApiEvent = {
  id: number | string;
  userId?: number | string;
  user_id?: number | string;
  name?: string;
  eventType?: string;
  sport?: string;
  format?: string;
  level?: string;
  locationName?: string;
  startDate?: string;
};

type StructureMode =
  | "groups_knockout"
  | "knockout_only"
  | "group_phase_only"
  | "swiss";
type TournamentFormat = "Singles" | "Doubles" | "Mixed" | "Teams";

const FORMAT_OPTIONS: Array<{
  id: TournamentFormat;
  title: string;
  subtitle: string;
  visual: string;
}> = [
  {
    id: "Singles",
    title: "Singles",
    subtitle: "1 vs 1 per match",
    visual: "A vs B",
  },
  {
    id: "Doubles",
    title: "Doubles",
    subtitle: "2 vs 2 per match",
    visual: "A+B vs C+D",
  },
  {
    id: "Mixed",
    title: "Mixed",
    subtitle: "Mixed pairings",
    visual: "A+B vs C+D",
  },
  {
    id: "Teams",
    title: "Teams",
    subtitle: "Team fixtures",
    visual: "Team 1 vs Team 2",
  },
];

const STRUCTURE_OPTIONS: Array<{
  id: StructureMode;
  title: string;
  subtitle: string;
  visual: "groups" | "knockout" | "rounds";
}> = [
  {
    id: "groups_knockout",
    title: "Group Phase + Knockout",
    subtitle: "Best for balanced competition",
    visual: "groups",
  },
  {
    id: "knockout_only",
    title: "Knockout Bracket",
    subtitle: "Fast elimination format",
    visual: "knockout",
  },
  {
    id: "group_phase_only",
    title: "Group Phase Only",
    subtitle: "League-style standings",
    visual: "groups",
  },
  {
    id: "swiss",
    title: "Swiss Rounds",
    subtitle: "Pair by score each round",
    visual: "rounds",
  },
];

function normalizeFormat(value?: string): TournamentFormat {
  if (value === "Doubles" || value === "Mixed" || value === "Teams")
    return value;
  return "Singles";
}

function disciplinesFromFormats(formats: TournamentFormat[]) {
  const list: Array<TournamentCategory["discipline"]> = [];
  if (formats.includes("Singles")) list.push("Singles");
  if (formats.includes("Doubles")) {
    list.push("Doubles Male", "Doubles Female");
  }
  if (formats.includes("Mixed")) list.push("Mixed Doubles");
  if (formats.includes("Teams")) list.push("Teams");
  return list;
}

function defaultCategoryName(discipline: TournamentCategory["discipline"]) {
  if (discipline === "Teams") return "Open Teams";
  return discipline;
}

function renderStructureVisual(mode: "groups" | "knockout" | "rounds") {
  if (mode === "knockout") return <BracketPreviewCard />;
  if (mode === "rounds") return <RoundsProgressionCard />;
  return <GroupStagePreviewCard />;
}

export default function TournamentSetupPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [event, setEvent] = React.useState<ApiEvent | null>(null);
  const [formats, setFormats] = React.useState<TournamentFormat[]>(["Singles"]);
  const [structureMode, setStructureMode] =
    React.useState<StructureMode>("groups_knockout");
  const [categories, setCategories] = React.useState<TournamentCategory[]>([
    {
      id: crypto.randomUUID(),
      name: "Open Singles",
      discipline: "Singles",
      groups: 4,
    },
  ]);
  const selectedStructure = React.useMemo(
    () => STRUCTURE_OPTIONS.find((opt) => opt.id === structureMode),
    [structureMode],
  );

  React.useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);

      const token = getToken();
      const userId = getLoggedInUserId();

      if (!token || userId === null) {
        setError("Invalid session. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            data?.message?.[0] ||
              data?.error ||
              `Failed to load tournament (${res.status})`,
          );
        }

        const raw: ApiEvent[] = Array.isArray(data) ? data : (data?.data ?? []);
        const hasOwnerField = raw.some((e) => e.userId != null || e.user_id != null);
        const own = hasOwnerField
          ? raw.filter((e) => Number(e.userId ?? e.user_id) === userId)
          : raw;

        const selected =
          own.find(
            (e) =>
              String(e.id) === String(id) &&
              String(e.eventType ?? "").toUpperCase() === "TOURNAMENT",
          ) ?? null;

        if (!selected) {
          throw new Error("Tournament not found or you do not have access.");
        }

        if (cancelled) return;
        setEvent(selected);
        setFormats([normalizeFormat(selected.format)]);
        const saved = loadTournamentSetup(String(selected.id));
        if (saved) {
          const savedFormats =
            Array.isArray(saved.formats) && saved.formats.length > 0
              ? saved.formats
              : [];
          if (savedFormats.length > 0) {
            setFormats(
              savedFormats
                .map((f) => normalizeFormat(String(f)))
                .filter((v, idx, arr) => arr.indexOf(v) === idx),
            );
          }
          setStructureMode(saved.structureMode as StructureMode);
          setCategories(saved.categories);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to load tournament setup",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  React.useEffect(() => {
    setCategories((prev) => {
      const target = disciplinesFromFormats(formats);
      if (target.length === 0) return prev;

      const byDiscipline = new Map(prev.map((c) => [c.discipline, c]));
      return target.map((discipline) => {
        const existing = byDiscipline.get(discipline);
        if (existing) return existing;
        return {
          id: crypto.randomUUID(),
          name: defaultCategoryName(discipline),
          discipline,
          groups: 2,
        };
      });
    });
  }, [formats]);

  const addCategory = () => {
    setCategories((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        discipline: "Singles",
        groups: 2,
      },
    ]);
  };

  const saveSetupDraft = () => {
    if (!id) return;
    saveTournamentSetup(id, {
      formats,
      structureMode,
      categories: categories.filter((c) => c.name.trim()),
    });
  };

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
                Tournament Setup
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure format and future bracket flow for this tournament.
              </Typography>
            </Box>

            <Button
              variant="outlined"
              onClick={() => navigate("/tournaments")}
              sx={{ borderRadius: 999, alignSelf: { xs: "flex-start", sm: "auto" } }}
            >
              Back to Tournaments
            </Button>
          </Stack>
        </Paper>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography>Loading tournament setup…</Typography>
            </CardContent>
          </Card>
        ) : event ? (
          <Stack spacing={2}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  {event.name || "Untitled Tournament"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {event.locationName || "Venue TBD"} • {event.startDate || "Date TBD"}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body1" sx={{ fontWeight: 900, mb: 1 }}>
                  Format & Structure
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    Tournament Format
                  </Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
                    {FORMAT_OPTIONS.map((opt) => {
                      const selected = formats.includes(opt.id);
                      return (
                        <Card
                          key={opt.id}
                          onClick={() =>
                            setFormats((prev) => {
                              if (prev.includes(opt.id)) {
                                const next = prev.filter((v) => v !== opt.id);
                                return next.length ? next : prev;
                              }
                              return [...prev, opt.id];
                            })
                          }
                          sx={{
                            cursor: "pointer",
                            flex: 1,
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: selected
                              ? "rgba(139,92,246,0.45)"
                              : "rgba(15,23,42,0.10)",
                            bgcolor: selected
                              ? "rgba(139,92,246,0.06)"
                              : "background.paper",
                            transition: "all 120ms ease",
                            "&:hover": { borderColor: "rgba(139,92,246,0.35)" },
                          }}
                        >
                          <CardContent sx={{ p: 1.75 }}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              spacing={1}
                            >
                              <Typography sx={{ fontWeight: 800 }}>
                                {opt.title}
                              </Typography>
                              {selected ? (
                                <Chip
                                  label="Selected"
                                  size="small"
                                  sx={{
                                    height: 22,
                                    borderRadius: 999,
                                    bgcolor: "rgba(139,92,246,0.16)",
                                    color: "primary.main",
                                  }}
                                />
                              ) : null}
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              {opt.subtitle}
                            </Typography>
                            <Box
                              sx={{
                                mt: 1,
                                px: 1,
                                py: 0.75,
                                borderRadius: 1,
                                bgcolor: "rgba(15,23,42,0.04)",
                                fontSize: 12,
                                fontWeight: 700,
                                textAlign: "center",
                              }}
                            >
                              {opt.visual}
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      Structure Mode (choose one)
                    </Typography>
                    <Chip
                      size="small"
                      label={`Selected: ${selectedStructure?.title ?? "None"}`}
                      sx={{
                        borderRadius: 999,
                        bgcolor: "rgba(139,92,246,0.12)",
                        color: "primary.main",
                        width: "fit-content",
                      }}
                    />
                  </Stack>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} useFlexGap flexWrap="wrap">
                    {STRUCTURE_OPTIONS.map((opt) => {
                      const selected = structureMode === opt.id;
                      return (
                        <Card
                          key={opt.id}
                          onClick={() => setStructureMode(opt.id)}
                          sx={{
                            cursor: "pointer",
                            width: { xs: "100%", md: "calc(50% - 5px)" },
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: selected
                              ? "rgba(139,92,246,0.45)"
                              : "rgba(15,23,42,0.10)",
                            bgcolor: selected
                              ? "rgba(139,92,246,0.06)"
                              : "background.paper",
                            transition: "all 120ms ease",
                            "&:hover": { borderColor: "rgba(139,92,246,0.35)" },
                          }}
                        >
                          <CardContent sx={{ p: 1.75 }}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              sx={{ mb: 0.5 }}
                            >
                              <Typography sx={{ fontWeight: 800 }}>
                                {opt.title}
                              </Typography>
                              <Chip
                                size="small"
                                label={selected ? "Selected" : "Choose"}
                                variant={selected ? "filled" : "outlined"}
                                sx={{
                                  borderRadius: 999,
                                  ...(selected
                                    ? {
                                        bgcolor: "rgba(139,92,246,0.16)",
                                        color: "primary.main",
                                      }
                                    : {}),
                                }}
                              />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              {opt.subtitle}
                            </Typography>
                            {renderStructureVisual(opt.visual)}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ sm: "center" }}
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 900 }}>
                    Categories Configuration
                  </Typography>
                  <Button variant="outlined" onClick={addCategory} sx={{ borderRadius: 999 }}>
                    Add Category
                  </Button>
                </Stack>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1.5}>
                  {categories.map((cat, idx) => (
                    <Card
                      key={cat.id}
                      sx={{
                        borderRadius: 2,
                        border: "1px solid rgba(15,23,42,0.10)",
                        boxShadow: "none",
                      }}
                    >
                      <CardContent sx={{ p: 1.5 }}>
                        <Stack spacing={1.25}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography sx={{ fontWeight: 800 }}>
                              Category {idx + 1}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() =>
                                setCategories((prev) =>
                                  prev.length <= 1
                                    ? prev
                                    : prev.filter((c) => c.id !== cat.id),
                                )
                              }
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Stack>

                          <TextField
                            label="Category Name"
                            value={cat.name}
                            onChange={(e) =>
                              setCategories((prev) =>
                                prev.map((c) =>
                                  c.id === cat.id
                                    ? { ...c, name: e.target.value }
                                    : c,
                                ),
                              )
                            }
                            placeholder="e.g. Doubles Male A Grade"
                            fullWidth
                          />

                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                            <TextField
                              select
                              label="Discipline"
                              value={cat.discipline}
                              onChange={(e) =>
                                setCategories((prev) =>
                                  prev.map((c) =>
                                    c.id === cat.id
                                      ? {
                                          ...c,
                                          discipline: e.target
                                            .value as TournamentCategory["discipline"],
                                        }
                                      : c,
                                  ),
                                )
                              }
                              fullWidth
                            >
                              <MenuItem value="Singles">Singles</MenuItem>
                              <MenuItem value="Doubles Male">
                                Doubles Male
                              </MenuItem>
                              <MenuItem value="Doubles Female">
                                Doubles Female
                              </MenuItem>
                              <MenuItem value="Mixed Doubles">
                                Mixed Doubles
                              </MenuItem>
                              <MenuItem value="Teams">Teams</MenuItem>
                            </TextField>

                            <TextField
                              label="Groups"
                              type="number"
                              value={cat.groups}
                              onChange={(e) =>
                                setCategories((prev) =>
                                  prev.map((c) =>
                                    c.id === cat.id
                                      ? {
                                          ...c,
                                          groups: Math.max(
                                            1,
                                            Number(e.target.value || 1),
                                          ),
                                        }
                                      : c,
                                  ),
                                )
                              }
                              fullWidth
                            />
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.25}
                  sx={{ mt: 2 }}
                >
                  <Button
                    variant="contained"
                    onClick={() => {
                      saveSetupDraft();
                      navigate(`/tournaments/${id}/groups`);
                    }}
                    sx={{ borderRadius: 999 }}
                  >
                    Save & Manage Groups
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={saveSetupDraft}
                    sx={{ borderRadius: 999 }}
                  >
                    Save Draft
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <Alert severity="info">
              Bracket engine is not implemented yet. Planned features: group
              phase, knockout bracket, seeding, and rounds/matches progression
              (Tournify-style).
            </Alert>
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
}
