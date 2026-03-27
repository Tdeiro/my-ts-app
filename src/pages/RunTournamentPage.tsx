import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { useNavigate, useParams } from "react-router-dom";
import { getLoggedInUserId, getToken } from "../auth/tokens";
import { loadTournamentSetup } from "../Utils/tournamentPlanner";
import { parseTournamentCategoriesResponse } from "../Utils/tournamentCategoriesApi";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type RunTournamentUiState = {
  finalizedByCategory: Record<string, boolean>;
  qualifiedByCategory: Record<string, number[]>;
  knockoutByesByCategory: Record<
    string,
    Array<{
      sourceRound: string;
      advancesToRound: string;
      teamIds: number[];
      seededTeamIds: Array<{ seed: number; teamId: number }>;
    }>
  >;
};

function runTournamentUiStateKey(eventId: string) {
  return `run_tournament_ui_${eventId}`;
}

function loadRunTournamentUiState(eventId: string): RunTournamentUiState {
  try {
    const raw = localStorage.getItem(runTournamentUiStateKey(eventId));
    if (!raw) {
      return { finalizedByCategory: {}, qualifiedByCategory: {}, knockoutByesByCategory: {} };
    }
    const parsed = JSON.parse(raw);
    return {
      finalizedByCategory:
        parsed?.finalizedByCategory && typeof parsed.finalizedByCategory === "object"
          ? parsed.finalizedByCategory
          : {},
      qualifiedByCategory:
        parsed?.qualifiedByCategory && typeof parsed.qualifiedByCategory === "object"
          ? parsed.qualifiedByCategory
          : {},
      knockoutByesByCategory:
        parsed?.knockoutByesByCategory && typeof parsed.knockoutByesByCategory === "object"
          ? parsed.knockoutByesByCategory
          : {},
    };
  } catch {
    return { finalizedByCategory: {}, qualifiedByCategory: {}, knockoutByesByCategory: {} };
  }
}

function saveRunTournamentUiState(eventId: string, state: RunTournamentUiState) {
  localStorage.setItem(runTournamentUiStateKey(eventId), JSON.stringify(state));
}

function prettifyDisplayName(raw?: string): string {
  const source = String(raw ?? "").trim();
  if (!source) return "";
  if (/[a-z]/.test(source)) return source;

  return source
    .split(/([/\-\s]+)/)
    .map((part) => {
      if (!part || /^[\/\-\s]+$/.test(part)) return part;
      if (!/[A-Z]/.test(part)) return part;
      if (part.length <= 2) return part;
      return `${part[0]}${part.slice(1).toLowerCase()}`;
    })
    .join("");
}

type ApiEvent = {
  id: number | string;
  userId?: number | string;
  user_id?: number | string;
  name?: string;
  eventType?: string;
  locationName?: string;
  startDate?: string;
};

type ApiTournamentCategory = {
  id: number | string;
  name?: string;
};

type TeamMemberDto = {
  userId: number;
  userFullName?: string;
};

type TeamDto = {
  id: number;
  categoryId: number;
  name?: string;
  autoNameFromMembers?: boolean;
  members?: TeamMemberDto[];
};

type ApiTournamentGroup = {
  id?: number | string;
  name?: string;
  teamIds?: Array<number | string>;
  teams?: Array<{ id?: number | string }>;
};

type ApiMatchDto = {
  id?: number | string;
  matchId?: number | string;
  groupId?: number | string;
  group_id?: number | string;
  group?: {
    id?: number | string;
    name?: string;
  };
  round?: string;
  stage?: string;
  categoryId?: number | string;
  category?: {
    id?: number | string;
    name?: string;
  };
  homeTeamId?: number | string;
  home_team_id?: number | string;
  homeTeam?: {
    id?: number | string;
    name?: string;
  };
  awayTeamId?: number | string;
  away_team_id?: number | string;
  awayTeam?: {
    id?: number | string;
    name?: string;
  };
  matchDate?: string;
  match_date?: string;
  startTime?: string;
  start_time?: string;
  venue?: string;
  court?: string;
  field?: string;
  status?: string;
  matchStatus?: string;
  result?: {
    matchId?: number | string;
    homeScore?: number | string;
    awayScore?: number | string;
    winnerTeamId?: number | string;
    completedAt?: string;
    phases?: Array<{
      phaseId?: number | string;
      phaseType?: string;
      phaseNumber?: number | string;
      scores?: Array<{
        phaseId?: number | string;
        teamId?: number | string;
        score?: number | string;
      }>;
    }>;
    tiebreakRequired?: boolean;
    tiebreak?: {
      scores?: Array<{
        matchId?: number | string;
        teamId?: number | string;
        points?: number | string;
      }>;
    };
  };
};

type ApiMatchPhaseDto = {
  id?: number | string;
  matchId?: number | string;
  phaseType?: string;
  phaseNumber?: number | string;
};

type ApiMatchPhaseScoreDto = {
  phaseId?: number | string;
  teamId?: number | string;
  score?: number | string;
};

type ApiMatchTiebreakDto = {
  matchId?: number | string;
  teamId?: number | string;
  points?: number | string;
};

type ApiGroupStandingDto = {
  groupId?: number | string;
  teamId?: number | string;
  played?: number | string;
  wins?: number | string;
  draws?: number | string;
  losses?: number | string;
  goalsFor?: number | string;
  goalsAgainst?: number | string;
  setsWon?: number | string;
  setsLost?: number | string;
  gamesWon?: number | string;
  gamesLost?: number | string;
  points?: number | string;
};

type ApiKnockoutRoundCreateResponse = {
  categoryId?: number | string;
  round?: string;
  qualifiedTeams?: number | string;
  bracketSize?: number | string;
  byes?: number | string;
  autoAdvancedTeams?: Array<{
    seed?: number | string;
    advancesToRound?: string;
    team?: {
      id?: number | string;
      name?: string;
    };
  }>;
  createdMatches?: ApiMatchDto[];
};

type GroupDto = {
  id: string;
  name: string;
  participants: string[];
};

type RunMatch = {
  id: string;
  backendMatchId?: number;
  categoryId: string;
  groupId?: number;
  groupName?: string;
  round: string;
  homeTeamId: number;
  homeTeamName?: string;
  awayTeamId: number;
  awayTeamName?: string;
  matchDate: string;
  startTime: string;
  venue: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
  winnerTeamId?: number;
  completedAt?: string;
  resultExists?: boolean;
  phases: Array<{
    phaseId?: number;
    phaseType: string;
    phaseNumber: number;
    homeScore?: number;
    awayScore?: number;
  }>;
  tiebreakRequired: boolean;
  tiebreakScore?: {
    home?: number;
    away?: number;
  };
};

type StandingsRow = {
  teamId: number;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
};

type MatchPhaseDraft = {
  phaseId?: number;
  phaseType: string;
  phaseNumber: number;
  home: string;
  away: string;
};

type MatchTiebreakDraft = {
  home: string;
  away: string;
};

type KnockoutScheduleDraft = {
  matchDate: string;
  startTime: string;
  venue: string;
  bufferMinutes: string;
};

type KnockoutByeSummary = {
  sourceRound: string;
  advancesToRound: string;
  teamIds: number[];
  seededTeamIds: Array<{ seed: number; teamId: number }>;
};

type OperationsTab = "matches" | "standings" | "knockout";

function extractLevelFromCategoryName(name?: string): string | null {
  const normalized = String(name ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("advanced")) return "Advanced";
  if (normalized.includes("intermediate")) return "Intermediate";
  if (normalized.includes("beginner")) return "Beginner";
  if (normalized.includes("open")) return "Open";
  return null;
}

function stripLevelPrefixFromCategoryName(name: string, sectionLevel: string): string {
  const source = String(name ?? "").trim();
  if (!source) return "";

  const normalizedSection = String(sectionLevel).trim().toLowerCase();
  if (!normalizedSection || normalizedSection === "other") return source;

  const levelPattern =
    normalizedSection === "advanced"
      ? /\badvanced\b/gi
      : normalizedSection === "intermediate"
        ? /\bintermediate\b/gi
        : normalizedSection === "beginner"
          ? /\bbeginner\b/gi
          : normalizedSection === "open"
            ? /\bopen\b/gi
            : null;

  if (!levelPattern) return source;

  const withoutLevel = source
    .replace(levelPattern, "")
    .replace(/\s*[-–—:]\s*/g, " - ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*-\s*-\s*/g, " - ")
    .replace(/^\s*-\s*|\s*-\s*$/g, "")
    .trim();

  if (!withoutLevel) return source;

  const parts = withoutLevel
    .split(/\s*-\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" - ") : source;
}

function parseApiList<T = any>(body: any): T[] {
  if (Array.isArray(body)) return body as T[];
  if (Array.isArray(body?.data)) return body.data as T[];
  if (Array.isArray(body?.items)) return body.items as T[];
  if (Array.isArray(body?.results)) return body.results as T[];
  return [];
}

function toHmTime(raw?: string): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
}

function parseMinutes(raw?: string): number {
  const value = String(raw ?? "").trim();
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return Number.MAX_SAFE_INTEGER;
  return hh * 60 + mm;
}

function getTeamDisplayName(team?: TeamDto): string {
  if (!team) return "TBD";
  const explicit = String(team.name ?? "").trim();
  if (explicit) return prettifyDisplayName(explicit);
  const memberNames = (team.members ?? [])
    .map((member) => prettifyDisplayName(String(member.userFullName ?? "").trim()))
    .filter(Boolean);
  if (memberNames.length > 0) return memberNames.join(" / ");
  return `Team #${team.id}`;
}

function resolveTeamNameFromList(teams: TeamDto[], teamId: number): string {
  const team = teams.find((entry) => Number(entry.id) === Number(teamId));
  return getTeamDisplayName(team) || `Team #${teamId}`;
}

function normalizeRound(raw?: string): string {
  return String(raw ?? "GROUP").trim().toUpperCase() || "GROUP";
}

function createEmptyPhaseDraft(phaseNumber: number): MatchPhaseDraft {
  return {
    phaseType: "SET",
    phaseNumber,
    home: "",
    away: "",
  };
}

function buildPhaseDraftsFromMatch(match: RunMatch): MatchPhaseDraft[] {
  if (match.phases.length === 0) {
    return [createEmptyPhaseDraft(1)];
  }

  return match.phases
    .slice()
    .sort((a, b) => a.phaseNumber - b.phaseNumber)
    .map((phase) => ({
      phaseId: phase.phaseId,
      phaseType: phase.phaseType,
      phaseNumber: phase.phaseNumber,
      home:
        Number.isFinite(phase.homeScore) && typeof phase.homeScore === "number"
          ? String(phase.homeScore)
          : "",
      away:
        Number.isFinite(phase.awayScore) && typeof phase.awayScore === "number"
          ? String(phase.awayScore)
          : "",
    }));
}

function buildTiebreakDraftFromMatch(match: RunMatch): MatchTiebreakDraft {
  return {
    home:
      Number.isFinite(match.tiebreakScore?.home) && typeof match.tiebreakScore?.home === "number"
        ? String(match.tiebreakScore.home)
        : "",
    away:
      Number.isFinite(match.tiebreakScore?.away) && typeof match.tiebreakScore?.away === "number"
        ? String(match.tiebreakScore.away)
        : "",
  };
}

