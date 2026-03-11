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
  };
};

type ApiMatchResultDto = {
  matchId?: number | string;
  homeScore?: number | string;
  awayScore?: number | string;
  winnerTeamId?: number | string;
  completedAt?: string;
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
  resultExists?: boolean;
};

type StandingsRow = {
  teamId: number;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
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
  if (explicit) return explicit;
  const memberNames = (team.members ?? [])
    .map((member) => String(member.userFullName ?? "").trim())
    .filter(Boolean);
  if (memberNames.length > 0) return memberNames.join(" / ");
  return `Team #${team.id}`;
}

function normalizeRound(raw?: string): string {
  return String(raw ?? "GROUP").trim().toUpperCase() || "GROUP";
}

function makeResultKey(eventId: string, categoryId: string): string {
  return `run_tournament_results_${eventId}_${categoryId}`;
}

function loadLocalResults(eventId: string, categoryId: string): Record<string, { home: number; away: number }> {
  try {
    const raw = localStorage.getItem(makeResultKey(eventId, categoryId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocalResult(
  eventId: string,
  categoryId: string,
  backendMatchId: number,
  score: { home: number; away: number },
) {
  const current = loadLocalResults(eventId, categoryId);
  current[String(backendMatchId)] = score;
  localStorage.setItem(makeResultKey(eventId, categoryId), JSON.stringify(current));
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
  const [qualifiersPerGroupByCategory, setQualifiersPerGroupByCategory] =
    React.useState<Record<string, number>>({});
  const [qualifiedByCategory, setQualifiedByCategory] = React.useState<Record<string, number[]>>({});
  const [finalizedByCategory, setFinalizedByCategory] = React.useState<Record<string, boolean>>({});

  const [loadingCategoryOpsById, setLoadingCategoryOpsById] = React.useState<Record<string, boolean>>({});
  const [savingMatchById, setSavingMatchById] = React.useState<Record<string, boolean>>({});
  const [finalizingByCategory, setFinalizingByCategory] = React.useState<Record<string, boolean>>({});
  const [matchDraftScores, setMatchDraftScores] = React.useState<
    Record<string, { home: string; away: string }>
  >({});
  const [editingCompletedByMatch, setEditingCompletedByMatch] = React.useState<
    Record<string, boolean>
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
        const isGroup = normalizeRound(match.round) === "GROUP";
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

  const standingsByGroup = React.useMemo(() => {
    if (!selectedCategory) return [] as Array<{ groupId: string; groupName: string; rows: StandingsRow[] }>;

    return selectedGroups.map((group) => {
      const teamIds = (group.participants ?? [])
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry) && entry > 0);
      const rowsMap = new Map<number, StandingsRow>();

      teamIds.forEach((teamId) => {
        rowsMap.set(teamId, {
          teamId,
          teamName: resolveTeamName(teamId),
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          points: 0,
        });
      });

      const groupMatches = selectedMatches.filter(
        (match) => String(match.groupId ?? "") === String(group.id) && normalizeRound(match.round) === "GROUP",
      );

      groupMatches.forEach((match) => {
        if (!Number.isFinite(match.homeScore) || !Number.isFinite(match.awayScore)) return;
        const home = rowsMap.get(Number(match.homeTeamId));
        const away = rowsMap.get(Number(match.awayTeamId));
        if (!home || !away) return;

        home.played += 1;
        away.played += 1;
        home.gf += Number(match.homeScore);
        home.ga += Number(match.awayScore);
        away.gf += Number(match.awayScore);
        away.ga += Number(match.homeScore);

        if (Number(match.homeScore) > Number(match.awayScore)) {
          home.wins += 1;
          home.points += 3;
          away.losses += 1;
        } else if (Number(match.homeScore) < Number(match.awayScore)) {
          away.wins += 1;
          away.points += 3;
          home.losses += 1;
        } else {
          home.draws += 1;
          away.draws += 1;
          home.points += 1;
          away.points += 1;
        }

        home.gd = home.gf - home.ga;
        away.gd = away.gf - away.ga;
      });

      const rows = Array.from(rowsMap.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.teamName.localeCompare(b.teamName);
      });

      return {
        groupId: String(group.id),
        groupName: group.name,
        rows,
      };
    });
  }, [selectedCategory, selectedGroups, selectedMatches, resolveTeamName]);

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
        const localResults = loadLocalResults(String(id), categoryId);

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
            const homeTeamId = Number(
              item.homeTeamId ?? item.home_team_id ?? item.homeTeam?.id,
            );
            const awayTeamId = Number(
              item.awayTeamId ?? item.away_team_id ?? item.awayTeam?.id,
            );
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
            const localScore = Number.isFinite(backendMatchId) && backendMatchId > 0
              ? localResults[String(backendMatchId)]
              : undefined;

            acc.push({
              id: `m_${categoryId}_${Number.isFinite(backendMatchId) ? backendMatchId : idx + 1}`,
              backendMatchId: Number.isFinite(backendMatchId) && backendMatchId > 0 ? backendMatchId : undefined,
              categoryId,
              groupId: Number.isFinite(groupId) && groupId > 0 ? groupId : undefined,
              groupName: String(item.group?.name ?? "").trim() || undefined,
              round: normalizeRound(item.round ?? item.stage ?? "GROUP"),
              homeTeamId,
              homeTeamName: String(item.homeTeam?.name ?? "").trim() || undefined,
              awayTeamId,
              awayTeamName: String(item.awayTeam?.name ?? "").trim() || undefined,
              matchDate: String(item.matchDate ?? item.match_date ?? ""),
              startTime: toHmTime(item.startTime ?? item.start_time),
              venue: String(item.venue ?? item.court ?? item.field ?? "").trim(),
              status: normalizeRound(item.status ?? item.matchStatus ?? "SCHEDULED"),
              homeScore:
                Number.isFinite(resultHome)
                  ? resultHome
                  : localScore?.home,
              awayScore:
                Number.isFinite(resultAway)
                  ? resultAway
                  : localScore?.away,
              resultExists:
                (Number.isFinite(resultHome) && Number.isFinite(resultAway)) ||
                Boolean(item.result),
            });
            return acc;
          }, []);

        let resolvedMatches = normalizedMatches;
        const pendingResultMatches = normalizedMatches.filter(
          (match) =>
            Number.isFinite(Number(match.backendMatchId)) &&
            Number(match.backendMatchId) > 0 &&
            !match.resultExists,
        );
        if (pendingResultMatches.length > 0) {
          const resultRows = await Promise.all(
            pendingResultMatches.map(async (match) => {
              const matchId = Number(match.backendMatchId);
              const res = await fetch(`${API_URL}/match-results/${matchId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) return null;
              const body = await res.json().catch(() => null);
              const payload: ApiMatchResultDto | null = body?.data ?? body;
              if (!payload) return null;
              const homeScore = Number(payload.homeScore);
              const awayScore = Number(payload.awayScore);
              if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null;
              return { matchId, homeScore, awayScore };
            }),
          );
          const resultByMatchId = new Map(
            resultRows
              .filter((row): row is { matchId: number; homeScore: number; awayScore: number } => Boolean(row))
              .map((row) => [row.matchId, row] as const),
          );
          resolvedMatches = normalizedMatches.map((match) => {
            const key = Number(match.backendMatchId);
            const hit = resultByMatchId.get(key);
            if (!hit) return match;
            return {
              ...match,
              homeScore: hit.homeScore,
              awayScore: hit.awayScore,
              resultExists: true,
            };
          });
        }

        setGroupsByCategory((prev) => ({ ...prev, [categoryId]: normalizedGroups }));
        setTeamsByCategory((prev) => ({ ...prev, [categoryId]: teamsRaw }));
        setMatchesByCategory((prev) => ({ ...prev, [categoryId]: resolvedMatches }));

        setMatchDraftScores((prev) => {
          const next = { ...prev };
          resolvedMatches.forEach((match) => {
            next[match.id] = {
              home:
                Number.isFinite(match.homeScore) && typeof match.homeScore === "number"
                  ? String(match.homeScore)
                  : "",
              away:
                Number.isFinite(match.awayScore) && typeof match.awayScore === "number"
                  ? String(match.awayScore)
                  : "",
            };
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

  const upsertMatchResultViaApi = React.useCallback(
    async (
      token: string,
      match: RunMatch,
      homeScore: number,
      awayScore: number,
    ) => {
      const matchId = Number(match.backendMatchId);
      if (!Number.isFinite(matchId) || matchId <= 0) return false;

      const winnerTeamId =
        homeScore === awayScore
          ? undefined
          : homeScore > awayScore
            ? Number(match.homeTeamId)
            : Number(match.awayTeamId);
      const payload = {
        homeScore,
        awayScore,
        ...(Number.isFinite(Number(winnerTeamId)) && Number(winnerTeamId) > 0
          ? { winnerTeamId: Number(winnerTeamId) }
          : {}),
        completedAt: new Date().toISOString(),
      };

      const preferredMethod = match.resultExists ? "PUT" : "POST";
      const tryRequest = async (method: "POST" | "PUT") => {
        const url =
          method === "POST"
            ? `${API_URL}/match-results`
            : `${API_URL}/match-results/${matchId}`;
        const bodyPayload =
          method === "POST" ? { matchId, ...payload } : payload;
        const res = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyPayload),
        });
        const body = await res.json().catch(() => null);
        return { ok: res.ok, body };
      };

      const first = await tryRequest(preferredMethod);
      if (first.ok) return true;

      const fallbackMethod = preferredMethod === "POST" ? "PUT" : "POST";
      const second = await tryRequest(fallbackMethod);
      if (second.ok) return true;

      throw new Error(
        second.body?.message?.[0] ||
          second.body?.error ||
          first.body?.message?.[0] ||
          first.body?.error ||
          "Failed to save match result.",
      );
    },
    [],
  );

  const upsertMatch = React.useCallback(
    async (match: RunMatch, nextStatus?: string) => {
      if (!id || !selectedCategory) return;
      const token = getToken();
      if (!token) {
        setError("Invalid session. Please sign in again.");
        return;
      }

      const draft = matchDraftScores[match.id] ?? { home: "", away: "" };
      const homeScoreRaw = draft.home.trim();
      const awayScoreRaw = draft.away.trim();
      const homeScore = homeScoreRaw === "" ? undefined : Number(homeScoreRaw);
      const awayScore = awayScoreRaw === "" ? undefined : Number(awayScoreRaw);

      if (
        homeScoreRaw !== "" && (!Number.isFinite(homeScore) || Number(homeScore) < 0)
      ) {
        setError("Home score must be a non-negative number.");
        return;
      }
      if (
        awayScoreRaw !== "" && (!Number.isFinite(awayScore) || Number(awayScore) < 0)
      ) {
        setError("Away score must be a non-negative number.");
        return;
      }
      if (
        (homeScoreRaw === "" && awayScoreRaw !== "") ||
        (homeScoreRaw !== "" && awayScoreRaw === "")
      ) {
        setError("Enter both Home and Away scores.");
        return;
      }
      if (nextStatus === "COMPLETED" && (homeScore == null || awayScore == null)) {
        setError("Enter both scores before completing the match.");
        return;
      }

      setSavingMatchById((prev) => ({ ...prev, [match.id]: true }));
      setError(null);

      const updated: RunMatch = {
        ...match,
        status: normalizeRound(nextStatus ?? match.status),
        homeScore,
        awayScore,
      };

      try {
        if (Number.isFinite(Number(match.backendMatchId)) && Number(match.backendMatchId) > 0) {
          const payload = {
            ...(Number.isFinite(Number(match.groupId)) && Number(match.groupId) > 0
              ? { groupId: Number(match.groupId) }
              : { categoryId: Number(selectedCategory.id) }),
            round: normalizeRound(match.round),
            homeTeamId: Number(match.homeTeamId),
            awayTeamId: Number(match.awayTeamId),
            matchDate: String(match.matchDate ?? ""),
            startTime: `${toHmTime(match.startTime) || "00:00"}:00`,
            venue: String(match.venue ?? ""),
            status: normalizeRound(nextStatus ?? match.status),
          };

          const res = await fetch(`${API_URL}/matches/${Number(match.backendMatchId)}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });
          const body = await res.json().catch(() => null);
          if (!res.ok) {
            throw new Error(body?.message?.[0] || body?.error || "Failed to update match.");
          }
        }

        if (homeScore != null && awayScore != null) {
          await upsertMatchResultViaApi(token, match, Number(homeScore), Number(awayScore));
        }

        if (
          Number.isFinite(Number(updated.backendMatchId)) &&
          Number(updated.backendMatchId) > 0 &&
          homeScore != null &&
          awayScore != null
        ) {
          saveLocalResult(String(id), selectedCategoryId, Number(updated.backendMatchId), {
            home: Number(homeScore),
            away: Number(awayScore),
          });
        }

        setMatchesByCategory((prev) => ({
          ...prev,
          [selectedCategoryId]: (prev[selectedCategoryId] ?? []).map((item) =>
            item.id === match.id
              ? {
                  ...updated,
                  resultExists:
                    item.resultExists ||
                    (homeScore != null && awayScore != null),
                }
              : item,
          ),
        }));

        setStatusMessage(
          normalizeRound(nextStatus ?? match.status) === "COMPLETED"
            ? "Match completed and standings updated."
            : "Match updated.",
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update match.");
      } finally {
        setSavingMatchById((prev) => ({ ...prev, [match.id]: false }));
      }
    },
    [id, matchDraftScores, selectedCategory, selectedCategoryId, upsertMatchResultViaApi],
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
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const qualified: number[] = [];
      standingsByGroup.forEach((group) => {
        group.rows.slice(0, currentQualifiersPerGroup).forEach((row) => {
          qualified.push(row.teamId);
        });
      });

      setQualifiedByCategory((prev) => ({ ...prev, [selectedCategory.id]: qualified }));
      setFinalizedByCategory((prev) => ({ ...prev, [selectedCategory.id]: true }));
      setOperationsTab("knockout");
      setStatusMessage("Group phase finalized. Qualified teams are ready for knockout.");
    } finally {
      setFinalizingByCategory((prev) => ({ ...prev, [selectedCategory.id]: false }));
    }
  }, [currentQualifiersPerGroup, selectedCategory, selectedGroupProgress.complete, standingsByGroup]);

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
                          <Box
                            sx={{
                              maxHeight: { xs: 520, md: 620 },
                              overflowY: "auto",
                              pr: 0.5,
                            }}
                          >
                            <Stack spacing={1.25}>
                            {selectedMatches.map((match) => {
                              const draft = matchDraftScores[match.id] ?? {
                                home:
                                  Number.isFinite(match.homeScore) && typeof match.homeScore === "number"
                                    ? String(match.homeScore)
                                    : "",
                                away:
                                  Number.isFinite(match.awayScore) && typeof match.awayScore === "number"
                                    ? String(match.awayScore)
                                    : "",
                              };
                              const saving = Boolean(savingMatchById[match.id]);
                              const isCompleted = normalizeRound(match.status) === "COMPLETED";
                              const showEditor = !isCompleted || Boolean(editingCompletedByMatch[match.id]);
                              const homeScoreValue =
                                draft.home.trim() !== "" ? Number(draft.home) : match.homeScore;
                              const awayScoreValue =
                                draft.away.trim() !== "" ? Number(draft.away) : match.awayScore;
                              const hasScore =
                                Number.isFinite(Number(homeScoreValue)) &&
                                Number.isFinite(Number(awayScoreValue));
                              const winnerLabel = hasScore
                                ? Number(homeScoreValue) === Number(awayScoreValue)
                                  ? "Draw"
                                  : Number(homeScoreValue) > Number(awayScoreValue)
                                    ? resolveTeamName(match.homeTeamId, match.homeTeamName)
                                    : resolveTeamName(match.awayTeamId, match.awayTeamName)
                                : null;
                              return (
                                <Box
                                  key={match.id}
                                  sx={{
                                    p: 1.5,
                                    borderRadius: "12px",
                                    border: isCompleted
                                      ? "1px solid #BBF7D0"
                                      : "1px solid #E5E7EB",
                                    bgcolor: isCompleted ? "#F0FDF4" : "#FFFFFF",
                                  }}
                                >
                                  <Stack spacing={1.25}
                                  >
                                    <Stack
                                      direction={{ xs: "column", md: "row" }}
                                      spacing={0.8}
                                      alignItems={{ md: "center" }}
                                      justifyContent="space-between"
                                    >
                                      <Typography sx={{ color: "#667085", fontSize: "0.9rem" }}>
                                        {match.venue || "Venue TBD"} • {match.matchDate || "Date TBD"} •{" "}
                                        {match.startTime || "Time TBD"}
                                      </Typography>
                                      <Stack direction="row" spacing={0.75}>
                                        {match.groupId ? (
                                          <Chip
                                            size="small"
                                            variant="outlined"
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
                                            label="Completed"
                                          />
                                        ) : null}
                                      </Stack>
                                    </Stack>

                                    <Box
                                      sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                        gap: 1,
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          p: 1.1,
                                          borderRadius: "10px",
                                          border: "1px solid #E5E7EB",
                                          bgcolor: "#F9FAFB",
                                          minHeight: 88,
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            fontSize: "0.72rem",
                                            color: "#667085",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.03em",
                                            fontWeight: 700,
                                            mb: 0.35,
                                          }}
                                        >
                                          Home
                                        </Typography>
                                          <Typography
                                          sx={{
                                            fontWeight: 800,
                                            color: "#101828",
                                            fontSize: "1.1rem",
                                            lineHeight: 1.2,
                                            wordBreak: "break-word",
                                          }}
                                        >
                                          {resolveTeamName(match.homeTeamId, match.homeTeamName)}
                                        </Typography>
                                      </Box>
                                      <Box
                                        sx={{
                                          p: 1.1,
                                          borderRadius: "10px",
                                          border: "1px solid #E5E7EB",
                                          bgcolor: "#F9FAFB",
                                          minHeight: 88,
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            fontSize: "0.72rem",
                                            color: "#667085",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.03em",
                                            fontWeight: 700,
                                            mb: 0.35,
                                          }}
                                        >
                                          Away
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontWeight: 800,
                                            color: "#101828",
                                            fontSize: "1.1rem",
                                            lineHeight: 1.2,
                                            wordBreak: "break-word",
                                          }}
                                        >
                                          {resolveTeamName(match.awayTeamId, match.awayTeamName)}
                                        </Typography>
                                      </Box>
                                    </Box>

                                    {isCompleted && !showEditor ? (
                                      <Stack
                                        direction={{ xs: "column", md: "row" }}
                                        spacing={1}
                                        alignItems={{ md: "center" }}
                                        justifyContent="space-between"
                                        sx={{
                                          p: 1,
                                          borderRadius: "10px",
                                          bgcolor: "#ECFDF3",
                                          border: "1px solid #A6F4C5",
                                        }}
                                      >
                                        <Box>
                                          <Typography
                                            sx={{ fontWeight: 800, color: "#027A48", fontSize: "1rem" }}
                                          >
                                            {hasScore ? `${homeScoreValue} - ${awayScoreValue}` : "Score Pending"}
                                          </Typography>
                                          <Typography sx={{ color: "#067647", fontSize: "0.84rem" }}>
                                            {winnerLabel ? `Winner: ${winnerLabel}` : "No winner yet"}
                                          </Typography>
                                        </Box>
                                        <Button
                                          variant="outlined"
                                          size="small"
                                          onClick={() =>
                                            setEditingCompletedByMatch((prev) => ({
                                              ...prev,
                                              [match.id]: true,
                                            }))
                                          }
                                          sx={{ borderRadius: "8px", textTransform: "none" }}
                                        >
                                          Edit Result
                                        </Button>
                                      </Stack>
                                    ) : (
                                      <Stack
                                        direction={{ xs: "column", lg: "row" }}
                                        spacing={1}
                                        alignItems={{ lg: "center" }}
                                        justifyContent="space-between"
                                      >
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                          <TextField
                                            size="small"
                                            label="Home"
                                            type="number"
                                            value={draft.home}
                                            onChange={(e) =>
                                              setMatchDraftScores((prev) => ({
                                                ...prev,
                                                [match.id]: { ...draft, home: e.target.value },
                                              }))
                                            }
                                            sx={{ width: 102 }}
                                            inputProps={{ min: 0 }}
                                          />
                                          <TextField
                                            size="small"
                                            label="Away"
                                            type="number"
                                            value={draft.away}
                                            onChange={(e) =>
                                              setMatchDraftScores((prev) => ({
                                                ...prev,
                                                [match.id]: { ...draft, away: e.target.value },
                                              }))
                                            }
                                            sx={{ width: 102 }}
                                            inputProps={{ min: 0 }}
                                          />
                                        </Stack>

                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                          <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<SaveRoundedIcon />}
                                            disabled={saving}
                                            onClick={() => {
                                              void upsertMatch(match);
                                            }}
                                            sx={{ borderRadius: "8px", textTransform: "none" }}
                                          >
                                            Save
                                          </Button>
                                          <Button
                                            variant="outlined"
                                            size="small"
                                            disabled={saving}
                                            onClick={() => {
                                              void upsertMatch(match, "IN_PROGRESS");
                                            }}
                                            sx={{ borderRadius: "8px", textTransform: "none" }}
                                          >
                                            Start
                                          </Button>
                                          <Button
                                            variant="contained"
                                            size="small"
                                            disabled={saving}
                                            onClick={() => {
                                              setEditingCompletedByMatch((prev) => ({
                                                ...prev,
                                                [match.id]: false,
                                              }));
                                              void upsertMatch(match, "COMPLETED");
                                            }}
                                            sx={{ borderRadius: "8px", textTransform: "none" }}
                                          >
                                            Complete
                                          </Button>
                                          {isCompleted ? (
                                            <Button
                                              variant="text"
                                              size="small"
                                              onClick={() =>
                                                setEditingCompletedByMatch((prev) => ({
                                                  ...prev,
                                                  [match.id]: false,
                                                }))
                                              }
                                              sx={{ borderRadius: "8px", textTransform: "none" }}
                                            >
                                              Cancel
                                            </Button>
                                          ) : null}
                                        </Stack>
                                      </Stack>
                                    )}
                                  </Stack>
                                </Box>
                              );
                            })}
                            </Stack>
                          </Box>
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
                                          "GF",
                                          "GA",
                                          "GD",
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
                                            <Box component="td" sx={{ p: 0.75, textAlign: "center" }}>{row.gf}</Box>
                                            <Box component="td" sx={{ p: 0.75, textAlign: "center" }}>{row.ga}</Box>
                                            <Box component="td" sx={{ p: 0.75, textAlign: "center" }}>{row.gd}</Box>
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
