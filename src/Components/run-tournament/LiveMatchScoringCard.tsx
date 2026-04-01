import * as React from "react";
import {
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";

type MatchStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";

type LiveSet = {
  id: string;
  home: number;
  away: number;
  completed: boolean;
};

export type LiveMatchSnapshot = {
  matchId: string;
  status: MatchStatus;
  sets: LiveSet[];
  homeSetsWon: number;
  awaySetsWon: number;
  winner: "home" | "away" | null;
  updatedAt: string;
};

type PersistResult = {
  savedAt: string;
};

export async function mockSaveLiveMatchState(
  snapshot: LiveMatchSnapshot,
): Promise<PersistResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 420));
  return { savedAt: snapshot.updatedAt };
}

type LiveMatchScoringCardProps = {
  matchId: string;
  courtLabel: string;
  matchTimeLabel: string;
  groupLabel?: string;
  homeTeamName: string;
  awayTeamName: string;
  bestOf?: 3 | 5;
  initialStatus?: MatchStatus;
  initialSets?: Array<Pick<LiveSet, "home" | "away" | "completed">>;
  onPersist?: (snapshot: LiveMatchSnapshot) => Promise<PersistResult>;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type MatchHeaderProps = {
  courtLabel: string;
  matchTimeLabel: string;
  groupLabel?: string;
  status: MatchStatus;
};

type TeamsDisplayProps = {
  homeTeamName: string;
  awayTeamName: string;
  winner: "home" | "away" | null;
};

type ScoreBoardProps = {
  homeSetsWon: number;
  awaySetsWon: number;
  status: MatchStatus;
  saveState: SaveState;
};

type SetsListProps = {
  sets: LiveSet[];
  activeSetIndex: number;
};

type MatchActionsProps = {
  status: MatchStatus;
  hasWinner: boolean;
  canUndo: boolean;
  isSaving: boolean;
  homeTeamName: string;
  awayTeamName: string;
  onStart: () => void;
  onFinalize: () => void;
  onUndo: () => void;
  onAddHome: () => void;
  onAddAway: () => void;
};

type MatchState = {
  status: MatchStatus;
  sets: LiveSet[];
};

function makeSet(index: number, partial?: Partial<LiveSet>): LiveSet {
  return {
    id: `set-${index + 1}`,
    home: partial?.home ?? 0,
    away: partial?.away ?? 0,
    completed: partial?.completed ?? false,
  };
}

function normalizeInitialSets(
  sets?: Array<Pick<LiveSet, "home" | "away" | "completed">>,
): LiveSet[] {
  const normalized = Array.isArray(sets)
    ? sets.map((set, index) => makeSet(index, set))
    : [];
  return normalized.length > 0 ? normalized : [makeSet(0)];
}

function isSetComplete(home: number, away: number): boolean {
  const maxScore = Math.max(home, away);
  const minScore = Math.min(home, away);
  if (maxScore >= 7 && maxScore - minScore >= 1) return true;
  return maxScore >= 6 && maxScore - minScore >= 2;
}

function countSets(sets: LiveSet[]): { homeSetsWon: number; awaySetsWon: number } {
  return sets.reduce(
    (acc, set) => {
      if (!set.completed) return acc;
      if (set.home > set.away) acc.homeSetsWon += 1;
      if (set.away > set.home) acc.awaySetsWon += 1;
      return acc;
    },
    { homeSetsWon: 0, awaySetsWon: 0 },
  );
}

function resolveWinner(
  sets: LiveSet[],
  setsToWin: number,
): "home" | "away" | null {
  const { homeSetsWon, awaySetsWon } = countSets(sets);
  if (homeSetsWon >= setsToWin) return "home";
  if (awaySetsWon >= setsToWin) return "away";
  return null;
}

function buildSnapshot(matchId: string, state: MatchState, setsToWin: number): LiveMatchSnapshot {
  const { homeSetsWon, awaySetsWon } = countSets(state.sets);
  return {
    matchId,
    status: state.status,
    sets: state.sets,
    homeSetsWon,
    awaySetsWon,
    winner: resolveWinner(state.sets, setsToWin),
    updatedAt: new Date().toISOString(),
  };
}

function MatchHeader({
  courtLabel,
  matchTimeLabel,
  groupLabel,
  status,
}: MatchHeaderProps) {
  const live = status === "IN_PROGRESS";

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      alignItems={{ sm: "center" }}
      justifyContent="space-between"
    >
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography sx={{ color: "#475467", fontSize: "0.92rem", fontWeight: 700 }}>
          {courtLabel}
        </Typography>
        <Typography sx={{ color: "#98A2B3", fontSize: "0.92rem" }}>
          {matchTimeLabel}
        </Typography>
        {live ? (
          <Chip
            icon={<FiberManualRecordRoundedIcon sx={{ fontSize: 12 }} />}
            size="small"
            label="Live"
            sx={{
              bgcolor: "#FEF3F2",
              color: "#B42318",
              border: "1px solid #FECDCA",
              fontWeight: 700,
            }}
          />
        ) : null}
      </Stack>
      {groupLabel ? (
        <Chip
          size="small"
          variant="outlined"
          label={groupLabel}
          sx={{ borderColor: "#D0D5DD", color: "#344054", fontWeight: 700 }}
        />
      ) : null}
    </Stack>
  );
}

