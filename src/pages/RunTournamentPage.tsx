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

  const [loadingCategoryOpsById, setLoadingCategoryOpsById] = React.useState<Record<string, boolean>>({});
  const [savingScoreByMatchId, setSavingScoreByMatchId] = React.useState<Record<string, boolean>>({});
  const [finalizingByCategory, setFinalizingByCategory] = React.useState<Record<string, boolean>>({});
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

  const knockoutPreviewPairs = React.useMemo(() => {
    const ids = [...currentQualifiedIds];
    if (ids.length < 2) return [] as Array<{ home: number; away: number }>;
    const pairs: Array<{ home: number; away: number }> = [];
    let left = 0;
    let right = ids.length - 1;
    while (left < right) {
      pairs.push({ home: ids[left], away: ids[right] });
      left += 1;
      right -= 1;
    }
    return pairs;
  }, [currentQualifiedIds]);

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

        setGroupsByCategory((prev) => ({ ...prev, [categoryId]: normalizedGroups }));
        setTeamsByCategory((prev) => ({ ...prev, [categoryId]: teamsRaw }));
        setMatchesByCategory((prev) => ({ ...prev, [categoryId]: normalizedMatches }));
        setStandingsByCategory((prev) => ({ ...prev, [categoryId]: standingsForGroups }));
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
    [id],
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
        const qualifiersMap: Record<string, number> = {};
        (loadedCategories ?? []).forEach((cat) => {
          const cfg = draft?.categoryConfigs?.[String(cat.id)];
          qualifiersMap[String(cat.id)] = Math.max(1, Number(cfg?.qualifiedPerGroup ?? 1));
        });

        if (cancelled) return;
        setEvent(selectedEvent);
        setCategories(loadedCategories);
        setQualifiersPerGroupByCategory(qualifiersMap);
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
        const standingsRes = await fetch(`${API_URL}/groups/${groupId}/tennis/standings/recalculate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const standingsBody = await standingsRes.json().catch(() => null);
        if (!standingsRes.ok) {
          throw new Error(
            standingsBody?.message?.[0] || standingsBody?.error || "Failed to recalculate standings.",
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

      await loadCategoryOperations(String(selectedCategory.id));

      const qualified: number[] = [];
      recalculatedStandings.forEach((group) => {
        group.rows.slice(0, currentQualifiersPerGroup).forEach((row) => {
          qualified.push(row.teamId);
        });
      });

      setStandingsByCategory((prev) => ({ ...prev, [String(selectedCategory.id)]: recalculatedStandings }));
      setQualifiedByCategory((prev) => ({ ...prev, [selectedCategory.id]: qualified }));
      setFinalizedByCategory((prev) => ({ ...prev, [selectedCategory.id]: true }));
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

  const selectedCategoryLoading = Boolean(loadingCategoryOpsById[selectedCategoryId]);
  const selectedCategoryFinalized = Boolean(
    selectedCategory ? finalizedByCategory[selectedCategory.id] : false,
  );

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
                            <Box
                              sx={{
                                maxHeight: { xs: 520, md: 620 },
                                overflowY: "auto",
                                pr: 0.5,
                              }}
                            >
                              <Stack spacing={1.25}>
                              {selectedMatches.map((match) => {
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
                              return (
                                <Box
                                  key={match.id}
                                  sx={{
                                    p: { xs: 1.35, md: 1.6 },
                                    borderRadius: "28px",
                                    border: isCompleted
                                      ? "1px solid rgba(74, 222, 128, 0.34)"
                                      : expanded
                                        ? "1px solid rgba(168, 85, 247, 0.24)"
                                        : "1px solid rgba(148, 163, 184, 0.18)",
                                    background: isCompleted
                                      ? "linear-gradient(180deg, rgba(236, 253, 243, 0.96) 0%, #FFFFFF 100%)"
                                      : expanded
                                        ? "linear-gradient(180deg, rgba(255, 247, 237, 0.96) 0%, rgba(250, 245, 255, 0.96) 100%)"
                                        : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
                                    boxShadow: expanded
                                      ? "0 24px 48px rgba(249, 115, 22, 0.12)"
                                      : "0 16px 36px rgba(15, 23, 42, 0.07)",
                                    position: "relative",
                                    overflow: "hidden",
                                    "&::before": {
                                      content: '""',
                                      position: "absolute",
                                      inset: 0,
                                      background: expanded
                                        ? "radial-gradient(circle at top right, rgba(249, 115, 22, 0.12), transparent 32%), radial-gradient(circle at bottom left, rgba(168, 85, 247, 0.10), transparent 36%)"
                                        : "radial-gradient(circle at top right, rgba(168, 85, 247, 0.08), transparent 30%)",
                                      pointerEvents: "none",
                                    },
                                  }}
                                >
                                  <Stack spacing={1.35} sx={{ position: "relative", zIndex: 1 }}>
                                    <Stack
                                      direction={{ xs: "column", md: "row" }}
                                      spacing={0.8}
                                      alignItems={{ md: "center" }}
                                      justifyContent="space-between"
                                    >
                                      <Typography
                                        sx={{
                                          color: "#667085",
                                          fontSize: { xs: "0.98rem", md: "1.02rem" },
                                          fontWeight: 600,
                                          letterSpacing: "-0.01em",
                                        }}
                                      >
                                        {match.venue || "Venue TBD"} • {match.matchDate || "Date TBD"} •{" "}
                                        {match.startTime || "Time TBD"}
                                      </Typography>
                                      <Stack direction="row" spacing={0.75}>
                                        {match.groupId ? (
                                          <Chip
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                              borderColor: "rgba(99, 102, 241, 0.2)",
                                              bgcolor: "rgba(255,255,255,0.78)",
                                              fontWeight: 700,
                                              color: "#1F2937",
                                            }}
                                            label={
                                              match.groupName ||
                                              selectedGroups.find((group) => String(group.id) === String(match.groupId))
                                                ?.name ||
                                              `Group ${match.groupId}`
                                            }
                                          />
                                        ) : null}
                                        {isCompleted ? (
                                          <Chip
                                            size="small"
                                            color="success"
                                            sx={{ fontWeight: 700 }}
                                            label="Completed"
                                          />
                                        ) : null}
                                      </Stack>
                                    </Stack>

                                    <Box
                                      sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 112px minmax(0, 1fr)" },
                                        gap: 1.1,
                                        alignItems: "stretch",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          p: 1.4,
                                          borderRadius: "22px",
                                          border: "1px solid rgba(249, 115, 22, 0.12)",
                                          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,250,244,0.92) 100%)",
                                          minHeight: 102,
                                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            fontSize: "0.75rem",
                                            color: "#9A3412",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.12em",
                                            fontWeight: 800,
                                            mb: 0.55,
                                          }}
                                        >
                                          Home
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontWeight: 800,
                                            color: "#101828",
                                            fontSize: { xs: "1.1rem", md: "1.24rem" },
                                            lineHeight: 1.18,
                                            wordBreak: "break-word",
                                            letterSpacing: "-0.03em",
                                          }}
                                        >
                                          {resolveTeamName(match.homeTeamId, match.homeTeamName)}
                                        </Typography>
                                      </Box>
                                      <Stack
                                        spacing={0.6}
                                        alignItems="center"
                                        justifyContent="center"
                                        sx={{
                                          p: 0.75,
                                          borderRadius: "999px",
                                          border: "1px solid rgba(148, 163, 184, 0.14)",
                                          background: "rgba(255,255,255,0.86)",
                                          minHeight: 102,
                                          backdropFilter: "blur(10px)",
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            fontSize: "0.64rem",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.14em",
                                            color: "#667085",
                                            fontWeight: 800,
                                          }}
                                        >
                                          Score
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontSize: { xs: "1.7rem", md: "1.9rem" },
                                            lineHeight: 1,
                                            fontWeight: 900,
                                            letterSpacing: "-0.05em",
                                            color: "#111827",
                                          }}
                                        >
                                          {hasScore ? `${match.homeScore} - ${match.awayScore}` : "0 - 0"}
                                        </Typography>
                                      </Stack>
                                      <Box
                                        sx={{
                                          p: 1.4,
                                          borderRadius: "22px",
                                          border: "1px solid rgba(168, 85, 247, 0.12)",
                                          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(252,248,255,0.92) 100%)",
                                          minHeight: 102,
                                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            fontSize: "0.75rem",
                                            color: "#7E22CE",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.12em",
                                            fontWeight: 800,
                                            mb: 0.55,
                                          }}
                                        >
                                          Away
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontWeight: 800,
                                            color: "#101828",
                                            fontSize: { xs: "1.1rem", md: "1.24rem" },
                                            lineHeight: 1.18,
                                            wordBreak: "break-word",
                                            letterSpacing: "-0.03em",
                                          }}
                                        >
                                          {resolveTeamName(match.awayTeamId, match.awayTeamName)}
                                        </Typography>
                                      </Box>
                                    </Box>

                                    <Box
                                      sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) auto" },
                                        gap: 1.25,
                                        alignItems: "start",
                                      }}
                                    >
                                      <Stack
                                        spacing={1}
                                        sx={{
                                          p: 1.35,
                                          borderRadius: "22px",
                                          bgcolor: isCompleted ? "rgba(236, 253, 243, 0.88)" : "rgba(255,255,255,0.78)",
                                          border: isCompleted ? "1px solid rgba(134, 239, 172, 0.62)" : "1px solid rgba(148, 163, 184, 0.15)",
                                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
                                        }}
                                      >
                                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                          <Chip
                                            size="small"
                                            color={isCompleted ? "success" : normalizeRound(match.status) === "IN_PROGRESS" ? "warning" : "default"}
                                            label={statusLabel}
                                            sx={{ fontWeight: 700 }}
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
                                                  bgcolor: "rgba(255,255,255,0.88)",
                                                  fontWeight: 700,
                                                  borderColor: "rgba(148, 163, 184, 0.24)",
                                                }}
                                              />
                                            ))}
                                          {match.tiebreakRequired || tiebreakDraft.home || tiebreakDraft.away ? (
                                            <Chip
                                              size="small"
                                              variant="outlined"
                                              label={`Tie-break: ${tiebreakDraft.home || match.tiebreakScore?.home || "-"}-${tiebreakDraft.away || match.tiebreakScore?.away || "-"}`}
                                              sx={{
                                                bgcolor: "rgba(255,255,255,0.88)",
                                                fontWeight: 700,
                                                borderColor: "rgba(168, 85, 247, 0.22)",
                                              }}
                                            />
                                          ) : null}
                                        </Stack>
                                        <Typography sx={{ color: "#344054", fontSize: "0.92rem", fontWeight: 700 }}>
                                          {hasScore
                                            ? winnerLabel
                                              ? `Result: ${match.homeScore} - ${match.awayScore}. Winner: ${winnerLabel}.`
                                              : `Result: ${match.homeScore} - ${match.awayScore}.`
                                            : "No result recorded yet."}
                                        </Typography>
                                        <Typography sx={{ color: "#667085", fontSize: "0.84rem", lineHeight: 1.55 }}>
                                          {expanded
                                            ? "Enter one row per set, then save scores to recalculate the tennis result."
                                            : "Open scoring to enter set results and complete the match through backend tennis scoring."}
                                        </Typography>
                                      </Stack>

                                      <Stack spacing={1} sx={{ minWidth: { lg: 220 } }}>
                                        <Button
                                          variant={expanded ? "contained" : "outlined"}
                                          size="small"
                                          startIcon={<SaveRoundedIcon />}
                                          disabled={savingScores}
                                          onClick={() => {
                                            void toggleMatchScoring(match);
                                          }}
                                          sx={{
                                            borderRadius: "18px",
                                            textTransform: "none",
                                            minHeight: 48,
                                            fontWeight: 800,
                                            boxShadow: expanded ? "0 12px 24px rgba(168, 85, 247, 0.18)" : "none",
                                          }}
                                        >
                                          {expanded ? "Hide Scoring" : "Open Scoring"}
                                        </Button>
                                      </Stack>
                                    </Box>

                                    {expanded ? (
                                      <Stack
                                        spacing={1}
                                        sx={{
                                          p: 1.35,
                                          borderRadius: "22px",
                                          border: "1px solid rgba(148, 163, 184, 0.14)",
                                          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.96) 100%)",
                                        }}
                                      >
                                        {phaseDrafts.map((phase, phaseIndex) => (
                                          <Box
                                            key={`${match.id}-draft-phase-${phase.phaseId ?? phase.phaseNumber}`}
                                            sx={{
                                              display: "grid",
                                              gridTemplateColumns: { xs: "1fr", md: "120px 1fr 1fr" },
                                              gap: 1,
                                              alignItems: "center",
                                              p: 0.95,
                                              borderRadius: "16px",
                                              bgcolor: "rgba(255,255,255,0.92)",
                                              border: "1px solid rgba(148, 163, 184, 0.14)",
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
                                            />
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
                                            />
                                          </Box>
                                        ))}

                                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
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
                                            sx={{ alignSelf: "flex-start", textTransform: "none" }}
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
                                              gridTemplateColumns: { xs: "1fr", md: "120px 1fr 1fr" },
                                              gap: 1,
                                              alignItems: "center",
                                              p: 0.95,
                                              borderRadius: "16px",
                                              bgcolor: "rgba(255,255,255,0.92)",
                                              border: "1px solid rgba(148, 163, 184, 0.14)",
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
                                            />
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
                                            />
                                          </Box>
                                        ) : null}

                                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                          <Button
                                            variant="contained"
                                            size="small"
                                            disabled={savingScores}
                                            onClick={() => {
                                              void saveMatchScoring(match);
                                            }}
                                            sx={{ borderRadius: "16px", textTransform: "none", minHeight: 44, fontWeight: 800 }}
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
                                            sx={{ borderRadius: "16px", textTransform: "none", minHeight: 44, fontWeight: 700 }}
                                          >
                                            Close
                                          </Button>
                                        </Stack>
                                      </Stack>
                                    ) : null}
                                  </Stack>
                                </Box>
                              );
                              })}
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
                                {currentQualifiedIds.map((teamId) => (
                                  <Chip key={`q-${teamId}`} color="success" label={resolveTeamName(teamId)} />
                                ))}
                              </Stack>
                            </Box>

                            <Box sx={{ p: 1.25, borderRadius: "12px", border: "1px solid #E5E7EB" }}>
                              <Typography sx={{ fontWeight: 700, mb: 1 }}>Knockout Preview</Typography>
                              {knockoutPreviewPairs.length === 0 ? (
                                <Typography sx={{ color: "#667085" }}>Need at least 2 qualified teams.</Typography>
                              ) : (
                                <Stack spacing={0.75}>
                                  {knockoutPreviewPairs.map((pair, idx) => (
                                    <Box
                                      key={`kp-${idx + 1}`}
                                      sx={{
                                        px: 1,
                                        py: 0.8,
                                        borderRadius: "8px",
                                        bgcolor: "#F9FAFB",
                                        border: "1px solid #EAECF0",
                                      }}
                                    >
                                      <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
                                        Quarterfinal {idx + 1}: {resolveTeamName(pair.home)} vs {resolveTeamName(pair.away)}
                                      </Typography>
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