function getPhaseScoreValue(
  phase: RunMatch["phases"][number] | MatchPhaseDraft,
  side: "home" | "away",
): string | number {
  if ("home" in phase && "away" in phase) {
    return side === "home" ? phase.home || "-" : phase.away || "-";
  }
  return side === "home" ? phase.homeScore ?? "-" : phase.awayScore ?? "-";
}

const KNOCKOUT_ROUNDS = ["QUARTERFINAL", "SEMIFINAL", "FINAL"] as const;

function getRoundLabel(round: string): string {
  const normalized = normalizeRound(round);
  if (normalized === "QUARTERFINAL") return "Quarterfinal";
  if (normalized === "SEMIFINAL") return "Semifinal";
  if (normalized === "FINAL") return "Final";
  return normalized.replaceAll("_", " ");
}

function getNextKnockoutRound(round: string): string | null {
  const normalized = normalizeRound(round);
  if (normalized === "QUARTERFINAL") return "SEMIFINAL";
  if (normalized === "SEMIFINAL") return "FINAL";
  return null;
}

function getFirstKnockoutRound(qualifiedTeams: number): string | null {
  if (!Number.isInteger(qualifiedTeams) || qualifiedTeams < 2) return null;
  let bracketSize = 1;
  while (bracketSize < qualifiedTeams) {
    bracketSize <<= 1;
  }
  if (bracketSize >= 8) return "QUARTERFINAL";
  if (bracketSize >= 4) return "SEMIFINAL";
  return "FINAL";
}