function TeamsDisplay({
  homeTeamName,
  awayTeamName,
  winner,
}: TeamsDisplayProps) {
  const cardStyles = (active: boolean) => ({
    flex: 1,
    minWidth: 0,
    p: 1.4,
    borderRadius: "18px",
    border: active ? "1px solid #B2DDFF" : "1px solid #E4E7EC",
    bgcolor: active ? "#EFF8FF" : "#F8FAFC",
    transition: "all 160ms ease",
  });

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 1.2,
      }}
    >
      <Box sx={cardStyles(winner === "home")}>
        <Typography
          sx={{
            color: "#667085",
            fontSize: "0.72rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            mb: 0.55,
          }}
        >
          Home
        </Typography>
        <Typography
          sx={{
            color: "#101828",
            fontSize: { xs: "1.18rem", md: "1.34rem" },
            fontWeight: 900,
            lineHeight: 1.08,
            wordBreak: "break-word",
          }}
        >
          {homeTeamName}
        </Typography>
      </Box>
      <Box sx={cardStyles(winner === "away")}>
        <Typography
          sx={{
            color: "#667085",
            fontSize: "0.72rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            mb: 0.55,
          }}
        >
          Away
        </Typography>
        <Typography
          sx={{
            color: "#101828",
            fontSize: { xs: "1.18rem", md: "1.34rem" },
            fontWeight: 900,
            lineHeight: 1.08,
            wordBreak: "break-word",
          }}
        >
          {awayTeamName}
        </Typography>
      </Box>
    </Box>
  );
}

function ScoreBoard({
  homeSetsWon,
  awaySetsWon,
  status,
  saveState,
}: ScoreBoardProps) {
  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : status === "IN_PROGRESS"
            ? "Live"
            : "Ready";

  return (
    <Box
      sx={{
        p: { xs: 1.8, md: 2.4 },
        borderRadius: "24px",
        background:
          status === "IN_PROGRESS"
            ? "linear-gradient(135deg, #0F172A 0%, #1D4ED8 100%)"
            : status === "COMPLETED"
              ? "linear-gradient(135deg, #0F172A 0%, #166534 100%)"
              : "linear-gradient(135deg, #111827 0%, #374151 100%)",
        color: "#FFFFFF",
        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.22)",
      }}
    >
      <Stack spacing={0.45} alignItems="center">
        <Typography
          sx={{
            fontSize: "0.78rem",
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.72)",
          }}
        >
          Match Score
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "3.5rem", md: "5rem" },
            lineHeight: 1,
            fontWeight: 900,
            letterSpacing: "-0.04em",
          }}
        >
          {homeSetsWon} - {awaySetsWon}
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.76)", fontSize: "0.92rem" }}>
          {saveLabel}
        </Typography>
      </Stack>
    </Box>
  );
}

