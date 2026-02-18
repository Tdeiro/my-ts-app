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
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useNavigate, useParams } from "react-router-dom";
import {
  buildDefaultGroups,
  loadTournamentMatches,
  loadTournamentGroups,
  loadTournamentSetup,
  saveTournamentMatches,
  saveTournamentGroups,
  type MatchFixture,
  type MatchStage,
  type MatchStatus,
  type TournamentCategory,
} from "../Utils/tournamentPlanner";

type InputMap = Record<string, string>;
type StructureMode =
  | "groups_knockout"
  | "knockout_only"
  | "group_phase_only"
  | "swiss";

function phaseTitle(mode: string) {
  switch (mode) {
    case "groups_knockout":
      return "Group Phase + Knockout";
    case "knockout_only":
      return "Knockout Phase";
    case "group_phase_only":
      return "Group Phase";
    case "swiss":
      return "Swiss Rounds";
    default:
      return "Tournament Phase";
  }
}

function nextGroupName(index: number) {
  return `Group ${index + 1}`;
}

function defaultStageFromMode(mode: StructureMode): MatchStage {
  if (mode === "swiss") return "swiss";
  if (mode === "knockout_only") return "knockout";
  return "group";
}

function emptyMatch(mode: StructureMode): MatchFixture {
  return {
    id: `m_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    stage: defaultStageFromMode(mode),
    home: "",
    away: "",
    scheduledAt: "",
    scoreHome: "",
    scoreAway: "",
    status: "pending",
  };
}

function stageOptionsFromMode(mode: StructureMode): MatchStage[] {
  if (mode === "knockout_only") return ["knockout"];
  if (mode === "group_phase_only") return ["group"];
  if (mode === "swiss") return ["swiss"];
  return ["group", "knockout"];
}

function stageLabel(stage: MatchStage) {
  if (stage === "group") return "Group";
  if (stage === "knockout") return "Knockout";
  return "Swiss";
}

function matchWinner(match: MatchFixture) {
  const home = Number(match.scoreHome);
  const away = Number(match.scoreAway);
  if (Number.isNaN(home) || Number.isNaN(away)) return null;
  if (home === away) return "Draw";
  return home > away ? match.home || "Home" : match.away || "Away";
}

export default function TournamentGroupsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournamentId = id ?? "";

  const setup = React.useMemo(
    () => (tournamentId ? loadTournamentSetup(tournamentId) : null),
    [tournamentId],
  );
  const structureMode = (setup?.structureMode ?? "groups_knockout") as StructureMode;

  const categories = setup?.categories ?? [];
  const [categoryId, setCategoryId] = React.useState(categories[0]?.id ?? "");
  const [groupsMap, setGroupsMap] = React.useState(() =>
    tournamentId ? loadTournamentGroups(tournamentId) : {},
  );
  const [matchesMap, setMatchesMap] = React.useState(() =>
    tournamentId ? loadTournamentMatches(tournamentId) : {},
  );
  const [inputs, setInputs] = React.useState<InputMap>({});
  const [stageFilter, setStageFilter] = React.useState<"all" | MatchStage>("all");
  const [groupFilter, setGroupFilter] = React.useState<"all" | string>("all");

  React.useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  React.useEffect(() => {
    setStageFilter("all");
    setGroupFilter("all");
  }, [categoryId]);

  const selectedCategory: TournamentCategory | undefined = categories.find(
    (c) => c.id === categoryId,
  );

  const groups = React.useMemo(() => {
    if (!selectedCategory) return [];
    const existing = groupsMap[selectedCategory.id];
    return existing?.length
      ? existing
      : buildDefaultGroups(selectedCategory.groups);
  }, [groupsMap, selectedCategory]);

  const entrants = React.useMemo(
    () => groups.flatMap((g) => g.participants),
    [groups],
  );
  const matches = React.useMemo(() => {
    if (!selectedCategory) return [];
    return matchesMap[selectedCategory.id] ?? [];
  }, [matchesMap, selectedCategory]);
  const visibleMatches = React.useMemo(
    () =>
      matches.filter((m) => {
        const stageOk = stageFilter === "all" || m.stage === stageFilter;
        const groupOk = groupFilter === "all" || (m.groupId ?? "") === groupFilter;
        return stageOk && groupOk;
      }),
    [groupFilter, matches, stageFilter],
  );

  const persistGroups = (nextGroups: typeof groups) => {
    if (!selectedCategory || !tournamentId) return;
    const nextMap = { ...groupsMap, [selectedCategory.id]: nextGroups };
    setGroupsMap(nextMap);
    saveTournamentGroups(tournamentId, nextMap);
  };

  const persistMatches = (nextMatches: MatchFixture[]) => {
    if (!selectedCategory || !tournamentId) return;
    const nextMap = { ...matchesMap, [selectedCategory.id]: nextMatches };
    setMatchesMap(nextMap);
    saveTournamentMatches(tournamentId, nextMap);
  };

  const addParticipant = (groupId: string) => {
    const name = (inputs[groupId] ?? "").trim();
    if (!name) return;
    const next = groups.map((g) =>
      g.id === groupId ? { ...g, participants: [...g.participants, name] } : g,
    );
    persistGroups(next);
    setInputs((prev) => ({ ...prev, [groupId]: "" }));
  };

  const removeParticipant = (groupId: string, index: number) => {
    const next = groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            participants: g.participants.filter((_, idx) => idx !== index),
          }
        : g,
    );
    persistGroups(next);
  };

  const addGroup = () => {
    const nextIndex = groups.length;
    const next = [
      ...groups,
      {
        id: `g${Date.now()}_${nextIndex + 1}`,
        name: nextGroupName(nextIndex),
        participants: [],
      },
    ];
    persistGroups(next);
  };

  const removeGroup = (groupId: string) => {
    const next = groups.filter((g) => g.id !== groupId);
    if (!next.length) return;
    persistGroups(next);
  };

  const addMatch = () => {
    const defaults = emptyMatch(structureMode);
    const seeded = {
      ...defaults,
      groupId: groups[0]?.id,
      home: entrants[0] ?? "",
      away: entrants[1] ?? "",
    };
    persistMatches([...matches, seeded]);
  };

  const autoGenerateGroupMatches = () => {
    const stage = structureMode === "swiss" ? "swiss" : "group";
    const generated: MatchFixture[] = [];

    groups.forEach((group) => {
      const participants = group.participants.filter((name) => name.trim());
      for (let i = 0; i < participants.length; i += 1) {
        for (let j = i + 1; j < participants.length; j += 1) {
          generated.push({
            id: `m_${Date.now()}_${group.id}_${i}_${j}`,
            stage,
            groupId: group.id,
            round: generated.length + 1,
            home: participants[i],
            away: participants[j],
            scheduledAt: "",
            scoreHome: "",
            scoreAway: "",
            status: "pending",
          });
        }
      }
    });

    const keepNonGroup = matches.filter(
      (m) => m.stage !== "group" && m.stage !== "swiss",
    );
    persistMatches([...keepNonGroup, ...generated]);
  };

  const clearCategoryMatches = () => {
    persistMatches([]);
  };

  const updateMatch = <K extends keyof MatchFixture>(
    matchId: string,
    key: K,
    value: MatchFixture[K],
  ) => {
    const next = matches.map((m) =>
      m.id === matchId ? { ...m, [key]: value } : m,
    );
    persistMatches(next);
  };

  const removeMatch = (matchId: string) => {
    const next = matches.filter((m) => m.id !== matchId);
    persistMatches(next);
  };

  if (!setup) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          No tournament setup draft found yet. Configure categories first.
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate(`/tournaments/${id}/setup`)}
        >
          Go To Setup
        </Button>
      </Box>
    );
  }

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
          <CardContent sx={{ p: 0 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={1.5}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  Tournament Management Board
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Minimalist board to manage participants and phase progression.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/tournaments/${id}/setup`)}
                  sx={{ borderRadius: 999 }}
                >
                  Back To Setup
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate("/tournaments")}
                  sx={{ borderRadius: 999 }}
                >
                  Done
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Paper>

        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              alignItems={{ md: "center" }}
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Choose Category
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={phaseTitle(structureMode)}
                  variant="outlined"
                  sx={{ borderRadius: 999, width: "fit-content" }}
                />
                <Chip
                  label={`Groups: ${groups.length}`}
                  variant="outlined"
                  sx={{ borderRadius: 999, width: "fit-content" }}
                />
                <Chip
                  label={`Matches: ${matches.length}`}
                  variant="outlined"
                  sx={{ borderRadius: 999, width: "fit-content" }}
                />
              </Stack>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={cat.id === categoryId ? "contained" : "outlined"}
                  onClick={() => setCategoryId(cat.id)}
                  sx={{ borderRadius: 999 }}
                >
                  {cat.name || cat.discipline}
                </Button>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {/* Mini-sheet style group management board */}
        {(structureMode === "groups_knockout" ||
          structureMode === "group_phase_only" ||
          structureMode === "swiss") && (
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 900, mb: 1 }}>
                {structureMode === "swiss" ? "Swiss Pool" : "Group Phase Board"}
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ sm: "center" }}
                sx={{ mb: 1.25 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Add groups and assign participants for this category.
                </Typography>
                <Button
                  variant="outlined"
                  onClick={addGroup}
                  startIcon={<AddRoundedIcon />}
                  sx={{ borderRadius: 999, width: "fit-content" }}
                >
                  Add Group
                </Button>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Stack
                direction="row"
                spacing={1.25}
                useFlexGap
                flexWrap="wrap"
                sx={{ alignItems: "stretch" }}
              >
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    sx={{
                      width: { xs: "100%", md: "calc(50% - 5px)", xl: "calc(33.333% - 7px)" },
                      borderRadius: 1.5,
                      border: "1px solid rgba(15,23,42,0.10)",
                      boxShadow: "none",
                    }}
                  >
                    <CardContent sx={{ p: 1.5 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ mb: 0.75 }}
                      >
                        <Typography sx={{ fontWeight: 900 }}>
                          {group.name}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Delete ${group.name}`}
                          onClick={() => removeGroup(group.id)}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Box
                        sx={{
                          border: "1px solid rgba(15,23,42,0.10)",
                          borderRadius: 1,
                          overflow: "hidden",
                          mb: 1.25,
                        }}
                      >
                        <Box
                          sx={{
                            px: 1,
                            py: 0.75,
                            bgcolor: "rgba(15,23,42,0.05)",
                            borderBottom: "1px solid rgba(15,23,42,0.08)",
                          }}
                        >
                          <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
                            Participants
                          </Typography>
                        </Box>
                        {(group.participants.length ? group.participants : [""]).map(
                          (p, idx) => (
                            <Box
                              key={`${group.id}-${idx}`}
                              sx={{
                                px: 1,
                                py: 0.75,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 1,
                                borderTop:
                                  idx === 0
                                    ? "none"
                                    : "1px solid rgba(15,23,42,0.06)",
                                minHeight: 34,
                              }}
                            >
                              <Typography sx={{ fontSize: 13 }}>
                                {p || (
                                  <Box component="span" sx={{ color: "text.disabled" }}>
                                    Empty slot
                                  </Box>
                                )}
                              </Typography>
                              {p ? (
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => removeParticipant(group.id, idx)}
                                >
                                  Remove
                                </Button>
                              ) : null}
                            </Box>
                          ),
                        )}
                      </Box>

                      <Stack direction="row" spacing={1}>
                        <TextField
                          size="small"
                          placeholder="Add name"
                          value={inputs[group.id] ?? ""}
                          onChange={(e) =>
                            setInputs((prev) => ({
                              ...prev,
                              [group.id]: e.target.value,
                            }))
                          }
                          fullWidth
                        />
                        <Button
                          variant="contained"
                          onClick={() => addParticipant(group.id)}
                          sx={{ borderRadius: 999, minWidth: 74 }}
                        >
                          Add
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              sx={{ mb: 1.25 }}
            >
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 900 }}>
                  Matches & Results
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure game times, add scores, and publish outcomes for{" "}
                  {selectedCategory?.name || selectedCategory?.discipline || "this category"}.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {(structureMode === "groups_knockout" ||
                  structureMode === "group_phase_only" ||
                  structureMode === "swiss") && (
                  <Button
                    variant="outlined"
                    onClick={autoGenerateGroupMatches}
                    sx={{ borderRadius: 999, width: "fit-content" }}
                  >
                    Auto Generate Fixtures
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<AddRoundedIcon />}
                  onClick={addMatch}
                  sx={{ borderRadius: 999, width: "fit-content" }}
                >
                  Add Match
                </Button>
                <Button
                  variant="text"
                  color="error"
                  onClick={clearCategoryMatches}
                  sx={{ borderRadius: 999, width: "fit-content" }}
                >
                  Clear
                </Button>
              </Stack>
            </Stack>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              sx={{ mb: 1.5 }}
            >
              <TextField
                select
                size="small"
                label="Stage Filter"
                value={stageFilter}
                onChange={(e) =>
                  setStageFilter(e.target.value as "all" | MatchStage)
                }
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="all">All Stages</MenuItem>
                {stageOptionsFromMode(structureMode).map((stage) => (
                  <MenuItem key={stage} value={stage}>
                    {stageLabel(stage)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Group Filter"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value as "all" | string)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="all">All Groups</MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1}>
              {visibleMatches.length === 0 ? (
                <Box
                  sx={{
                    py: 2.5,
                    px: 2,
                    border: "1px dashed rgba(15,23,42,0.20)",
                    borderRadius: 1.5,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No matches for this filter/category. Add or auto-generate fixtures.
                  </Typography>
                </Box>
              ) : (
                visibleMatches.map((match, index) => (
                  <Card
                    key={match.id}
                    sx={{
                      borderRadius: 1.5,
                      border: "1px solid rgba(15,23,42,0.10)",
                      boxShadow: "none",
                    }}
                  >
                    <CardContent sx={{ p: 1.5 }}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                        alignItems={{ md: "center" }}
                        justifyContent="space-between"
                        sx={{ mb: 1.25 }}
                      >
                        <Typography sx={{ fontWeight: 800 }}>
                          Match {index + 1}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            label={stageLabel(match.stage)}
                            variant="outlined"
                            sx={{ borderRadius: 999 }}
                          />
                          {match.groupId ? (
                            <Chip
                              size="small"
                              label={groups.find((g) => g.id === match.groupId)?.name || "Group"}
                              variant="outlined"
                              sx={{ borderRadius: 999 }}
                            />
                          ) : null}
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Delete match ${index + 1}`}
                            onClick={() => removeMatch(match.id)}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                      <Stack direction={{ xs: "column", lg: "row" }} spacing={1}>
                        <TextField
                          select
                          size="small"
                          label="Stage"
                          value={match.stage}
                          onChange={(e) =>
                            updateMatch(
                              match.id,
                              "stage",
                              e.target.value as MatchStage,
                            )
                          }
                          sx={{ minWidth: 150 }}
                        >
                          {stageOptionsFromMode(structureMode).map((stage) => (
                            <MenuItem key={stage} value={stage}>
                              {stageLabel(stage)}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          select
                          size="small"
                          label="Group"
                          value={match.groupId ?? ""}
                          onChange={(e) =>
                            updateMatch(match.id, "groupId", e.target.value)
                          }
                          sx={{ minWidth: 160 }}
                        >
                          <MenuItem value="">No Group</MenuItem>
                          {groups.map((group) => (
                            <MenuItem key={group.id} value={group.id}>
                              {group.name}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          size="small"
                          label="Home"
                          value={match.home}
                          onChange={(e) =>
                            updateMatch(match.id, "home", e.target.value)
                          }
                          fullWidth
                        />
                        <TextField
                          size="small"
                          label="Away"
                          value={match.away}
                          onChange={(e) =>
                            updateMatch(match.id, "away", e.target.value)
                          }
                          fullWidth
                        />
                        <TextField
                          size="small"
                          label="Game Time"
                          type="datetime-local"
                          value={match.scheduledAt}
                          onChange={(e) =>
                            updateMatch(match.id, "scheduledAt", e.target.value)
                          }
                          InputLabelProps={{ shrink: true }}
                          sx={{ minWidth: 220 }}
                        />
                        <TextField
                          size="small"
                          label="Score H"
                          type="number"
                          value={match.scoreHome}
                          onChange={(e) =>
                            updateMatch(match.id, "scoreHome", e.target.value)
                          }
                          sx={{ width: 96 }}
                        />
                        <TextField
                          size="small"
                          label="Score A"
                          type="number"
                          value={match.scoreAway}
                          onChange={(e) =>
                            updateMatch(match.id, "scoreAway", e.target.value)
                          }
                          sx={{ width: 96 }}
                        />
                        <TextField
                          select
                          size="small"
                          label="Result"
                          value={match.status}
                          onChange={(e) =>
                            updateMatch(
                              match.id,
                              "status",
                              e.target.value as MatchStatus,
                            )
                          }
                          sx={{ minWidth: 130 }}
                        >
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="final">Final</MenuItem>
                        </TextField>
                      </Stack>
                      {match.status === "final" ? (
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Chip
                            size="small"
                            label={`Winner: ${matchWinner(match) ?? "TBD"}`}
                            sx={{
                              borderRadius: 999,
                              bgcolor: "rgba(139,92,246,0.12)",
                              color: "primary.main",
                            }}
                          />
                        </Stack>
                      ) : null}
                    </CardContent>
                  </Card>
                ))
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Knockout progression lane */}
        {(structureMode === "groups_knockout" ||
          structureMode === "knockout_only") && (
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 900, mb: 1 }}>
                Knockout Phase Progression
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.25}
                alignItems="stretch"
              >
                <PhaseColumn
                  title={
                    structureMode === "groups_knockout"
                      ? "Qualified From Groups"
                      : "Participants"
                  }
                  rows={
                    entrants.length
                      ? entrants.slice(0, 8)
                      : ["Waiting for participants"]
                  }
                />
                <ArrowCell />
                <PhaseColumn
                  title="Semifinals"
                  rows={["Match 1", "Match 2"]}
                />
                <ArrowCell />
                <PhaseColumn title="Final" rows={["Championship Match"]} />
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
}

function PhaseColumn({ title, rows }: { title: string; rows: string[] }) {
  return (
    <Card
      sx={{
        flex: 1,
        borderRadius: 1.5,
        border: "1px solid rgba(15,23,42,0.10)",
        boxShadow: "none",
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Typography sx={{ fontWeight: 800, mb: 1 }}>{title}</Typography>
        <Box
          sx={{
            border: "1px solid rgba(15,23,42,0.10)",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          {rows.map((row, idx) => (
            <Box
              key={`${title}-${idx}`}
              sx={{
                px: 1,
                py: 0.85,
                borderTop: idx === 0 ? "none" : "1px solid rgba(15,23,42,0.06)",
                minHeight: 36,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Typography sx={{ fontSize: 13 }}>{row}</Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

function ArrowCell() {
  return (
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        alignItems: "center",
        justifyContent: "center",
        px: 0.5,
        color: "text.disabled",
        fontWeight: 900,
      }}
    >
      →
    </Box>
  );
}