function formatMinutesToTime(totalMinutes: number): string {
  const safe = Math.max(0, Math.min(24 * 60 - 1, Math.round(totalMinutes)));
  const hh = Math.floor(safe / 60);
  const mm = safe % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function toApiTime(raw?: string): string {
  const value = String(raw ?? "").trim();
  if (!value) return "00:00:00";
  return value.length === 5 ? `${value}:00` : value;
}

export default function RunTournamentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [event, setEvent] = React.useState<ApiEvent | null>(null);
  const [categories, setCategories] = React.useState<ApiTournamentCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("");
  const [operationsTab, setOperationsTab] = React.useState<OperationsTab>("matches");

  const [teamsByCategory, setTeamsByCategory] = React.useState<Record<string, TeamDto[]>>({});
  const [groupsByCategory, setGroupsByCategory] = React.useState<Record<string, GroupDto[]>>({});
  const [matchesByCategory, setMatchesByCategory] = React.useState<Record<string, RunMatch[]>>({});
  const [standingsByCategory, setStandingsByCategory] = React.useState<
    Record<string, Array<{ groupId: string; groupName: string; rows: StandingsRow[] }>>
  >({});
  const [qualifiersPerGroupByCategory, setQualifiersPerGroupByCategory] =
    React.useState<Record<string, number>>({});
  const [qualifiedByCategory, setQualifiedByCategory] = React.useState<Record<string, number[]>>({});
  const [finalizedByCategory, setFinalizedByCategory] = React.useState<Record<string, boolean>>({});
  const [knockoutByesByCategory, setKnockoutByesByCategory] = React.useState<
    Record<string, KnockoutByeSummary[]>
  >({});

  const [loadingCategoryOpsById, setLoadingCategoryOpsById] = React.useState<Record<string, boolean>>({});
  const [savingScoreByMatchId, setSavingScoreByMatchId] = React.useState<Record<string, boolean>>({});
  const [finalizingByCategory, setFinalizingByCategory] = React.useState<Record<string, boolean>>({});
  const [creatingKnockoutByCategory, setCreatingKnockoutByCategory] = React.useState<Record<string, boolean>>({});
  const [knockoutScheduleDraftByCategory, setKnockoutScheduleDraftByCategory] = React.useState<
    Record<string, KnockoutScheduleDraft>
  >({});
  const [expandedMatchById, setExpandedMatchById] = React.useState<Record<string, boolean>>({});
  const [phaseDraftsByMatchId, setPhaseDraftsByMatchId] = React.useState<
    Record<string, MatchPhaseDraft[]>
  >({});
  const [tiebreakDraftsByMatchId, setTiebreakDraftsByMatchId] = React.useState<
    Record<string, MatchTiebreakDraft>
  >({});

  const groupedCategories = React.useMemo(() => {
    const levelOrder = ["Advanced", "Intermediate", "Beginner", "Open", "Other"];
    const byLevel = new Map<string, ApiTournamentCategory[]>();

    categories.forEach((category) => {
      const level = extractLevelFromCategoryName(category.name) ?? "Other";
      const current = byLevel.get(level) ?? [];
      byLevel.set(level, [...current, category]);
    });

    return Array.from(byLevel.entries())
      .sort((a, b) => {
        const ai = levelOrder.indexOf(a[0]);
        const bi = levelOrder.indexOf(b[0]);
        const ax = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
        const bx = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
        if (ax !== bx) return ax - bx;
        return a[0].localeCompare(b[0]);
      })
      .map(([level, items]) => ({ level, items }));
  }, [categories]);

  const selectedCategory =
    categories.find((category) => String(category.id) === String(selectedCategoryId)) ?? null;

  const selectedTeams = selectedCategory ? teamsByCategory[selectedCategory.id] ?? [] : [];
  const selectedGroups = selectedCategory ? groupsByCategory[selectedCategory.id] ?? [] : [];
  const selectedMatches = React.useMemo(() => {
    if (!selectedCategory) return [] as RunMatch[];
    return [...(matchesByCategory[selectedCategory.id] ?? [])].sort((a, b) => {
      if (a.matchDate !== b.matchDate) return String(a.matchDate).localeCompare(String(b.matchDate));
      const timeDiff = parseMinutes(a.startTime) - parseMinutes(b.startTime);
      if (timeDiff !== 0) return timeDiff;
      return String(a.venue).localeCompare(String(b.venue));
    });
  }, [matchesByCategory, selectedCategory]);

  const teamNameById = React.useMemo(() => {
    const map = new Map<number, string>();
    selectedTeams.forEach((team) => {
      map.set(Number(team.id), getTeamDisplayName(team));
    });
    return map;
  }, [selectedTeams]);

  const resolveTeamName = React.useCallback(
    (teamId?: number, fallbackName?: string) => {
      const parsed = Number(teamId);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        const fallback = String(fallbackName ?? "").trim();
        return fallback || "TBD";
      }
      return teamNameById.get(parsed) ?? `Team #${parsed}`;
    },
    [teamNameById],
  );

  const currentQualifiersPerGroup = selectedCategory
    ? Math.max(1, Number(qualifiersPerGroupByCategory[selectedCategory.id] ?? 1))
    : 1;

  const groupProgressByCategory = React.useMemo(() => {
    const result: Record<string, { done: number; total: number; complete: boolean }> = {};
    categories.forEach((category) => {
      const catId = String(category.id);
      const catGroups = groupsByCategory[catId] ?? [];
      const catMatches = matchesByCategory[catId] ?? [];
      const expected = catGroups.reduce((sum, group) => {
        const n = (group.participants ?? []).filter(Boolean).length;
        return sum + (n * (n - 1)) / 2;
      }, 0);
      const completed = catMatches.filter((match) => {
        const isGroup = normalizeRound(match.round) === "GROUP_STAGE";
        const hasResult = Number.isFinite(match.homeScore) && Number.isFinite(match.awayScore);
        return isGroup && (normalizeRound(match.status) === "COMPLETED" || hasResult);
      }).length;
      result[catId] = {
        done: completed,
        total: expected,
        complete: expected > 0 && completed >= expected,
      };
    });
    return result;
  }, [categories, groupsByCategory, matchesByCategory]);

  const selectedGroupProgress = selectedCategory
    ? groupProgressByCategory[selectedCategory.id] ?? { done: 0, total: 0, complete: false }
    : { done: 0, total: 0, complete: false };

  const standingsByGroup = selectedCategory
    ? standingsByCategory[selectedCategory.id] ?? []
    : [];

  const currentQualifiedIds =
    selectedCategory != null ? qualifiedByCategory[selectedCategory.id] ?? [] : [];

  const knockoutMatches = React.useMemo(
    () =>
      selectedMatches.filter(
        (match) =>
          (!Number.isFinite(Number(match.groupId)) || Number(match.groupId) <= 0) &&
          KNOCKOUT_ROUNDS.includes(normalizeRound(match.round) as (typeof KNOCKOUT_ROUNDS)[number]),
      ),
    [selectedMatches],
  );

  const knockoutRounds = React.useMemo(() => {
    const grouped = new Map<string, RunMatch[]>();
    knockoutMatches.forEach((match) => {
      const round = normalizeRound(match.round);
      const current = grouped.get(round) ?? [];
      grouped.set(round, [...current, match]);
    });

    return KNOCKOUT_ROUNDS.filter((round) => grouped.has(round)).map((round) => ({
      round,
      label: getRoundLabel(round),
      matches: (grouped.get(round) ?? []).slice().sort((a, b) => {
        if (a.matchDate !== b.matchDate) return String(a.matchDate).localeCompare(String(b.matchDate));
        return parseMinutes(a.startTime) - parseMinutes(b.startTime);
      }),
    }));
  }, [knockoutMatches]);

  const nextKnockoutCreation = React.useMemo(() => {
    const categoryFinalized = Boolean(selectedCategory ? finalizedByCategory[selectedCategory.id] : false);
    if (!categoryFinalized || currentQualifiedIds.length < 2) {
      return { round: null, reason: "Finalize the group phase first." };
    }

    if (knockoutRounds.length === 0) {
      const firstRound = getFirstKnockoutRound(currentQualifiedIds.length);
      return {
        round: firstRound,
        reason: firstRound ? null : "Need at least two qualified teams.",
      };
    }

    const latestRound = knockoutRounds[knockoutRounds.length - 1];
    const latestRoundComplete = latestRound.matches.every(
      (match) => normalizeRound(match.status) === "COMPLETED" && Number.isFinite(Number(match.winnerTeamId)),
    );
    if (!latestRoundComplete) {
      return {
        round: null,
        reason: `Complete all ${latestRound.label.toLowerCase()} matches before creating the next round.`,
      };
    }

    const nextRound = getNextKnockoutRound(latestRound.round);
    if (!nextRound) {
      return {
        round: null,
        reason: "Knockout is already complete.",
      };
    }
    if (knockoutRounds.some((entry) => entry.round === nextRound)) {
      return {
        round: null,
        reason: `${getRoundLabel(nextRound)} matches already exist.`,
      };
    }

    return {
      round: nextRound,
      reason: null,
    };
  }, [currentQualifiedIds, finalizedByCategory, knockoutRounds, selectedCategory]);

  React.useEffect(() => {
    if (!id || !selectedCategory) return;
    const categoryId = String(selectedCategory.id);
    const draft = loadTournamentSetup(String(id));
    const categoryConfig = draft?.categoryConfigs?.[categoryId];
    const latestScheduledMinutes = selectedMatches.reduce((latest, match) => {
      const current = parseMinutes(match.startTime);
      return Number.isFinite(current) && current !== Number.MAX_SAFE_INTEGER ? Math.max(latest, current) : latest;
    }, parseMinutes(String(categoryConfig?.scheduleStartTime ?? "")));
    const defaultStartMinutes =
      latestScheduledMinutes !== Number.MAX_SAFE_INTEGER
        ? latestScheduledMinutes + Math.max(0, Number(categoryConfig?.scheduleBufferMinutes ?? 30) || 30)
        : parseMinutes(String(categoryConfig?.scheduleStartTime ?? "")) !== Number.MAX_SAFE_INTEGER
          ? parseMinutes(String(categoryConfig?.scheduleStartTime ?? ""))
          : 8 * 60;

    setKnockoutScheduleDraftByCategory((prev) => {
      if (prev[categoryId]) return prev;
      return {
        ...prev,
        [categoryId]: {
          matchDate:
            String(categoryConfig?.scheduleDate ?? "").trim() ||
            selectedMatches.find((match) => Boolean(match.matchDate))?.matchDate ||
            "",
          startTime: formatMinutesToTime(defaultStartMinutes),
          venue:
            String(categoryConfig?.scheduleVenue ?? "").trim() ||
            selectedMatches.find((match) => Boolean(match.venue))?.venue ||
            "",
          bufferMinutes: String(Math.max(0, Number(categoryConfig?.scheduleBufferMinutes ?? 30) || 30)),
        },
      };
    });
  }, [id, selectedCategory, selectedMatches]);

  const liveByVenue = React.useMemo(() => {
    const active = selectedMatches
      .filter((match) => normalizeRound(match.status) !== "COMPLETED")
      .sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime));

    const byVenue = new Map<string, RunMatch[]>();
    active.forEach((match) => {
      const venue = String(match.venue ?? "").trim() || "Venue TBD";
      const current = byVenue.get(venue) ?? [];
      byVenue.set(venue, [...current, match]);
    });

    return Array.from(byVenue.entries()).map(([venue, list]) => {
      const sorted = [...list].sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime));
      const now =
        sorted.find((item) => normalizeRound(item.status) === "IN_PROGRESS") ??
        sorted.find((item) => normalizeRound(item.status) === "SCHEDULED") ??
        null;
      const next = now ? sorted.find((item) => item.id !== now.id) ?? null : null;
      return { venue, now, next };
    });
  }, [selectedMatches]);

  const loadCategoryOperations = React.useCallback(
    async (categoryId: string) => {
      if (!id) return;
      const token = getToken();
      if (!token) return;
      const parsedCategoryId = Number(categoryId);
      if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) return;

      setLoadingCategoryOpsById((prev) => ({ ...prev, [categoryId]: true }));
      try {
        const [groupsRes, teamsRes, matchesRes] = await Promise.all([
          fetch(`${API_URL}/tournament-groups?categoryId=${encodeURIComponent(parsedCategoryId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/teams?categoryId=${encodeURIComponent(parsedCategoryId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/matches?categoryId=${encodeURIComponent(parsedCategoryId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const groupsBody = await groupsRes.json().catch(() => null);
        const teamsBody = await teamsRes.json().catch(() => null);
        const matchesBody = await matchesRes.json().catch(() => null);

        if (!groupsRes.ok) {
          throw new Error(groupsBody?.message?.[0] || groupsBody?.error || "Failed to load groups.");
        }
        if (!teamsRes.ok) {
          throw new Error(teamsBody?.message?.[0] || teamsBody?.error || "Failed to load teams.");
        }
        if (!matchesRes.ok) {
          throw new Error(matchesBody?.message?.[0] || matchesBody?.error || "Failed to load matches.");
        }

        const groupsRaw = parseApiList<ApiTournamentGroup>(groupsBody);
        const teamsRaw = parseApiList<TeamDto>(teamsBody);
        const matchesRaw = parseApiList<ApiMatchDto>(matchesBody);

        const normalizedGroups: GroupDto[] = groupsRaw.map((group, idx) => {
          const participantIds = Array.from(
            new Set(
              [
                ...(Array.isArray(group.teamIds) ? group.teamIds : []),
                ...((Array.isArray(group.teams) ? group.teams : [])
                  .map((item) => item?.id)
                  .filter((item) => item != null) as Array<number | string>),
              ]
                .map((entry) => Number(entry))
                .filter((entry) => Number.isFinite(entry) && entry > 0)
                .map((entry) => String(entry)),
            ),
          );
          return {
            id: String(group.id ?? `g_${categoryId}_${idx + 1}`),
            name: String(group.name ?? `Group ${idx + 1}`),
            participants: participantIds,
          };
        });

        const normalizedMatches = matchesRaw.reduce<RunMatch[]>((acc, item, idx) => {
          const backendMatchId = Number(item.id ?? item.matchId);
          const homeTeamId = Number(item.homeTeamId ?? item.home_team_id ?? item.homeTeam?.id);
          const awayTeamId = Number(item.awayTeamId ?? item.away_team_id ?? item.awayTeam?.id);
          if (
            !Number.isFinite(homeTeamId) ||
            homeTeamId <= 0 ||
            !Number.isFinite(awayTeamId) ||
            awayTeamId <= 0
          ) {
            return acc;
          }

          const groupId = Number(item.groupId ?? item.group_id ?? item.group?.id);
          const resultHome = Number(item.result?.homeScore);
          const resultAway = Number(item.result?.awayScore);
          const winnerTeamId = Number(item.result?.winnerTeamId);
          const phaseSummaries = Array.isArray(item.result?.phases)
            ? item.result.phases
                .map((phase) => {
                  const phaseId = Number(phase.phaseId);
                  const phaseNumber = Number(phase.phaseNumber);
                  const scores = Array.isArray(phase.scores) ? phase.scores : [];
                  const homePhaseScore = Number(
                    scores.find((score) => Number(score.teamId) === homeTeamId)?.score,
                  );
                  const awayPhaseScore = Number(
                    scores.find((score) => Number(score.teamId) === awayTeamId)?.score,
                  );
                  return {
                    phaseId: Number.isFinite(phaseId) && phaseId > 0 ? phaseId : undefined,
                    phaseType: String(phase.phaseType ?? "SET").trim() || "SET",
                    phaseNumber:
                      Number.isFinite(phaseNumber) && phaseNumber > 0
                        ? phaseNumber
                        : 1,
                    homeScore:
                      Number.isFinite(homePhaseScore) ? homePhaseScore : undefined,
                    awayScore:
                      Number.isFinite(awayPhaseScore) ? awayPhaseScore : undefined,
                  };
                })
                .sort((a, b) => a.phaseNumber - b.phaseNumber)
            : [];
          const tiebreakScores = Array.isArray(item.result?.tiebreak?.scores)
            ? item.result.tiebreak.scores
            : [];
          const homeTiebreakScore = Number(
            tiebreakScores.find((score) => Number(score.teamId) === homeTeamId)?.points,
          );
          const awayTiebreakScore = Number(
            tiebreakScores.find((score) => Number(score.teamId) === awayTeamId)?.points,
          );

          acc.push({
            id: `m_${categoryId}_${Number.isFinite(backendMatchId) ? backendMatchId : idx + 1}`,
            backendMatchId: Number.isFinite(backendMatchId) && backendMatchId > 0 ? backendMatchId : undefined,
            categoryId,
            groupId: Number.isFinite(groupId) && groupId > 0 ? groupId : undefined,
            groupName: String(item.group?.name ?? "").trim() || undefined,
            round: normalizeRound(item.round ?? item.stage ?? "GROUP_STAGE"),
            homeTeamId,
            homeTeamName: String(item.homeTeam?.name ?? "").trim() || undefined,
            awayTeamId,
            awayTeamName: String(item.awayTeam?.name ?? "").trim() || undefined,
            matchDate: String(item.matchDate ?? item.match_date ?? ""),
            startTime: toHmTime(item.startTime ?? item.start_time),
            venue: String(item.venue ?? item.court ?? item.field ?? "").trim(),
            status: normalizeRound(item.status ?? item.matchStatus ?? "SCHEDULED"),
            homeScore: Number.isFinite(resultHome) ? resultHome : undefined,
            awayScore: Number.isFinite(resultAway) ? resultAway : undefined,
            winnerTeamId:
              Number.isFinite(winnerTeamId) && winnerTeamId > 0 ? winnerTeamId : undefined,
            completedAt: String(item.result?.completedAt ?? ""),
            resultExists:
              (Number.isFinite(resultHome) && Number.isFinite(resultAway)) ||
              Boolean(item.result),
            phases: phaseSummaries,
            tiebreakRequired: Boolean(item.result?.tiebreakRequired),
            tiebreakScore:
              Number.isFinite(homeTiebreakScore) || Number.isFinite(awayTiebreakScore)
                ? {
                    home: Number.isFinite(homeTiebreakScore) ? homeTiebreakScore : undefined,
                    away: Number.isFinite(awayTiebreakScore) ? awayTiebreakScore : undefined,
                  }
                : undefined,
          });
          return acc;
        }, []);

        const standingsForGroups = await Promise.all(
          normalizedGroups.map(async (group) => {
            const groupId = Number(group.id);
            const rowsMap = new Map<number, StandingsRow>();
            group.participants.forEach((entry) => {
              const teamId = Number(entry);
              if (!Number.isFinite(teamId) || teamId <= 0) return;
              rowsMap.set(teamId, {
                teamId,
                teamName: resolveTeamNameFromList(teamsRaw, teamId),
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                setsWon: 0,
                setsLost: 0,
                gamesWon: 0,
                gamesLost: 0,
                points: 0,
              });
            });

            if (Number.isFinite(groupId) && groupId > 0) {
              const standingsRes = await fetch(`${API_URL}/groups/${groupId}/tennis/standings`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const standingsBody = await standingsRes.json().catch(() => null);
              if (standingsRes.ok) {
                const standingsRaw = parseApiList<ApiGroupStandingDto>(standingsBody);
                standingsRaw.forEach((row) => {
                  const teamId = Number(row.teamId);
                  if (!Number.isFinite(teamId) || teamId <= 0) return;
                  rowsMap.set(teamId, {
                    teamId,
                    teamName: resolveTeamNameFromList(teamsRaw, teamId),
                    played: Number(row.played) || 0,
                    wins: Number(row.wins) || 0,
                    draws: Number(row.draws) || 0,
                    losses: Number(row.losses) || 0,
                    setsWon: Number(row.setsWon) || 0,
                    setsLost: Number(row.setsLost) || 0,
                    gamesWon: Number(row.gamesWon) || 0,
                    gamesLost: Number(row.gamesLost) || 0,
                    points: Number(row.points) || 0,
                  });
                });
              }
            }

            const rows = Array.from(rowsMap.values()).sort((a, b) => {
              if (b.points !== a.points) return b.points - a.points;
              const setDiffA = a.setsWon - a.setsLost;
              const setDiffB = b.setsWon - b.setsLost;
              if (setDiffB !== setDiffA) return setDiffB - setDiffA;
              const gameDiffA = a.gamesWon - a.gamesLost;
              const gameDiffB = b.gamesWon - b.gamesLost;
              if (gameDiffB !== gameDiffA) return gameDiffB - gameDiffA;
              return a.teamName.localeCompare(b.teamName);
            });

            return {
              groupId: String(group.id),
              groupName: group.name,
              rows,
            };
          }),
        );

        const completedGroupMatches = normalizedMatches.filter(
          (match) =>
            Number.isFinite(Number(match.groupId)) &&
            Number(match.groupId) > 0 &&
            normalizeRound(match.status) === "COMPLETED",
        );
        const totalGroupMatches = normalizedMatches.filter(
          (match) => Number.isFinite(Number(match.groupId)) && Number(match.groupId) > 0,
        ).length;
        const categoryQualifiersPerGroup = Math.max(
          1,
          Number(qualifiersPerGroupByCategory[categoryId] ?? 1),
        );
        const derivedQualifiedIds =
          totalGroupMatches > 0 && completedGroupMatches.length === totalGroupMatches
            ? standingsForGroups.flatMap((group) =>
                group.rows
                  .slice(0, categoryQualifiersPerGroup)
                  .map((row) => row.teamId)
                  .filter((teamId) => Number.isFinite(teamId) && teamId > 0),
              )
            : [];
        const derivedFinalized =
          totalGroupMatches > 0 &&
          completedGroupMatches.length === totalGroupMatches &&
          derivedQualifiedIds.length > 0;

        setGroupsByCategory((prev) => ({ ...prev, [categoryId]: normalizedGroups }));
        setTeamsByCategory((prev) => ({ ...prev, [categoryId]: teamsRaw }));
        setMatchesByCategory((prev) => ({ ...prev, [categoryId]: normalizedMatches }));
        setStandingsByCategory((prev) => ({ ...prev, [categoryId]: standingsForGroups }));
        setQualifiedByCategory((prev) => ({ ...prev, [categoryId]: derivedQualifiedIds }));
        setFinalizedByCategory((prev) => ({ ...prev, [categoryId]: derivedFinalized }));
        setPhaseDraftsByMatchId((prev) => {
          const next = { ...prev };
          normalizedMatches.forEach((match) => {
            next[match.id] = buildPhaseDraftsFromMatch(match);
          });
          return next;
        });
        setTiebreakDraftsByMatchId((prev) => {
          const next = { ...prev };
          normalizedMatches.forEach((match) => {
            next[match.id] = buildTiebreakDraftFromMatch(match);
          });
          return next;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load category operations.");
      } finally {
        setLoadingCategoryOpsById((prev) => ({ ...prev, [categoryId]: false }));
      }
    },
    [id, qualifiersPerGroupByCategory],
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
        const [eventsRes, categoriesRes] = await Promise.all([
          fetch(`${API_URL}/events`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/tournament-categories?eventId=${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const eventsBody = await eventsRes.json().catch(() => null);
        const categoriesBody = await categoriesRes.json().catch(() => null);

        if (!eventsRes.ok) {
          throw new Error(
            eventsBody?.message?.[0] ||
              eventsBody?.error ||
              `Failed to load tournament (${eventsRes.status})`,
          );
        }
        if (!categoriesRes.ok) {
          throw new Error(
            categoriesBody?.message?.[0] ||
              categoriesBody?.error ||
              `Failed to load categories (${categoriesRes.status})`,
          );
        }

        const rawEvents: ApiEvent[] = parseApiList<ApiEvent>(eventsBody);
        const hasOwnerField = rawEvents.some(
          (item) => item.userId != null || item.user_id != null,
        );
        const visibleEvents = hasOwnerField
          ? rawEvents.filter((item) => Number(item.userId ?? item.user_id) === userId)
          : rawEvents;
        const selectedEvent =
          visibleEvents.find(
            (item) =>
              String(item.id) === String(id) &&
              String(item.eventType ?? "").toUpperCase() === "TOURNAMENT",
          ) ?? null;

        if (!selectedEvent) {
          throw new Error("Tournament not found or you do not have access.");
        }

        const loadedCategories: ApiTournamentCategory[] =
          parseTournamentCategoriesResponse(categoriesBody);
        const draft = loadTournamentSetup(String(id));
        const persistedRunUiState = loadRunTournamentUiState(String(id));
        const qualifiersMap: Record<string, number> = {};
        (loadedCategories ?? []).forEach((cat) => {
          const cfg = draft?.categoryConfigs?.[String(cat.id)];
          qualifiersMap[String(cat.id)] = Math.max(1, Number(cfg?.qualifiedPerGroup ?? 1));
        });

        if (cancelled) return;
        setEvent(selectedEvent);
        setCategories(loadedCategories);
        setQualifiersPerGroupByCategory(qualifiersMap);
        setFinalizedByCategory(persistedRunUiState.finalizedByCategory);
        setQualifiedByCategory(persistedRunUiState.qualifiedByCategory);
        setKnockoutByesByCategory(persistedRunUiState.knockoutByesByCategory);
        if (loadedCategories.length > 0) {
          setSelectedCategoryId(String(loadedCategories[0].id));
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load run tournament page.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  React.useEffect(() => {
    if (!selectedCategoryId) return;
    void loadCategoryOperations(selectedCategoryId);
  }, [selectedCategoryId, loadCategoryOperations]);

  React.useEffect(() => {
    if (!id) return;
    saveRunTournamentUiState(String(id), {
      finalizedByCategory,
      qualifiedByCategory,
      knockoutByesByCategory,
    });
  }, [finalizedByCategory, id, knockoutByesByCategory, qualifiedByCategory]);

  const loadMatchScoring = React.useCallback(
    async (match: RunMatch) => {
      const matchId = Number(match.backendMatchId);
      if (!Number.isFinite(matchId) || matchId <= 0) return;

      const token = getToken();
      if (!token) {
        setError("Invalid session. Please sign in again.");
        return;
      }

      try {
        const phasesRes = await fetch(`${API_URL}/matches/${matchId}/phases`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const phasesBody = await phasesRes.json().catch(() => null);
        if (!phasesRes.ok) {
          throw new Error(phasesBody?.message?.[0] || phasesBody?.error || "Failed to load match phases.");
        }

        const phasesRaw = parseApiList<ApiMatchPhaseDto>(phasesBody)
          .map((phase) => ({
            phaseId: Number(phase.id),
            phaseType: String(phase.phaseType ?? "SET").trim() || "SET",
            phaseNumber: Number(phase.phaseNumber) || 1,
          }))
          .filter((phase) => Number.isFinite(phase.phaseId) && Number.isFinite(phase.phaseId) && phase.phaseNumber > 0)
          .sort((a, b) => a.phaseNumber - b.phaseNumber);

        const phaseDrafts = await Promise.all(
          phasesRaw.map(async (phase) => {
            const scoresRes = await fetch(`${API_URL}/match-phases/${phase.phaseId}/scores`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const scoresBody = await scoresRes.json().catch(() => null);
            if (!scoresRes.ok) {
              throw new Error(scoresBody?.message?.[0] || scoresBody?.error || "Failed to load phase scores.");
            }
            const scoresRaw = parseApiList<ApiMatchPhaseScoreDto>(scoresBody);
            const homeScore = Number(
              scoresRaw.find((entry) => Number(entry.teamId) === Number(match.homeTeamId))?.score,
            );
            const awayScore = Number(
              scoresRaw.find((entry) => Number(entry.teamId) === Number(match.awayTeamId))?.score,
            );
            return {
              phaseId: Number(phase.phaseId),
              phaseType: phase.phaseType,
              phaseNumber: phase.phaseNumber,
              home: Number.isFinite(homeScore) ? String(homeScore) : "",
              away: Number.isFinite(awayScore) ? String(awayScore) : "",
            };
          }),
        );

        const tiebreakRes = await fetch(`${API_URL}/matches/${matchId}/tiebreak`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        let tiebreakDraft: MatchTiebreakDraft = { home: "", away: "" };
        if (tiebreakRes.ok) {
          const tiebreakBody = await tiebreakRes.json().catch(() => null);
          const tiebreakRaw = parseApiList<ApiMatchTiebreakDto>(tiebreakBody);
          const homePoints = Number(
            tiebreakRaw.find((entry) => Number(entry.teamId) === Number(match.homeTeamId))?.points,
          );
          const awayPoints = Number(
            tiebreakRaw.find((entry) => Number(entry.teamId) === Number(match.awayTeamId))?.points,
          );
          tiebreakDraft = {
            home: Number.isFinite(homePoints) ? String(homePoints) : "",
            away: Number.isFinite(awayPoints) ? String(awayPoints) : "",
          };
        }

        setPhaseDraftsByMatchId((prev) => ({
          ...prev,
          [match.id]: phaseDrafts.length > 0 ? phaseDrafts : [createEmptyPhaseDraft(1)],
        }));
        setTiebreakDraftsByMatchId((prev) => ({ ...prev, [match.id]: tiebreakDraft }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load match scoring.");
      }
    },
    [],
  );

  const toggleMatchScoring = React.useCallback(
    async (match: RunMatch) => {
      const nextExpanded = !expandedMatchById[match.id];
      setExpandedMatchById((prev) => ({ ...prev, [match.id]: nextExpanded }));
      if (nextExpanded) {
        await loadMatchScoring(match);
      }
    },
    [expandedMatchById, loadMatchScoring],
  );

  const saveMatchScoring = React.useCallback(
    async (match: RunMatch) => {
      const token = getToken();
      const matchId = Number(match.backendMatchId);
      if (!token || !Number.isFinite(matchId) || matchId <= 0) {
        setError("Invalid session or match.");
        return;
      }

      const phaseDrafts = phaseDraftsByMatchId[match.id] ?? [createEmptyPhaseDraft(1)];
      const tiebreakDraft = tiebreakDraftsByMatchId[match.id] ?? { home: "", away: "" };

      if (phaseDrafts.length === 0) {
        setError("Add at least one set before saving scores.");
        return;
      }

      for (const phase of phaseDrafts) {
        const homeRaw = phase.home.trim();
        const awayRaw = phase.away.trim();
        if (!homeRaw || !awayRaw) {
          setError(`Enter both scores for Set ${phase.phaseNumber}.`);
          return;
        }
        const homeScore = Number(homeRaw);
        const awayScore = Number(awayRaw);
        if (!Number.isFinite(homeScore) || homeScore < 0 || !Number.isFinite(awayScore) || awayScore < 0) {
          setError(`Set ${phase.phaseNumber} scores must be non-negative numbers.`);
          return;
        }
      }

      if ((tiebreakDraft.home.trim() && !tiebreakDraft.away.trim()) || (!tiebreakDraft.home.trim() && tiebreakDraft.away.trim())) {
        setError("Enter both tie-break scores or leave both blank.");
        return;
      }

      setSavingScoreByMatchId((prev) => ({ ...prev, [match.id]: true }));
      setError(null);

      try {
        const persistedPhases: MatchPhaseDraft[] = [];
        for (const phase of phaseDrafts.slice().sort((a, b) => a.phaseNumber - b.phaseNumber)) {
          let phaseId = Number(phase.phaseId);
          if (!Number.isFinite(phaseId) || phaseId <= 0) {
            const createRes = await fetch(`${API_URL}/matches/${matchId}/phases`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                phaseType: phase.phaseType,
                phaseNumber: phase.phaseNumber,
              }),
            });
            const createBody = await createRes.json().catch(() => null);
            if (!createRes.ok) {
              throw new Error(createBody?.message?.[0] || createBody?.error || "Failed to create match phase.");
            }
            phaseId = Number(createBody?.id ?? createBody?.data?.id);
          }

          const scoresRes = await fetch(`${API_URL}/match-phases/${phaseId}/scores`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              scores: [
                { teamId: Number(match.homeTeamId), score: Number(phase.home) },
                { teamId: Number(match.awayTeamId), score: Number(phase.away) },
              ],
            }),
          });
          const scoresBody = await scoresRes.json().catch(() => null);
          if (!scoresRes.ok) {
            throw new Error(scoresBody?.message?.[0] || scoresBody?.error || "Failed to save set scores.");
          }

          persistedPhases.push({ ...phase, phaseId });
        }

        if (tiebreakDraft.home.trim() && tiebreakDraft.away.trim()) {
          const tiebreakRes = await fetch(`${API_URL}/matches/${matchId}/tiebreak`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              scores: [
                { teamId: Number(match.homeTeamId), points: Number(tiebreakDraft.home) },
                { teamId: Number(match.awayTeamId), points: Number(tiebreakDraft.away) },
              ],
            }),
          });
          const tiebreakBody = await tiebreakRes.json().catch(() => null);
          if (!tiebreakRes.ok) {
            throw new Error(tiebreakBody?.message?.[0] || tiebreakBody?.error || "Failed to save tie-break.");
          }
        } else if (match.tiebreakScore?.home != null || match.tiebreakScore?.away != null) {
          await fetch(`${API_URL}/matches/${matchId}/tiebreak`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        }

        const recalcRes = await fetch(`${API_URL}/matches/${matchId}/tennis/result/recalculate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const recalcBody = await recalcRes.json().catch(() => null);
        if (!recalcRes.ok) {
          throw new Error(recalcBody?.message?.[0] || recalcBody?.error || "Failed to recalculate match result.");
        }

        setPhaseDraftsByMatchId((prev) => ({ ...prev, [match.id]: persistedPhases }));

        if (Number.isFinite(Number(match.groupId)) && Number(match.groupId) > 0) {
          await fetch(`${API_URL}/groups/${Number(match.groupId)}/tennis/standings/recalculate`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        }

        await loadCategoryOperations(selectedCategoryId);
        setStatusMessage("Set scores saved and match result recalculated.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save match scoring.");
      } finally {
        setSavingScoreByMatchId((prev) => ({ ...prev, [match.id]: false }));
      }
    },
    [loadCategoryOperations, phaseDraftsByMatchId, selectedCategoryId, tiebreakDraftsByMatchId],
  );

  const finalizeGroupPhase = React.useCallback(async () => {
    if (!selectedCategory) return;
    if (!selectedGroupProgress.complete) {
      setError("Complete all group matches before finalizing.");
      return;
    }

    setError(null);
    setFinalizingByCategory((prev) => ({ ...prev, [selectedCategory.id]: true }));
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Invalid session. Please sign in again.");
      }

      const recalculatedStandings: Array<{ groupId: string; groupName: string; rows: StandingsRow[] }> = [];
      for (const group of selectedGroups) {
        const groupId = Number(group.id);
        if (!Number.isFinite(groupId) || groupId <= 0) continue;
        const recalcRes = await fetch(`${API_URL}/groups/${groupId}/tennis/standings/recalculate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const recalcBody = await recalcRes.json().catch(() => null);
        if (!recalcRes.ok) {
          throw new Error(
            recalcBody?.message?.[0] || recalcBody?.error || "Failed to recalculate standings.",
          );
        }

        const standingsRes = await fetch(`${API_URL}/groups/${groupId}/tennis/standings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const standingsBody = await standingsRes.json().catch(() => null);
        if (!standingsRes.ok) {
          throw new Error(
            standingsBody?.message?.[0] || standingsBody?.error || "Failed to load recalculated standings.",
          );
        }

        const rows = parseApiList<ApiGroupStandingDto>(standingsBody)
          .map((row) => {
            const teamId = Number(row.teamId);
            return {
              teamId,
              teamName: resolveTeamNameFromList(selectedTeams, teamId),
              played: Number(row.played) || 0,
              wins: Number(row.wins) || 0,
              draws: Number(row.draws) || 0,
              losses: Number(row.losses) || 0,
              setsWon: Number(row.setsWon) || 0,
              setsLost: Number(row.setsLost) || 0,
              gamesWon: Number(row.gamesWon) || 0,
              gamesLost: Number(row.gamesLost) || 0,
              points: Number(row.points) || 0,
            };
          })
          .filter((row) => Number.isFinite(row.teamId) && row.teamId > 0);
        recalculatedStandings.push({
          groupId: String(group.id),
          groupName: group.name,
          rows,
        });
      }

      if (recalculatedStandings.length > 0 && recalculatedStandings.every((group) => group.rows.length === 0)) {
        throw new Error("Standings recalculation returned no rows. Group phase was not finalized.");
      }

      await loadCategoryOperations(String(selectedCategory.id));

      const qualified: number[] = [];
      recalculatedStandings.forEach((group) => {
        group.rows.slice(0, currentQualifiersPerGroup).forEach((row) => {
          qualified.push(row.teamId);
        });
      });

      if (selectedGroups.length > 0 && qualified.length === 0) {
        throw new Error("No qualified teams were produced from the recalculated standings.");
      }

      setStandingsByCategory((prev) => ({ ...prev, [String(selectedCategory.id)]: recalculatedStandings }));
      setQualifiedByCategory((prev) => ({ ...prev, [selectedCategory.id]: qualified }));
      setFinalizedByCategory((prev) => ({ ...prev, [selectedCategory.id]: true }));
      setKnockoutByesByCategory((prev) => ({ ...prev, [selectedCategory.id]: [] }));
      setOperationsTab("knockout");
      setStatusMessage("Group phase finalized. Qualified teams are ready for knockout.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finalize group phase.");
    } finally {
      setFinalizingByCategory((prev) => ({ ...prev, [selectedCategory.id]: false }));
    }
  }, [
    currentQualifiersPerGroup,
    loadCategoryOperations,
    selectedCategory,
    selectedGroupProgress.complete,
    selectedGroups,
    selectedTeams,
  ]);

  const createNextKnockoutRound = React.useCallback(async () => {
    if (!id || !selectedCategory || !nextKnockoutCreation.round) {
      if (nextKnockoutCreation.reason) {
        setError(nextKnockoutCreation.reason);
      }
      return;
    }

    const token = getToken();
    if (!token) {
      setError("Invalid session. Please sign in again.");
      return;
    }

    const categoryId = String(selectedCategory.id);
    const scheduleDraft = knockoutScheduleDraftByCategory[categoryId];
    const fallbackDate = String(scheduleDraft?.matchDate ?? "").trim();
    const fallbackVenue = String(scheduleDraft?.venue ?? "").trim();
    const startBase = parseMinutes(String(scheduleDraft?.startTime ?? ""));
    const bufferMinutes = Math.max(0, Number(scheduleDraft?.bufferMinutes ?? 30) || 30);

    if (!fallbackDate || !fallbackVenue || startBase === Number.MAX_SAFE_INTEGER) {
      setError("Provide knockout match date, start time, and court/field before creating the round.");
      return;
    }

    setError(null);
    setCreatingKnockoutByCategory((prev) => ({ ...prev, [String(selectedCategory.id)]: true }));
    try {
      const res = await fetch(
        `${API_URL}/tournament-categories/${encodeURIComponent(String(selectedCategory.id))}/knockout/next-round`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            matchDate: fallbackDate,
            startTime: toApiTime(formatMinutesToTime(startBase)),
            venue: fallbackVenue,
            bufferMinutes,
          }),
        },
      );
      const body: ApiKnockoutRoundCreateResponse | null = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (Array.isArray((body as any)?.message) ? (body as any).message[0] : undefined) ||
            (body as any)?.error ||
            "Failed to create knockout matches.",
        );
      }

      const autoAdvanced = parseApiList(body?.autoAdvancedTeams).map((entry) => ({
        seed: Number(entry.seed),
        teamId: Number(entry.team?.id),
        advancesToRound: normalizeRound(entry.advancesToRound),
      })).filter((entry) => Number.isFinite(entry.seed) && Number.isFinite(entry.teamId) && entry.teamId > 0);

      setKnockoutByesByCategory((prev) => {
        const current = prev[categoryId] ?? [];
        const nextEntry: KnockoutByeSummary = {
          sourceRound: normalizeRound(body?.round),
          advancesToRound:
            autoAdvanced[0]?.advancesToRound ||
            getNextKnockoutRound(normalizeRound(body?.round)) ||
            "FINAL",
          teamIds: autoAdvanced.map((entry) => entry.teamId),
          seededTeamIds: autoAdvanced.map((entry) => ({ seed: entry.seed, teamId: entry.teamId })),
        };

        const filtered = current.filter(
          (entry) =>
            !(
              normalizeRound(entry.sourceRound) === normalizeRound(nextEntry.sourceRound) &&
              normalizeRound(entry.advancesToRound) === normalizeRound(nextEntry.advancesToRound)
            ),
        );

        return {
          ...prev,
          [categoryId]:
            nextEntry.teamIds.length > 0 ? [...filtered, nextEntry] : filtered,
        };
      });

      await loadCategoryOperations(String(selectedCategory.id));
      setStatusMessage(
        autoAdvanced.length > 0
          ? `${getRoundLabel(body?.round ?? nextKnockoutCreation.round)} created. ${autoAdvanced.length} team${autoAdvanced.length === 1 ? "" : "s"} advanced by bye.`
          : `${getRoundLabel(body?.round ?? nextKnockoutCreation.round)} matches created.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create knockout matches.");
    } finally {
      setCreatingKnockoutByCategory((prev) => ({ ...prev, [String(selectedCategory.id)]: false }));
    }
  }, [id, knockoutScheduleDraftByCategory, loadCategoryOperations, nextKnockoutCreation, selectedCategory]);

  const selectedCategoryLoading = Boolean(loadingCategoryOpsById[selectedCategoryId]);
  const selectedCategoryFinalized = Boolean(
    selectedCategory ? finalizedByCategory[selectedCategory.id] : false,
  );
  const selectedKnockoutScheduleDraft =
    selectedCategory != null ? knockoutScheduleDraftByCategory[String(selectedCategory.id)] : undefined;
  const activeKnockoutByes =
    selectedCategory != null
      ? (knockoutByesByCategory[String(selectedCategory.id)] ?? []).filter(
          (entry) =>
            entry.teamIds.length > 0 &&
            !knockoutRounds.some((roundEntry) => roundEntry.round === normalizeRound(entry.advancesToRound)),
        )
      : [];

  const renderMatchCard = (match: RunMatch) => {
    const phaseDrafts = phaseDraftsByMatchId[match.id] ?? buildPhaseDraftsFromMatch(match);
    const tiebreakDraft = tiebreakDraftsByMatchId[match.id] ?? buildTiebreakDraftFromMatch(match);
    const savingScores = Boolean(savingScoreByMatchId[match.id]);
    const expanded = Boolean(expandedMatchById[match.id]);
    const isCompleted = normalizeRound(match.status) === "COMPLETED";
    const statusLabel =
      normalizeRound(match.status) === "IN_PROGRESS"
        ? "Live"
        : isCompleted
          ? "Completed"
          : "Scheduled";
    const hasScore =
      Number.isFinite(Number(match.homeScore)) &&
      Number.isFinite(Number(match.awayScore));
    const winnerLabel = Number.isFinite(Number(match.winnerTeamId))
      ? resolveTeamName(match.winnerTeamId)
      : null;
    const knockoutRoundLabel =
      !Number.isFinite(Number(match.groupId)) &&
      KNOCKOUT_ROUNDS.includes(normalizeRound(match.round) as (typeof KNOCKOUT_ROUNDS)[number])
        ? getRoundLabel(match.round)
        : null;

    return (
      <Box
        key={match.id}
        sx={{
          p: { xs: 1.05, md: 1.15 },
          borderRadius: "16px",
          border:
            normalizeRound(match.status) === "IN_PROGRESS"
              ? "1px solid rgba(239, 68, 68, 0.28)"
              : "1px solid #E5E7EB",
          background: "#FFFFFF",
          boxShadow:
            normalizeRound(match.status) === "IN_PROGRESS"
              ? "0 6px 18px rgba(239, 68, 68, 0.08)"
              : "0 1px 3px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Stack spacing={0.75}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={0.35}
            alignItems={{ md: "center" }}
            justifyContent="space-between"
          >
            <Typography
              sx={{
                color: "#4B5563",
                fontSize: "0.84rem",
                fontWeight: 500,
                lineHeight: 1.25,
              }}
            >
              {match.venue || "Venue TBD"} • {match.matchDate || "Date TBD"} •{" "}
              {match.startTime || "Time TBD"}
            </Typography>
            <Stack direction="row" spacing={0.55}>
              {match.groupId ? (
                <Chip
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 26,
                    borderColor: "#D1D5DB",
                    bgcolor: "#FFFFFF",
                    fontWeight: 700,
                    color: "#1F2937",
                    borderRadius: "999px",
                  }}
                  label={
                    match.groupName ||
                    selectedGroups.find((group) => String(group.id) === String(match.groupId))
                      ?.name ||
                    `Group ${match.groupId}`
                  }
                />
              ) : null}
              {knockoutRoundLabel ? (
                <Chip
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 26,
                    borderColor: "#C7D7FE",
                    bgcolor: "#EEF4FF",
                    color: "#1D4ED8",
                    fontWeight: 700,
                    borderRadius: "999px",
                  }}
                  label={knockoutRoundLabel}
                />
              ) : null}
              {normalizeRound(match.status) === "IN_PROGRESS" ? (
                <Chip
                  size="small"
                  sx={{
                    height: 26,
                    bgcolor: "#FEE2E2",
                    color: "#B91C1C",
                    fontWeight: 700,
                    borderRadius: "999px",
                  }}
                  label="Live"
                />
              ) : isCompleted ? (
                <Chip
                  size="small"
                  sx={{
                    height: 26,
                    bgcolor: "#DCFCE7",
                    color: "#15803D",
                    fontWeight: 700,
                    borderRadius: "999px",
                  }}
                  label="Completed"
                />
              ) : (
                <Chip
                  size="small"
                  sx={{
                    height: 26,
                    bgcolor: "#DBEAFE",
                    color: "#1D4ED8",
                    fontWeight: 700,
                    borderRadius: "999px",
                  }}
                  label="Scheduled"
                />
              )}
            </Stack>
          </Stack>

          <Stack spacing={0.05}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "56px minmax(0, 1fr) auto", md: "70px minmax(0, 1fr) auto" },
                gap: 0.75,
                alignItems: "center",
                py: 0.4,
                borderBottom: "1px solid #F3F4F6",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  color: "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                Home
              </Typography>
              <Typography
                sx={{
                  fontWeight: 800,
                  color: "#101828",
                  fontSize: { xs: "0.98rem", md: "1.03rem" },
                  lineHeight: 1.15,
                  letterSpacing: "-0.015em",
                  whiteSpace: { md: "nowrap" },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {resolveTeamName(match.homeTeamId, match.homeTeamName)}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: "0.92rem", md: "0.98rem" },
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#111827",
                  minWidth: 54,
                  textAlign: "right",
                  px: 0.65,
                  py: 0.45,
                  borderRadius: "8px",
                  bgcolor: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                }}
              >
                {hasScore ? `${match.homeScore} - ${match.awayScore}` : "0 - 0"}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "56px minmax(0, 1fr) auto", md: "70px minmax(0, 1fr) auto" },
                gap: 0.75,
                alignItems: "center",
                py: 0.4,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  color: "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                Away
              </Typography>
              <Typography
                sx={{
                  fontWeight: 800,
                  color: "#101828",
                  fontSize: { xs: "0.98rem", md: "1.03rem" },
                  lineHeight: 1.15,
                  letterSpacing: "-0.015em",
                  whiteSpace: { md: "nowrap" },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {resolveTeamName(match.awayTeamId, match.awayTeamName)}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: "0.92rem", md: "0.98rem" },
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#111827",
                  minWidth: 54,
                  textAlign: "right",
                  px: 0.65,
                  py: 0.45,
                  borderRadius: "8px",
                  bgcolor: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  visibility: "hidden",
                }}
              >
                {hasScore ? `${match.homeScore} - ${match.awayScore}` : "0 - 0"}
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 200px" },
              gap: 0.7,
              alignItems: "stretch",
            }}
          >
            <Stack
              spacing={0.8}
              sx={{
                p: 0.8,
                borderRadius: "10px",
                bgcolor: isCompleted ? "#F0FDF4" : "#F9FAFB",
                border: isCompleted ? "1px solid #BBF7D0" : "1px solid #F3F4F6",
              }}
            >
              <Stack direction="row" spacing={0.55} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label={statusLabel}
                  sx={{
                    height: 21,
                    fontWeight: 700,
                    borderRadius: "999px",
                    bgcolor: isCompleted
                      ? "#DCFCE7"
                      : normalizeRound(match.status) === "IN_PROGRESS"
                        ? "#FEE2E2"
                        : "#DBEAFE",
                    color: isCompleted
                      ? "#15803D"
                      : normalizeRound(match.status) === "IN_PROGRESS"
                        ? "#B91C1C"
                        : "#1D4ED8",
                  }}
                />
                {(match.phases.length > 0 ? match.phases : phaseDrafts)
                  .slice()
                  .sort((a, b) => a.phaseNumber - b.phaseNumber)
                  .map((phase) => (
                    <Chip
                      key={`${match.id}-set-${phase.phaseId ?? phase.phaseNumber}`}
                      size="small"
                      variant="outlined"
                      label={`Set ${phase.phaseNumber}: ${getPhaseScoreValue(phase, "home")}-${getPhaseScoreValue(phase, "away")}`}
                      sx={{
                        height: 21,
                        bgcolor: "#FFFFFF",
                        fontWeight: 700,
                        borderColor: "#E5E7EB",
                        borderRadius: "999px",
                      }}
                    />
                  ))}
                {match.tiebreakRequired || tiebreakDraft.home || tiebreakDraft.away ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`Tie-break: ${tiebreakDraft.home || match.tiebreakScore?.home || "-"}-${tiebreakDraft.away || match.tiebreakScore?.away || "-"}`}
                    sx={{
                      height: 21,
                      bgcolor: "#FFFFFF",
                      fontWeight: 700,
                      borderColor: "#E5E7EB",
                      borderRadius: "999px",
                    }}
                  />
                ) : null}
              </Stack>
              <Typography sx={{ color: "#344054", fontSize: "0.86rem", fontWeight: 700, lineHeight: 1.3 }}>
                {hasScore
                  ? winnerLabel
                    ? `Result: ${match.homeScore} - ${match.awayScore}. Winner: ${winnerLabel}.`
                    : `Result: ${match.homeScore} - ${match.awayScore}.`
                  : "No result recorded yet."}
              </Typography>
              <Typography sx={{ color: "#6B7280", fontSize: "0.78rem", lineHeight: 1.35 }}>
                {expanded
                  ? "Enter one row per set, then save scores to recalculate the tennis result."
                  : "Open scoring to enter set results and complete the match through backend tennis scoring."}
              </Typography>
            </Stack>

            <Stack spacing={0.8} sx={{ minWidth: 0, justifyContent: "center" }}>
              <Button
                variant={expanded ? "contained" : "outlined"}
                size="small"
                startIcon={<SaveRoundedIcon />}
                disabled={savingScores}
                onClick={() => {
                  void toggleMatchScoring(match);
                }}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  minHeight: 40,
                  fontWeight: 800,
                  boxShadow: expanded ? "0 1px 3px rgba(124, 58, 237, 0.18)" : "none",
                  px: 1.35,
                }}
              >
                {expanded ? "Hide Scoring" : "Open Scoring"}
              </Button>
            </Stack>
          </Box>

          {expanded ? (
            <Stack
              spacing={0.9}
              sx={{
                p: 0.95,
                borderRadius: "12px",
                border: "1px solid #E5E7EB",
                background: "#FFFFFF",
              }}
            >
              {phaseDrafts.map((phase, phaseIndex) => (
                <Box
                  key={`${match.id}-draft-phase-${phase.phaseId ?? phase.phaseNumber}`}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "88px minmax(0, 1fr) 20px minmax(0, 1fr)" },
                    gap: 0.75,
                    alignItems: "center",
                    p: 0.65,
                    borderRadius: "10px",
                    bgcolor: "#F9FAFB",
                    border: "1px solid #F3F4F6",
                  }}
                >
                  <Typography sx={{ fontWeight: 800, color: "#1F2937", letterSpacing: "-0.02em" }}>
                    Set {phase.phaseNumber}
                  </Typography>
                  <TextField
                    size="small"
                    label={resolveTeamName(match.homeTeamId, match.homeTeamName)}
                    type="number"
                    value={phase.home}
                    onChange={(e) =>
                      setPhaseDraftsByMatchId((prev) => ({
                        ...prev,
                        [match.id]: (prev[match.id] ?? phaseDrafts).map((entry, idx) =>
                          idx === phaseIndex ? { ...entry, home: e.target.value } : entry,
                        ),
                      }))
                    }
                    inputProps={{ min: 0 }}
                    sx={{ "& .MuiInputBase-root": { height: 38 }, minWidth: 0 }}
                  />
                  <Typography sx={{ color: "#6B7280", textAlign: "center", fontWeight: 700 }}>
                    -
                  </Typography>
                  <TextField
                    size="small"
                    label={resolveTeamName(match.awayTeamId, match.awayTeamName)}
                    type="number"
                    value={phase.away}
                    onChange={(e) =>
                      setPhaseDraftsByMatchId((prev) => ({
                        ...prev,
                        [match.id]: (prev[match.id] ?? phaseDrafts).map((entry, idx) =>
                          idx === phaseIndex ? { ...entry, away: e.target.value } : entry,
                        ),
                      }))
                    }
                    inputProps={{ min: 0 }}
                    sx={{ "& .MuiInputBase-root": { height: 38 }, minWidth: 0 }}
                  />
                </Box>
              ))}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={0.75}>
                <Button
                  variant="text"
                  size="small"
                  onClick={() =>
                    setPhaseDraftsByMatchId((prev) => ({
                      ...prev,
                      [match.id]: [
                        ...(prev[match.id] ?? phaseDrafts),
                        createEmptyPhaseDraft((prev[match.id] ?? phaseDrafts).length + 1),
                      ],
                    }))
                  }
                  sx={{ alignSelf: "flex-start", textTransform: "none", minHeight: 34, px: 0.5 }}
                >
                  Add Set
                </Button>
                {match.tiebreakRequired ? (
                  <Alert severity="warning" sx={{ py: 0 }}>
                    Sets are tied. Enter match tie-break points before saving again.
                  </Alert>
                ) : null}
              </Stack>

              {(match.tiebreakRequired || tiebreakDraft.home || tiebreakDraft.away) ? (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "88px minmax(0, 1fr) 20px minmax(0, 1fr)" },
                    gap: 0.75,
                    alignItems: "center",
                    p: 0.65,
                    borderRadius: "10px",
                    bgcolor: "#F9FAFB",
                    border: "1px solid #F3F4F6",
                  }}
                >
                  <Typography sx={{ fontWeight: 800, color: "#1F2937" }}>
                    Match Tie-break
                  </Typography>
                  <TextField
                    size="small"
                    label={resolveTeamName(match.homeTeamId, match.homeTeamName)}
                    type="number"
                    value={tiebreakDraft.home}
                    onChange={(e) =>
                      setTiebreakDraftsByMatchId((prev) => ({
                        ...prev,
                        [match.id]: { ...(prev[match.id] ?? tiebreakDraft), home: e.target.value },
                      }))
                    }
                    inputProps={{ min: 0 }}
                    sx={{ "& .MuiInputBase-root": { height: 38 }, minWidth: 0 }}
                  />
                  <Typography sx={{ color: "#6B7280", textAlign: "center", fontWeight: 700 }}>
                    -
                  </Typography>
                  <TextField
                    size="small"
                    label={resolveTeamName(match.awayTeamId, match.awayTeamName)}
                    type="number"
                    value={tiebreakDraft.away}
                    onChange={(e) =>
                      setTiebreakDraftsByMatchId((prev) => ({
                        ...prev,
                        [match.id]: { ...(prev[match.id] ?? tiebreakDraft), away: e.target.value },
                      }))
                    }
                    inputProps={{ min: 0 }}
                    sx={{ "& .MuiInputBase-root": { height: 38 }, minWidth: 0 }}
                  />
                </Box>
              ) : null}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={0.75} justifyContent="flex-end" alignItems="center">
                <Button
                  variant="contained"
                  size="small"
                  disabled={savingScores}
                  onClick={() => {
                    void saveMatchScoring(match);
                  }}
                  sx={{ borderRadius: "12px", textTransform: "none", minHeight: 40, fontWeight: 800, px: 1.5 }}
                >
                  {savingScores ? "Saving Scores..." : "Save Scores"}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={savingScores}
                  onClick={() =>
                    setExpandedMatchById((prev) => ({ ...prev, [match.id]: false }))
                  }
                  sx={{ borderRadius: "12px", textTransform: "none", minHeight: 40, fontWeight: 700, px: 1.5 }}
                >
                  Close
                </Button>
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      </Box>
    );
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
      <Box sx={{ width: "100%", maxWidth: 1240 }}>
        <Box
          sx={{
            mb: 2,
            p: 3,
            borderRadius: "14px",
            background: "linear-gradient(135deg, #E17100 0%, #F54900 100%)",
            boxShadow: "0 10px 15px rgba(225, 113, 0, 0.2)",
          }}
        >
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={3}
            justifyContent="space-between"
            alignItems={{ lg: "center" }}
          >
            <Stack direction="row" spacing={2} sx={{ flex: 1 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "14px",
                  bgcolor: "rgba(255, 255, 255, 0.2)",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <EmojiEventsRoundedIcon sx={{ fontSize: 32, color: "#FFFFFF" }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography
                    sx={{
                      fontSize: "1.875rem",
                      fontWeight: 700,
                      color: "#FFFFFF",
                      lineHeight: 1.2,
                    }}
                  >
                    {event?.name || "Run Tournament"}
                  </Typography>
                  <Chip
                    label="LIVE CONTROL"
                    sx={{
                      bgcolor: "rgba(255, 255, 255, 0.2)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      color: "#FFFFFF",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      height: 26,
                      borderRadius: "999px",
                    }}
                  />
                </Stack>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ color: "#FFF7ED" }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LocationOnOutlinedIcon sx={{ fontSize: 16, color: "#FFF7ED" }} />
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#FFF7ED" }}>
                      {event?.locationName || "Location TBD"}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarMonthOutlinedIcon sx={{ fontSize: 16, color: "#FFF7ED" }} />
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#FFF7ED" }}>
                      {event?.startDate
                        ? new Date(event.startDate).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Date TBD"}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            </Stack>

            <Stack spacing={1} alignItems={{ xs: "stretch", lg: "flex-end" }}>
              <Button
                variant="contained"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => navigate(`/tournaments/${id}/setup`)}
                sx={{
                  borderRadius: "10px",
                  textTransform: "none",
                  bgcolor: "rgba(255, 255, 255, 0.18)",
                  color: "#FFFFFF",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  boxShadow: "none",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.24)",
                    boxShadow: "none",
                  },
                }}
              >
                Back to Setup
              </Button>
              <Button
                variant="contained"
                startIcon={<PlayArrowRoundedIcon />}
                sx={{
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 700,
                  bgcolor: "#FFFFFF",
                  color: "#B1400D",
                  "&:hover": { bgcolor: "#FFF7ED" },
                }}
              >
                Tournament Day
              </Button>
            </Stack>
          </Stack>
        </Box>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {statusMessage ? <Alert severity="success" sx={{ mb: 2 }}>{statusMessage}</Alert> : null}

        {loading ? (
          <Card>
            <CardContent sx={{ py: 6, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={28} />
            </CardContent>
          </Card>
        ) : (
          <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="stretch">
            <Card sx={{ width: { xs: "100%", lg: 360 }, flexShrink: 0 }}>
              <CardContent sx={{ p: 2.25 }}>
                <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Categories</Typography>
                <Divider sx={{ mb: 1.5 }} />
                {categories.length === 0 ? (
                  <Alert severity="info">No categories found for this tournament.</Alert>
                ) : (
                  <Stack spacing={1.25}>
                    {groupedCategories.map((section) => (
                      <Box key={`level-${section.level}`}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            color: "#6A7282",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                            mb: 0.75,
                          }}
                        >
                          {section.level}
                        </Typography>
                        <Stack spacing={1}>
                          {section.items.map((category) => {
                            const categoryId = String(category.id);
                            const selected = selectedCategoryId === categoryId;
                            const progress = groupProgressByCategory[categoryId] ?? {
                              done: 0,
                              total: 0,
                              complete: false,
                            };
                            const finalized = Boolean(finalizedByCategory[categoryId]);
                            return (
                              <Box
                                key={categoryId}
                                onClick={() => {
                                  setStatusMessage(null);
                                  setSelectedCategoryId(categoryId);
                                }}
                                sx={{
                                  p: 1.25,
                                  borderRadius: "12px",
                                  border: selected ? "2px solid #8B5CF6" : "1px solid #E5E7EB",
                                  bgcolor: selected ? "#F5F3FF" : "#FFFFFF",
                                  cursor: "pointer",
                                }}
                              >
                                <Typography sx={{ fontWeight: 700, color: "#101828", mb: 0.5 }}>
                                  {stripLevelPrefixFromCategoryName(
                                    String(category.name ?? `Category #${categoryId}`),
                                    section.level,
                                  )}
                                </Typography>
                                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                                  <Chip
                                    size="small"
                                    label={
                                      finalized
                                        ? "Finalized"
                                        : progress.complete
                                          ? "Ready to Finalize"
                                          : "Running"
                                    }
                                    color={finalized || progress.complete ? "success" : "default"}
                                  />
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`${progress.done}/${progress.total || 0} group matches`}
                                  />
                                </Stack>
                              </Box>
                            );
                          })}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            <Stack sx={{ flex: 1 }} spacing={2}>
              <Card>
                <CardContent sx={{ p: 2.25 }}>
                  {!selectedCategory ? (
                    <Alert severity="info">Select a category to run operations.</Alert>
                  ) : selectedCategoryLoading ? (
                    <Box sx={{ py: 5, display: "flex", justifyContent: "center" }}>
                      <CircularProgress size={26} />
                    </Box>
                  ) : (
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1.25}
                        alignItems={{ md: "center" }}
                        justifyContent="space-between"
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 800, color: "#101828", fontSize: "1.2rem" }}>
                            {selectedCategory.name}
                          </Typography>
                          <Typography sx={{ color: "#667085", fontSize: "0.9rem" }}>
                            Group phase progress: {selectedGroupProgress.done}/{selectedGroupProgress.total || 0}
                          </Typography>
                        </Box>
                        <Tooltip
                          title={
                            selectedGroupProgress.complete
                              ? ""
                              : "Complete all group matches before finalizing."
                          }
                          disableHoverListener={selectedGroupProgress.complete}
                        >
                          <span>
                            <Button
                              variant="contained"
                              startIcon={<CheckCircleRoundedIcon />}
                              disabled={
                                !selectedGroupProgress.complete ||
                                selectedCategoryFinalized ||
                                Boolean(finalizingByCategory[selectedCategory.id])
                              }
                              onClick={() => void finalizeGroupPhase()}
                              sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700 }}
                            >
                              {finalizingByCategory[selectedCategory.id]
                                ? "Finalizing..."
                                : selectedCategoryFinalized
                                  ? "Group Phase Finalized"
                                  : "Finalize Group Phase"}
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>

                      <Tabs
                        value={operationsTab}
                        onChange={(_, value) => setOperationsTab(value)}
                        sx={{ borderBottom: "1px solid #E5E7EB" }}
                      >
                        <Tab value="matches" label="Matches" />
                        <Tab value="standings" label="Standings" />
                        <Tab value="knockout" label="Knockout" />
                      </Tabs>

                      {operationsTab === "matches" ? (
                        selectedMatches.length === 0 ? (
                          <Alert severity="info">
                            No matches found for this category. Go back to Setup and create schedule.
                          </Alert>
                        ) : (
                          <Stack spacing={1.25}>
                            <Alert severity="info">
                              Record tennis results by set. Save set scores to recalculate the match result and refresh standings.
                            </Alert>
                            {knockoutMatches.length > 0 ? (
                              <Alert severity="info">
                                Knockout matches are scored here too. Look for the round badges like Quarterfinal, Semifinal, and Final on the match cards below.
                              </Alert>
                            ) : null}
                            <Box
                              sx={{
                                maxHeight: { xs: 520, md: 620 },
                                overflowY: "auto",
                                pr: 0.5,
                              }}
                            >
                              <Stack spacing={1.25}>
                              {selectedMatches.map((match) => renderMatchCard(match))}
                              </Stack>
                            </Box>
                          </Stack>
                        )
                      ) : null}

                      {operationsTab === "standings" ? (
                        standingsByGroup.length === 0 ? (
                          <Alert severity="info">No groups found for this category.</Alert>
                        ) : (
                          <Stack spacing={1.5}>
                            {standingsByGroup.map((group) => (
                              <Box key={group.groupId} sx={{ border: "1px solid #E5E7EB", borderRadius: "12px" }}>
                                <Box sx={{ px: 1.25, py: 1, bgcolor: "#F8FAFC", borderBottom: "1px solid #E5E7EB" }}>
                                  <Typography sx={{ fontWeight: 700 }}>{group.groupName}</Typography>
                                </Box>
                                <Box sx={{ overflowX: "auto" }}>
                                  <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
                                    <Box component="thead">
                                      <Box component="tr" sx={{ bgcolor: "#F9FAFB" }}>
                                        {[
                                          "#",
                                          "Team",
                                          "P",
                                          "W",
                                          "D",
                                          "L",
                                          "Sets +",
                                          "Sets -",
                                          "Games +",
                                          "Games -",
                                          "Pts",
                                        ].map((col) => (
                                          <Box
                                            component="th"
                                            key={col}
                                            sx={{
                                              p: 0.75,
                                              fontSize: "0.78rem",
                                              textAlign: col === "Team" ? "left" : "center",
                                              borderBottom: "1px solid #E5E7EB",
                                              color: "#475467",
                                            }}
                                          >
                                            {col}
                                          </Box>
                                        ))}
                                      </Box>
                                    </Box>
                                    <Box component="tbody">
                                      {group.rows.map((row, idx) => {
                                        const isQualified = selectedCategoryFinalized &&
                                          currentQualifiedIds.includes(row.teamId);
                                        return (
                                          <Box
                                            component="tr"
                                            key={`${group.groupId}-${row.teamId}`}
                                            sx={{
                                              bgcolor: isQualified ? "#ECFDF3" : "#FFFFFF",
                                            }}
                                          >
                                            <Box component="td" sx={{ p: 0.75, textAlign: "center" }}>{idx + 1}</Box>
                                            <Box component="td" sx={{ p: 0.75 }}>{row.teamName}</Box>
                                            <Box component="td" sx={{ p: 0.75, textAlign: "center" }}>{row.played}</Box>
                                            <Box component="td" sx={{ p: 0.75, textAlign: "center" }}>{row.wins}</Box>
                                            <Box component="td" sx={{ p: 0.75, textAlign: "center" }}>{row.draws}</Box>
                                            <Box component="td" sx={{ p: 0.75, textAlign: "center" }}>{row.losses}</Box>
                                            <Box component="td" sx={{ p: 0.75, textAlign: "center" }}>{row.setsWon}</Box>
                                            <Box component="td" sx={{ p: 0.75, textAlign: "center" }}>{row.setsLost}</Box>
                                            <Box component="td" sx={{ p: 0.75, textAlign: "center" }}>{row.gamesWon}</Box>
                                            <Box component="td" sx={{ p: 0.75, textAlign: "center" }}>{row.gamesLost}</Box>
                                            <Box component="td" sx={{ p: 0.75, textAlign: "center", fontWeight: 700 }}>
                                              {row.points}
                                            </Box>
                                          </Box>
                                        );
                                      })}
                                    </Box>
                                  </Box>
                                </Box>
                              </Box>
                            ))}
                          </Stack>
                        )
                      ) : null}

                      {operationsTab === "knockout" ? (
                        !selectedCategoryFinalized ? (
                          <Alert severity="info">
                            Finalize the group phase to lock qualified teams and unlock knockout.
                          </Alert>
                        ) : currentQualifiedIds.length === 0 ? (
                          <Alert severity="warning">No qualified teams were computed yet.</Alert>
                        ) : (
                          <Stack spacing={1.5}>
                            <Box
                              sx={{
                                p: 1.25,
                                borderRadius: "12px",
                                border: "1px solid #D1FADF",
                                bgcolor: "#ECFDF3",
                              }}
                            >
                              <Typography sx={{ fontWeight: 700, color: "#027A48", mb: 0.5 }}>
                                Qualified Teams
                              </Typography>
                              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                {currentQualifiedIds.map((teamId, index) => (
                                  <Chip
                                    key={`q-${teamId}`}
                                    color="success"
                                    label={`Seed ${index + 1} · ${resolveTeamName(teamId)}`}
                                  />
                                ))}
                              </Stack>
                              <Typography sx={{ color: "#027A48", fontSize: "0.8rem", mt: 0.75 }}>
                                Seeds are ordered from overall group-phase ranking. Backend byes use these seeds.
                              </Typography>
                            </Box>

                            <Box sx={{ p: 1.25, borderRadius: "12px", border: "1px solid #E5E7EB" }}>
                              <Stack
                                direction={{ xs: "column", md: "row" }}
                                spacing={1}
                                alignItems={{ md: "center" }}
                                justifyContent="space-between"
                                sx={{ mb: 1 }}
                              >
                                <Box>
                                  <Typography sx={{ fontWeight: 700 }}>Knockout Progression</Typography>
                                  <Typography sx={{ color: "#667085", fontSize: "0.86rem" }}>
                                    Quarterfinals, semifinals, and final are created as real backend matches, one round at a time.
                                  </Typography>
                                </Box>
                                <Button
                                  variant="contained"
                                  disabled={
                                    !nextKnockoutCreation.round ||
                                    Boolean(creatingKnockoutByCategory[String(selectedCategory.id)])
                                  }
                                  onClick={() => void createNextKnockoutRound()}
                                  sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 800 }}
                                >
                                  {creatingKnockoutByCategory[String(selectedCategory.id)]
                                    ? "Creating..."
                                    : nextKnockoutCreation.round
                                      ? `Create ${getRoundLabel(nextKnockoutCreation.round)}`
                                      : "Next Round Unavailable"}
                                </Button>
                              </Stack>

                              <Alert severity={nextKnockoutCreation.round ? "info" : "warning"} sx={{ mb: 1 }}>
                                {nextKnockoutCreation.round
                                  ? `${getRoundLabel(nextKnockoutCreation.round)} will be created by backend seeding and bye rules using the schedule you set below.`
                                  : nextKnockoutCreation.reason || "No knockout round can be created yet."}
                              </Alert>

                              <Typography sx={{ color: "#667085", fontSize: "0.84rem", mb: 1 }}>
                                Created knockout matches appear below and can be scored directly in this tab. When every match in the current round is completed, the next round becomes available here. If byes apply, the backend will advance the top seeds automatically.
                              </Typography>

                              {activeKnockoutByes.length > 0 ? (
                                <Stack spacing={0.75} sx={{ mb: 1.25 }}>
                                  {activeKnockoutByes.map((entry) => (
                                    <Alert
                                      key={`${entry.sourceRound}-${entry.advancesToRound}-${entry.teamIds.join("-")}`}
                                      severity="success"
                                    >
                                      {entry.seededTeamIds
                                        .slice()
                                        .sort((a, b) => a.seed - b.seed)
                                        .map(({ seed, teamId }) => `Seed ${seed} ${resolveTeamName(teamId)}`)
                                        .join(", ")}{" "}
                                      {entry.teamIds.length === 1 ? "has" : "have"} advanced directly to{" "}
                                      {getRoundLabel(entry.advancesToRound).toLowerCase()} by bye.
                                    </Alert>
                                  ))}
                                </Stack>
                              ) : null}

                              {nextKnockoutCreation.round ? (
                                <Stack spacing={0.75} sx={{ mb: knockoutRounds.length > 0 ? 1.25 : 0 }}>
                                  <Typography sx={{ fontWeight: 700, color: "#101828" }}>
                                    Ready to Create {getRoundLabel(nextKnockoutCreation.round)}
                                  </Typography>
                                  <Box
                                    sx={{
                                      p: 1,
                                      borderRadius: "10px",
                                      border: "1px solid #E5E7EB",
                                      bgcolor: "#F9FAFB",
                                    }}
                                  >
                                    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                                      <TextField
                                        label="Match date"
                                        type="date"
                                        fullWidth
                                        value={selectedKnockoutScheduleDraft?.matchDate ?? ""}
                                        onChange={(e) =>
                                          selectedCategory
                                            ? setKnockoutScheduleDraftByCategory((prev) => ({
                                                ...prev,
                                                [String(selectedCategory.id)]: {
                                                  ...(prev[String(selectedCategory.id)] ?? {
                                                    matchDate: "",
                                                    startTime: "",
                                                    venue: "",
                                                    bufferMinutes: "30",
                                                  }),
                                                  matchDate: e.target.value,
                                                },
                                              }))
                                            : undefined
                                        }
                                        InputLabelProps={{ shrink: true }}
                                      />
                                      <TextField
                                        label="Start time"
                                        type="time"
                                        fullWidth
                                        value={selectedKnockoutScheduleDraft?.startTime ?? ""}
                                        onChange={(e) =>
                                          selectedCategory
                                            ? setKnockoutScheduleDraftByCategory((prev) => ({
                                                ...prev,
                                                [String(selectedCategory.id)]: {
                                                  ...(prev[String(selectedCategory.id)] ?? {
                                                    matchDate: "",
                                                    startTime: "",
                                                    venue: "",
                                                    bufferMinutes: "30",
                                                  }),
                                                  startTime: e.target.value,
                                                },
                                              }))
                                            : undefined
                                        }
                                        InputLabelProps={{ shrink: true }}
                                      />
                                      <TextField
                                        label="Court / Field"
                                        fullWidth
                                        value={selectedKnockoutScheduleDraft?.venue ?? ""}
                                        onChange={(e) =>
                                          selectedCategory
                                            ? setKnockoutScheduleDraftByCategory((prev) => ({
                                                ...prev,
                                                [String(selectedCategory.id)]: {
                                                  ...(prev[String(selectedCategory.id)] ?? {
                                                    matchDate: "",
                                                    startTime: "",
                                                    venue: "",
                                                    bufferMinutes: "30",
                                                  }),
                                                  venue: e.target.value,
                                                },
                                              }))
                                            : undefined
                                        }
                                      />
                                      <TextField
                                        label="Buffer (min)"
                                        type="number"
                                        fullWidth
                                        value={selectedKnockoutScheduleDraft?.bufferMinutes ?? "30"}
                                        onChange={(e) =>
                                          selectedCategory
                                            ? setKnockoutScheduleDraftByCategory((prev) => ({
                                                ...prev,
                                                [String(selectedCategory.id)]: {
                                                  ...(prev[String(selectedCategory.id)] ?? {
                                                    matchDate: "",
                                                    startTime: "",
                                                    venue: "",
                                                    bufferMinutes: "30",
                                                  }),
                                                  bufferMinutes: e.target.value,
                                                },
                                              }))
                                            : undefined
                                        }
                                        inputProps={{ min: 0 }}
                                      />
                                    </Stack>
                                  </Box>
                                  <Typography sx={{ color: "#667085", fontSize: "0.84rem" }}>
                                    Pairings and any bye advances are decided by the backend from qualified-team seeding, then the created matches appear below in this tab.
                                  </Typography>
                                </Stack>
                              ) : null}

                              {knockoutRounds.length === 0 ? (
                                <Typography sx={{ color: "#667085" }}>
                                  No knockout matches have been created for this category yet. Use the action above to create the next valid round.
                                </Typography>
                              ) : (
                                <Stack spacing={1}>
                                  {knockoutRounds.map((roundEntry) => (
                                    <Box key={roundEntry.round} sx={{ borderTop: "1px solid #F2F4F7", pt: 1 }}>
                                      <Typography sx={{ fontWeight: 700, mb: 0.75 }}>{roundEntry.label}</Typography>
                                      <Stack spacing={0.75}>
                                        {roundEntry.matches.map((match) => renderMatchCard(match))}
                                      </Stack>
                                    </Box>
                                  ))}
                                </Stack>
                              )}
                            </Box>
                          </Stack>
                        )
                      ) : null}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ p: 2.25 }}>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>Now / Next by Venue</Typography>
                  <Divider sx={{ mb: 1.5 }} />
                  {liveByVenue.length === 0 ? (
                    <Typography sx={{ color: "#667085" }}>
                      No active scheduled matches for this category.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {liveByVenue.map((entry) => (
                        <Box
                          key={entry.venue}
                          sx={{ p: 1.1, border: "1px solid #E5E7EB", borderRadius: "10px" }}
                        >
                          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{entry.venue}</Typography>
                          <Typography sx={{ fontSize: "0.87rem", color: "#101828" }}>
                            Now: {entry.now
                              ? `${resolveTeamName(entry.now.homeTeamId, entry.now.homeTeamName)} vs ${resolveTeamName(entry.now.awayTeamId, entry.now.awayTeamName)} (${entry.now.startTime || "TBD"})`
                              : "No match"}
                          </Typography>
                          <Typography sx={{ fontSize: "0.83rem", color: "#667085" }}>
                            Next: {entry.next
                              ? `${resolveTeamName(entry.next.homeTeamId, entry.next.homeTeamName)} vs ${resolveTeamName(entry.next.awayTeamId, entry.next.awayTeamName)} (${entry.next.startTime || "TBD"})`
                              : "No upcoming match"}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