function SetsList({ sets, activeSetIndex }: SetsListProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.25 }}>
      {sets.map((set, index) => {
        const active = index === activeSetIndex;
        return (
          <Box
            key={set.id}
            sx={{
              minWidth: 114,
              p: 1.05,
              borderRadius: "16px",
              border: active ? "1px solid #B2DDFF" : "1px solid #E4E7EC",
              bgcolor: active ? "#EFF8FF" : "#FFFFFF",
              boxShadow: active ? "0 6px 20px rgba(10, 13, 18, 0.08)" : "none",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#667085",
                fontWeight: 800,
                mb: 0.55,
              }}
            >
              Set {index + 1}
            </Typography>
            <Typography sx={{ fontSize: "1.3rem", fontWeight: 900, color: "#101828" }}>
              {set.home} - {set.away}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}

function MatchActions({
  status,
  hasWinner,
  canUndo,
  isSaving,
  homeTeamName,
  awayTeamName,
  onStart,
  onFinalize,
  onUndo,
  onAddHome,
  onAddAway,
}: MatchActionsProps) {
  const scoringDisabled = status !== "IN_PROGRESS" || isSaving;

  return (
    <Stack spacing={1}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr auto" },
          gap: 1,
        }}
      >
        <Button
          variant="contained"
          disabled={scoringDisabled}
          onClick={onAddHome}
          sx={{
            minHeight: 52,
            borderRadius: "16px",
            textTransform: "none",
            fontWeight: 800,
            bgcolor: "#111827",
          }}
        >
          Add Point {homeTeamName}
        </Button>
        <Button
          variant="contained"
          disabled={scoringDisabled}
          onClick={onAddAway}
          sx={{
            minHeight: 52,
            borderRadius: "16px",
            textTransform: "none",
            fontWeight: 800,
            bgcolor: "#1D4ED8",
          }}
        >
          Add Point {awayTeamName}
        </Button>
        <Button
          variant="outlined"
          startIcon={<UndoRoundedIcon />}
          disabled={!canUndo || isSaving}
          onClick={onUndo}
          sx={{
            minHeight: 52,
            borderRadius: "16px",
            textTransform: "none",
            fontWeight: 700,
            minWidth: 132,
          }}
        >
          Undo
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 1,
        }}
      >
        <Button
          variant="outlined"
          startIcon={<PlayArrowRoundedIcon />}
          disabled={status !== "SCHEDULED" || isSaving}
          onClick={onStart}
          sx={{
            minHeight: 48,
            borderRadius: "16px",
            textTransform: "none",
            fontWeight: 800,
          }}
        >
          Start Match
        </Button>
        <Button
          variant="contained"
          startIcon={<CheckCircleRoundedIcon />}
          disabled={!hasWinner || status !== "IN_PROGRESS" || isSaving}
          onClick={onFinalize}
          sx={{
            minHeight: 48,
            borderRadius: "16px",
            textTransform: "none",
            fontWeight: 800,
            background: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
          }}
        >
          Finalize Match
        </Button>
      </Box>
    </Stack>
  );
}

