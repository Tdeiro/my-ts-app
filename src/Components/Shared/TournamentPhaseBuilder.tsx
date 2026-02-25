import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import type { GroupBucket } from "../../Utils/tournamentPlanner";

export type BuilderBracketMatch = {
  id: string;
  name: string;
  round: string;
  roundIndex: number;
  home: string;
  away: string;
};

type Props = {
  groups: GroupBucket[];
  bracketMatches: BuilderBracketMatch[];
  groupCount: number;
  teamsPerGroup: number;
  qualifiersPerGroup: number;
  entryLabel?: string;
  structureMode?: "groups_knockout" | "knockout_only" | "group_phase_only" | "swiss" | "";
  onGroupsChange: (groups: GroupBucket[]) => void;
  onBracketChange: (matches: BuilderBracketMatch[]) => void;
  onGroupCountChange?: (count: number) => void;
};

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function roundNameForSize(size: number): string {
  if (size === 2) return "Final";
  if (size === 4) return "Semifinals";
  if (size === 8) return "Quarterfinals";
  return `Round of ${size}`;
}

function groupLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function generateGroupsSkeleton(
  groupCount: number,
  teamsPerGroup: number,
  existingTeams: string[] = [],
): GroupBucket[] {
  const safeGroupCount = Math.max(1, groupCount);
  const safeTeamsPerGroup = Math.max(4, teamsPerGroup);
  const slots = safeGroupCount * safeTeamsPerGroup;
  const source = existingTeams.slice(0, slots);
  const groups: GroupBucket[] = Array.from({ length: safeGroupCount }, (_, idx) => ({
    id: `g_${idx + 1}`,
    name: `Group ${groupLetter(idx)}`,
    participants: Array.from({ length: safeTeamsPerGroup }, () => ""),
  }));

  source.forEach((team, idx) => {
    const groupIdx = idx % safeGroupCount;
    const rowIdx = Math.floor(idx / safeGroupCount);
    if (rowIdx < safeTeamsPerGroup) groups[groupIdx].participants[rowIdx] = team;
  });

  return groups;
}

export function generateBracketSkeleton(
  groupCount: number,
  qualifiersPerGroup: number,
): BuilderBracketMatch[] {
  const qualified = Math.max(1, groupCount) * Math.max(1, qualifiersPerGroup);
  const bracketSize = nextPowerOfTwo(Math.max(2, qualified));
  const seeds: string[] = [];

  for (let g = 0; g < Math.max(1, groupCount); g += 1) {
    for (let pos = 1; pos <= Math.max(1, qualifiersPerGroup); pos += 1) {
      seeds.push(`${groupLetter(g)}${pos}`);
    }
  }
  while (seeds.length < bracketSize) seeds.push("TBD");

  let roundSize = bracketSize;
  let roundIndex = 0;
  let matchCounter = 1;
  const allMatches: BuilderBracketMatch[] = [];
  let previousRoundNames: string[] = [];

  while (roundSize >= 2) {
    const roundMatches = roundSize / 2;
    const roundName = roundNameForSize(roundSize);
    const thisRoundNames: string[] = [];
    for (let i = 0; i < roundMatches; i += 1) {
      const name = `Match E${matchCounter++}`;
      thisRoundNames.push(name);
      const home =
        roundIndex === 0 ? (seeds[i] ?? "TBD") : `Winner ${previousRoundNames[i * 2]}`;
      const away =
        roundIndex === 0
          ? (seeds[roundSize - 1 - i] ?? "TBD")
          : `Winner ${previousRoundNames[i * 2 + 1]}`;
      allMatches.push({
        id: `bm_${roundIndex}_${i + 1}`,
        name,
        round: roundName,
        roundIndex,
        home,
        away,
      });
    }
    previousRoundNames = thisRoundNames;
    roundSize = roundSize / 2;
    roundIndex += 1;
  }

  return allMatches;
}

export default function TournamentPhaseBuilder({
  groups,
  bracketMatches,
  groupCount,
  teamsPerGroup,
  qualifiersPerGroup,
  entryLabel = "Team",
  structureMode = "",
  onGroupsChange,
  onBracketChange,
  onGroupCountChange,
}: Props) {
  const bracketSize = Math.max(1, groupCount) * Math.max(1, qualifiersPerGroup);
  const powerOk = isPowerOfTwo(bracketSize);
  const suggested = nextPowerOfTwo(bracketSize);
  const rounds = React.useMemo(() => {
    const map = new Map<number, BuilderBracketMatch[]>();
    bracketMatches.forEach((m) => {
      const list = map.get(m.roundIndex) ?? [];
      list.push(m);
      map.set(m.roundIndex, list);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, matches]) => matches);
  }, [bracketMatches]);

  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState("");
  const [renameTarget, setRenameTarget] = React.useState<{
    kind: "group" | "match";
    id: string;
  } | null>(null);

  const [slotOpen, setSlotOpen] = React.useState(false);
  const [slotValue, setSlotValue] = React.useState("");
  const [slotTarget, setSlotTarget] = React.useState<{
    kind: "group" | "match";
    id: string;
    index?: number;
    side?: "home" | "away";
  } | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<{
    kind: "group" | "match";
    id: string;
    label: string;
  } | null>(null);
  const [showGroupPhase, setShowGroupPhase] = React.useState(true);
  const [showKnockoutPhase, setShowKnockoutPhase] = React.useState(true);

  React.useEffect(() => {
    if (structureMode === "group_phase_only" || structureMode === "swiss") {
      setShowGroupPhase(true);
      setShowKnockoutPhase(false);
      return;
    }
    if (structureMode === "knockout_only") {
      setShowGroupPhase(false);
      setShowKnockoutPhase(true);
      return;
    }
    setShowGroupPhase(true);
    setShowKnockoutPhase(true);
  }, [structureMode]);

  const openRename = (kind: "group" | "match", id: string, value: string) => {
    setRenameTarget({ kind, id });
    setRenameValue(value);
    setRenameOpen(true);
  };

  const confirmRename = () => {
    if (!renameTarget) return;
    if (renameTarget.kind === "group") {
      onGroupsChange(
        groups.map((g) =>
          g.id === renameTarget.id ? { ...g, name: renameValue.trim() || g.name } : g,
        ),
      );
    } else {
      onBracketChange(
        bracketMatches.map((m) =>
          m.id === renameTarget.id ? { ...m, name: renameValue.trim() || m.name } : m,
        ),
      );
    }
    setRenameOpen(false);
  };

  const openSlotEditor = (
    target: {
      kind: "group" | "match";
      id: string;
      index?: number;
      side?: "home" | "away";
    },
    value: string,
  ) => {
    setSlotTarget(target);
    setSlotValue(value);
    setSlotOpen(true);
  };

  const confirmSlot = () => {
    if (!slotTarget) return;
    if (slotTarget.kind === "group" && slotTarget.index != null) {
      onGroupsChange(
        groups.map((g) => {
          if (g.id !== slotTarget.id) return g;
          const participants = [...g.participants];
          while (participants.length <= slotTarget.index!) participants.push("");
          participants[slotTarget.index!] = slotValue.trim();
          return { ...g, participants };
        }),
      );
    } else if (slotTarget.kind === "match" && slotTarget.side) {
      onBracketChange(
        bracketMatches.map((m) =>
          m.id === slotTarget.id ? { ...m, [slotTarget.side!]: slotValue.trim() } : m,
        ),
      );
    }
    setSlotOpen(false);
  };

  const addGroup = () => {
    const next = [
      ...groups,
      {
        id: `g_${Date.now()}`,
        name: `Group ${groupLetter(groups.length)}`,
        participants: Array.from({ length: Math.max(4, teamsPerGroup) }, () => ""),
      },
    ];
    onGroupsChange(next);
    onGroupCountChange?.(next.length);
  };

  const deleteGroup = (id: string) => {
    const next = groups.filter((g) => g.id !== id);
    if (next.length === 0) return;
    onGroupsChange(next);
    onGroupCountChange?.(next.length);
  };

  const addTeamToGroup = (groupId: string) => {
    onGroupsChange(
      groups.map((g) =>
        g.id === groupId ? { ...g, participants: [...g.participants, ""] } : g,
      ),
    );
  };

  const clearGroupSlot = (groupId: string, slotIndex: number) => {
    onGroupsChange(
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const participants = [...g.participants];
        while (participants.length <= slotIndex) participants.push("");
        const value = participants[slotIndex] ?? "";
        const minimumSlots = Math.max(4, teamsPerGroup);
        if (!value.trim() && participants.length > minimumSlots) {
          participants.splice(slotIndex, 1);
        } else {
          participants[slotIndex] = "";
        }
        return { ...g, participants };
      }),
    );
  };

  const regenerate = () => {
    const existingTeams = groups.flatMap((g) => g.participants).filter((v) => v.trim());
    onGroupsChange(generateGroupsSkeleton(groupCount, teamsPerGroup, existingTeams));
    onBracketChange(generateBracketSkeleton(groupCount, qualifiersPerGroup));
    setShowKnockoutPhase(true);
  };

  const addSingleMatch = () => {
    const firstRound = rounds[0] ?? [];
    const nextIdx = firstRound.length + 1;
    const match: BuilderBracketMatch = {
      id: `bm_manual_${Date.now()}`,
      name: `Match E${bracketMatches.length + 1}`,
      round: firstRound[0]?.round ?? roundNameForSize(nextPowerOfTwo(bracketSize)),
      roundIndex: 0,
      home: "TBD",
      away: "TBD",
    };
    const next = [...bracketMatches, match];
    void nextIdx;
    onBracketChange(next);
  };

  const addFinalMatch = () => {
    if (rounds.length === 0) return;
    const finalRound = rounds[rounds.length - 1];
    const roundIndex = finalRound[0]?.roundIndex ?? 0;
    const round = finalRound[0]?.round ?? "Final";
    const next: BuilderBracketMatch = {
      id: `bm_final_${Date.now()}`,
      name: `Match E${bracketMatches.length + 1}`,
      round,
      roundIndex,
      home: "TBD",
      away: "TBD",
    };
    onBracketChange([...bracketMatches, next]);
  };

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", xl: "row" }}
        spacing={{ xs: 2, lg: 3, xl: 4 }}
        alignItems="flex-start"
        sx={{ width: "100%", minWidth: 0 }}
      >
      {showGroupPhase ? (
      <Box sx={{ width: "100%", maxWidth: { xl: 420 }, flexShrink: 0 }}>
        <Card sx={{ borderRadius: 2, width: "100%" }}>
          <CardContent sx={{ p: 1.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Group Phase</Typography>
            {!powerOk ? (
              <Alert severity="warning" sx={{ mb: 1.25 }}>
                Qualified teams = {bracketSize}. Not a power of 2. Suggested bracket size: {suggested}.
              </Alert>
            ) : null}
            <Stack spacing={1.25}>
              {groups.map((group) => {
                const slots = Math.max(Math.max(4, teamsPerGroup), group.participants.length);
                return (
                  <Card key={group.id} sx={{ borderRadius: 1.5, border: "1px solid rgba(15,23,42,0.10)", boxShadow: "none" }}>
                    <Box
                      sx={{
                        px: 1.25,
                        py: 0.75,
                        bgcolor: "rgba(139,92,246,0.16)",
                        borderBottom: "1px solid rgba(139,92,246,0.22)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography sx={{ fontWeight: 800 }}>{group.name}</Typography>
                      <Stack direction="row" spacing={0.25}>
                        <IconButton size="small" onClick={() => openRename("group", group.id, group.name)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setDeleteTarget({ kind: "group", id: group.id, label: group.name })
                          }
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                    <CardContent sx={{ p: 1 }}>
                      <Stack spacing={0.5}>
                        {Array.from({ length: slots }).map((_, idx) => (
                          <Box
                            key={`${group.id}-${idx}`}
                            sx={{
                              px: 1,
                              py: 0.75,
                              borderRadius: 1,
                              bgcolor: "rgba(15,23,42,0.03)",
                              border: "1px solid rgba(15,23,42,0.08)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography variant="body2" color={group.participants[idx] ? "text.primary" : "text.secondary"}>
                              {group.participants[idx] || "EMPTY SPOT"}
                            </Typography>
                            <Stack direction="row" spacing={0.25}>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  openSlotEditor(
                                    { kind: "group", id: group.id, index: idx },
                                    group.participants[idx] ?? "",
                                  )
                                }
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => clearGroupSlot(group.id, idx)}
                              >
                                <ClearRoundedIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                      <Button size="small" variant="outlined" sx={{ mt: 1, borderRadius: 999 }} onClick={() => addTeamToGroup(group.id)}>
                        {`+ ${entryLabel}`}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} useFlexGap flexWrap="wrap">
              <Button size="small" variant="outlined" sx={{ borderRadius: 999 }} onClick={addGroup}>
                + GROUP
              </Button>
              <Button size="small" variant="outlined" sx={{ borderRadius: 999 }} onClick={regenerate}>
                + BRACKET
              </Button>
              <Button size="small" variant="outlined" sx={{ borderRadius: 999 }} onClick={addSingleMatch}>
                + SINGLE MATCH
              </Button>
            </Stack>
            {!showKnockoutPhase ? (
              <Button
                size="small"
                variant="outlined"
                sx={{ mt: 1, borderRadius: 999 }}
                onClick={() => setShowKnockoutPhase(true)}
              >
                Show Knockout Phase
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </Box>
      ) : null}

      {showKnockoutPhase ? (
      <Box sx={{ width: "100%", flex: 1, minWidth: 0 }}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 900 }}>Knockout Phase</Typography>
              {!showGroupPhase ? (
                <Button size="small" variant="outlined" sx={{ borderRadius: 999 }} onClick={() => setShowGroupPhase(true)}>
                  Show Group Phase
                </Button>
              ) : null}
            </Stack>
            <Card sx={{ borderRadius: 1.5, border: "1px solid rgba(15,23,42,0.10)", boxShadow: "none" }}>
              <Box
                sx={{
                  px: 1.25,
                  py: 0.75,
                  bgcolor: "rgba(139,92,246,0.16)",
                  borderBottom: "1px solid rgba(139,92,246,0.22)",
                }}
              >
                <Typography sx={{ fontWeight: 800 }}>Bracket E</Typography>
              </Box>
              <CardContent sx={{ p: 1 }}>
                <Box sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  <Stack direction="row" spacing={1.25} sx={{ minWidth: "max-content" }}>
                    {rounds.map((roundMatches, idx) => {
                      const isFinal = idx === rounds.length - 1;
                      return (
                        <Box key={`round-${idx}`} sx={{ width: 260 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.75 }}>
                            {roundMatches[0]?.round ?? "Round"}
                          </Typography>
                          <Stack spacing={0.75}>
                            {roundMatches.map((match) => (
                              <Card key={match.id} sx={{ borderRadius: 1.25, border: "1px solid rgba(15,23,42,0.10)", boxShadow: "none" }}>
                                <Box
                                  sx={{
                                    px: 1,
                                    py: 0.5,
                                    bgcolor: "rgba(139,92,246,0.12)",
                                    borderBottom: "1px solid rgba(139,92,246,0.18)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {match.name}
                                  </Typography>
                                  <Stack direction="row" spacing={0.25}>
                                    <IconButton size="small" onClick={() => openRename("match", match.id, match.name)}>
                                      <EditOutlinedIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        setDeleteTarget({
                                          kind: "match",
                                          id: match.id,
                                          label: match.name,
                                        })
                                      }
                                    >
                                      <DeleteOutlineRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                </Box>
                                <CardContent sx={{ p: 1 }}>
                                  <Stack spacing={0.5}>
                                    <Box
                                      sx={{
                                        px: 1,
                                        py: 0.65,
                                        borderRadius: 1,
                                        border: "1px solid rgba(15,23,42,0.08)",
                                        bgcolor: "rgba(15,23,42,0.03)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                      }}
                                    >
                                      <Typography variant="body2" color={match.home ? "text.primary" : "text.secondary"}>
                                        {match.home || "EMPTY SPOT"}
                                      </Typography>
                                      <IconButton size="small" onClick={() => openSlotEditor({ kind: "match", id: match.id, side: "home" }, match.home)}>
                                        <EditOutlinedIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                    <Box
                                      sx={{
                                        px: 1,
                                        py: 0.65,
                                        borderRadius: 1,
                                        border: "1px solid rgba(15,23,42,0.08)",
                                        bgcolor: "rgba(15,23,42,0.03)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                      }}
                                    >
                                      <Typography variant="body2" color={match.away ? "text.primary" : "text.secondary"}>
                                        {match.away || "EMPTY SPOT"}
                                      </Typography>
                                      <IconButton size="small" onClick={() => openSlotEditor({ kind: "match", id: match.id, side: "away" }, match.away)}>
                                        <EditOutlinedIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  </Stack>
                                </CardContent>
                              </Card>
                            ))}
                            {isFinal ? (
                              <Button size="small" variant="outlined" sx={{ borderRadius: 999 }} onClick={addFinalMatch}>
                                + MATCH
                              </Button>
                            ) : null}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
                <Button sx={{ mt: 1.25, borderRadius: 999 }} size="small" variant="outlined" onClick={regenerate}>
                  + BRACKET ({Math.max(2, nextPowerOfTwo(bracketSize))})
                </Button>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </Box>
      ) : null}

      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Rename</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            label="Name"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)}>Cancel</Button>
          <Button onClick={confirmRename} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={slotOpen} onClose={() => setSlotOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Edit Slot</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={slotValue}
            onChange={(e) => setSlotValue(e.target.value)}
            label={`${entryLabel} / Seed`}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSlotOpen(false)}>Cancel</Button>
          <Button onClick={confirmSlot} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Delete {deleteTarget?.label}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (!deleteTarget) return;
              if (deleteTarget.kind === "group") {
                deleteGroup(deleteTarget.id);
              } else {
                onBracketChange(bracketMatches.filter((m) => m.id !== deleteTarget.id));
              }
              setDeleteTarget(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      </Stack>
    </Box>
  );
}