export default function LiveMatchScoringCard({
  matchId,
  courtLabel,
  matchTimeLabel,
  groupLabel,
  homeTeamName,
  awayTeamName,
  bestOf = 3,
  initialStatus = "SCHEDULED",
  initialSets,
  onPersist,
}: LiveMatchScoringCardProps) {
  const setsToWin = Math.ceil(bestOf / 2);
  const persist = React.useRef(onPersist ?? mockSaveLiveMatchState);
  const [matchState, setMatchState] = React.useState<MatchState>({
    status: initialStatus,
    sets: normalizeInitialSets(initialSets),
  });
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<MatchState[]>([]);
  const [dirtyTick, setDirtyTick] = React.useState(0);

  React.useEffect(() => {
    persist.current = onPersist ?? mockSaveLiveMatchState;
  }, [onPersist]);

  React.useEffect(() => {
    setMatchState({
      status: initialStatus,
      sets: normalizeInitialSets(initialSets),
    });
    setHistory([]);
    setSaveState("idle");
    setLastSavedAt(null);
    setDirtyTick(0);
  }, [initialSets, initialStatus, matchId]);

  const snapshot = React.useMemo(
    () => buildSnapshot(matchId, matchState, setsToWin),
    [matchId, matchState, setsToWin],
  );

  const activeSetIndex = React.useMemo(() => {
    const next = matchState.sets.findIndex((set) => !set.completed);
    return next === -1 ? Math.max(matchState.sets.length - 1, 0) : next;
  }, [matchState.sets]);

  React.useEffect(() => {
    if (dirtyTick === 0) return;

    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const result = await persist.current(snapshot);
        setLastSavedAt(result.savedAt);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 420);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dirtyTick, snapshot]);

  React.useEffect(() => {
    if (saveState !== "saved") return;
    const timer = window.setTimeout(() => setSaveState("idle"), 1200);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  const applyState = React.useCallback((nextState: MatchState) => {
    setHistory((prev) => [...prev.slice(-11), matchState]);
    setMatchState(nextState);
    setDirtyTick((prev) => prev + 1);
  }, [matchState]);

  const addPoint = React.useCallback((side: "home" | "away") => {
    if (matchState.status !== "IN_PROGRESS") return;

    const sets = matchState.sets.map((set) => ({ ...set }));
    const index = sets.findIndex((set) => !set.completed);
    const targetIndex = index === -1 ? sets.length - 1 : index;
    const target = { ...sets[targetIndex] };

    if (side === "home") target.home += 1;
    if (side === "away") target.away += 1;
    target.completed = isSetComplete(target.home, target.away);
    sets[targetIndex] = target;

    const winner = resolveWinner(sets, setsToWin);
    if (target.completed && !winner && sets.length < bestOf) {
      sets.push(makeSet(sets.length));
    }

    applyState({ ...matchState, sets });
  }, [applyState, bestOf, matchState, setsToWin]);

  const undoLastAction = React.useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const nextHistory = [...prev];
      const previous = nextHistory.pop();
      if (previous) {
        setMatchState(previous);
        setDirtyTick((tick) => tick + 1);
      }
      return nextHistory;
    });
  }, []);

  const handleStart = React.useCallback(() => {
    if (matchState.status !== "SCHEDULED") return;
    applyState({ ...matchState, status: "IN_PROGRESS" });
  }, [applyState, matchState]);

  const handleFinalize = React.useCallback(() => {
    if (matchState.status !== "IN_PROGRESS") return;
    if (!snapshot.winner) return;
    applyState({ ...matchState, status: "COMPLETED" });
  }, [applyState, matchState, snapshot.winner]);

  return (
    <Box
      sx={{
        borderRadius: "28px",
        border:
          matchState.status === "IN_PROGRESS"
            ? "1px solid #B2DDFF"
            : matchState.status === "COMPLETED"
              ? "1px solid #ABEFC6"
              : "1px solid #E4E7EC",
        background:
          matchState.status === "IN_PROGRESS"
            ? "linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"
            : "#FFFFFF",
        boxShadow:
          matchState.status === "IN_PROGRESS"
            ? "0 16px 40px rgba(29, 78, 216, 0.12)"
            : "0 10px 28px rgba(16, 24, 40, 0.08)",
        p: { xs: 1.4, md: 1.8 },
      }}
    >
      <Stack spacing={1.5}>
        <MatchHeader
          courtLabel={courtLabel}
          matchTimeLabel={matchTimeLabel}
          groupLabel={groupLabel}
          status={matchState.status}
        />

        <TeamsDisplay
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          winner={snapshot.winner}
        />

        <ScoreBoard
          homeSetsWon={snapshot.homeSetsWon}
          awaySetsWon={snapshot.awaySetsWon}
          status={matchState.status}
          saveState={saveState}
        />

        <SetsList sets={matchState.sets} activeSetIndex={activeSetIndex} />

        <MatchActions
          status={matchState.status}
          hasWinner={Boolean(snapshot.winner)}
          canUndo={history.length > 0}
          isSaving={saveState === "saving"}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          onStart={handleStart}
          onFinalize={handleFinalize}
          onUndo={undoLastAction}
          onAddHome={() => addPoint("home")}
          onAddAway={() => addPoint("away")}
        />

        <Typography sx={{ color: "#98A2B3", fontSize: "0.78rem" }}>
          {lastSavedAt
            ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "Changes save automatically."}
        </Typography>
      </Stack>
    </Box>
  );
}
