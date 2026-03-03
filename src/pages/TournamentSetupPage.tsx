import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Slide,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useParams } from "react-router-dom";
import { getLoggedInUserId, getToken } from "../auth/tokens";
import {
  type GroupBucket,
  loadTournamentGroups,
  saveTournamentGroups,
  type TournamentCategory,
  loadTournamentSetup,
  saveTournamentSetup,
} from "../Utils/tournamentPlanner";
import TournamentPhaseBuilder, {
  generateBracketSkeleton,
  generateGroupsSkeleton,
  type BuilderBracketMatch,
} from "../Components/Shared/TournamentPhaseBuilder";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ShuffleOutlinedIcon from "@mui/icons-material/ShuffleOutlined";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";

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

type ApiTournamentCategory = {
  id: number | string;
  eventId?: number | string;
  name?: string;
  level?: string;
  minAge?: number | string | null;
  maxAge?: number | string | null;
  gender?: string;
};

type ApiTournamentGroup = {
  id: number;
  categoryId: number;
  name: string;
};

type ApiGroupTeamAssignment = {
  groupId?: number | string;
  teamId?: number | string;
};

type ApiEventSubscriptionCategory = {
  id?: number | string;
  suggestedPlayer?: string | null;
  note?: string | null;
};

type ApiEventSubscription = {
  eventId?: number | string;
  userId?: number | string;
  userFullName?: string;
  userEmail?: string;
  status?: string;
  source?: string;
  categories?: ApiEventSubscriptionCategory[];
  joinedAt?: string;
};

type TeamMemberDto = {
  userId: number;
  userFullName?: string;
  role?: string;
  joinedAt?: string;
};

type TeamDto = {
  id: number;
  categoryId: number;
  name?: string;
  autoNameFromMembers?: boolean;
  createdAt?: string;
  members?: TeamMemberDto[];
};

type RegisteredPlayer = {
  id: string;
  name: string;
  email: string;
  preferredPartner: string | null;
  categoryIds: string[];
};

type TeamEditorState = {
  name: string;
  memberUserIds: string[];
  autoNameFromMembers: boolean;
  editingTeamId: number | null;
};

type StructureMode =
  | "groups_knockout"
  | "knockout_only"
  | "group_phase_only"
  | "swiss";
type TournamentFormat = "Singles" | "Doubles" | "Teams";
type SetupTab = "overview" | "categories" | "teams" | "groups";
type CategorySetupConfig = {
  formats: TournamentFormat[];
  structureMode: StructureMode | "";
  groupCount?: number;
  teamsPerGroup?: number;
  qualifiedPerGroup?: number;
  bracketMatches?: BuilderBracketMatch[];
};

const STRUCTURE_OPTIONS: Array<{
  id: StructureMode;
  title: string;
  subtitle: string;
}> = [
  {
    id: "groups_knockout",
    title: "Group Phase + Knockout",
    subtitle: "Round-robin groups then finals",
  },
  {
    id: "knockout_only",
    title: "Knockout Only",
    subtitle: "Fast elimination format",
  },
  {
    id: "group_phase_only",
    title: "Group Phase Only",
    subtitle: "Standings-based competition",
  },
  {
    id: "swiss",
    title: "Swiss Rounds",
    subtitle: "Pair by score each round",
  },
];

function inferDisciplineFromCategory(
  raw: ApiTournamentCategory,
): TournamentCategory["discipline"] {
  const name = String(raw.name ?? "").toLowerCase();
  const gender = String(raw.gender ?? "").toLowerCase();
  if (name.includes("team")) return "Teams";
  if (name.includes("mixed") || gender.includes("mixed"))
    return "Mixed Doubles";
  if (gender.includes("women") || gender.includes("female"))
    return "Doubles Female";
  if (gender.includes("men") || gender.includes("male")) return "Doubles Male";
  return "Singles";
}

function inferFormatFromCategoryName(name?: string): TournamentFormat {
  const normalized = String(name ?? "").toLowerCase();
  if (normalized.includes("team")) return "Teams";
  if (normalized.includes("double") || normalized.includes("mixed"))
    return "Doubles";
  return "Singles";
}

function groupLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function getTeamDisplayName(team: TeamDto): string {
  const explicitName = String(team.name ?? "").trim();
  if (explicitName) return explicitName;
  const memberNames = (team.members ?? [])
    .map((member) => String(member.userFullName ?? "").trim())
    .filter(Boolean);
  if (memberNames.length > 0) return memberNames.join(" / ");
  return `Team #${team.id}`;
}

function entryLabelFromFormat(format?: TournamentFormat): string {
  if (format === "Singles") return "Player";
  if (format === "Doubles") return "Pair";
  return "Team";
}

function extractLevelFromCategoryName(name?: string): string | null {
  const normalized = String(name ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("advanced")) return "Advanced";
  if (normalized.includes("intermediate")) return "Intermediate";
  if (normalized.includes("beginner")) return "Beginner";
  if (normalized.includes("open")) return "Open";
  return null;
}

function stripLevelPrefixFromCategoryName(
  name: string,
  sectionLevel: string,
): string {
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

  // Remove level token even when separators are inconsistent, then normalize label.
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

export default function TournamentSetupPage() {
  const { id } = useParams();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [event, setEvent] = React.useState<ApiEvent | null>(null);
  const [categories, setCategories] = React.useState<TournamentCategory[]>([
    {
      id: crypto.randomUUID(),
      name: "Open Singles",
      discipline: "Singles",
      groups: 4,
    },
  ]);
  const [selectedCategoryId, setSelectedCategoryId] =
    React.useState<string>("");
  const [categoryConfigs, setCategoryConfigs] = React.useState<
    Record<string, CategorySetupConfig>
  >({});
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<SetupTab>("overview");
  const [expandedOverviewCategoryId, setExpandedOverviewCategoryId] =
    React.useState<string | null>(null);
  const [overviewStepByCategory, setOverviewStepByCategory] = React.useState<
    Record<string, "structure" | "teams" | "groups">
  >({});
  const [confirmedStructureByCategory, setConfirmedStructureByCategory] =
    React.useState<Record<string, boolean>>({});
  const [registeredPlayers, setRegisteredPlayers] = React.useState<
    RegisteredPlayer[]
  >([]);
  const [registeredPlayersLoading, setRegisteredPlayersLoading] =
    React.useState(false);
  const [registeredPlayersError, setRegisteredPlayersError] = React.useState<
    string | null
  >(null);
  const [teamsByCategory, setTeamsByCategory] = React.useState<
    Record<string, TeamDto[]>
  >({});
  const [teamEditorByCategory, setTeamEditorByCategory] = React.useState<
    Record<string, TeamEditorState>
  >({});
  const [teamsLoadingByCategory, setTeamsLoadingByCategory] = React.useState<
    Record<string, boolean>
  >({});
  const [teamsSubmittingByCategory, setTeamsSubmittingByCategory] =
    React.useState<Record<string, boolean>>({});
  const [pendingContinueWarningByCategory, setPendingContinueWarningByCategory] =
    React.useState<Record<string, boolean>>({});
  const [groupsByCategory, setGroupsByCategory] = React.useState<
    Record<string, GroupBucket[]>
  >({});
  const [serverGroupIdsByCategory, setServerGroupIdsByCategory] =
    React.useState<Record<string, number[]>>({});
  const groupStructureSignatureRef = React.useRef<Record<string, string>>({});

  React.useEffect(() => {
    if (!id) return;
    setGroupsByCategory(loadTournamentGroups(id));
  }, [id]);

  const groupStructureSignature = (groups: GroupBucket[]) =>
    groups.map((g) => `${g.id}::${g.name}`).join("||");

  const extractPersistedGroupTeamPairs = React.useCallback(
    (groups: GroupBucket[]) => {
      const pairs = new Set<string>();
      groups.forEach((group) => {
        const groupId = Number(group.id);
        if (!Number.isFinite(groupId) || groupId <= 0) return;
        (group.participants ?? []).forEach((participant) => {
          const teamId = Number(String(participant ?? "").trim());
          if (!Number.isFinite(teamId) || teamId <= 0) return;
          pairs.add(`${groupId}:${teamId}`);
        });
      });
      return pairs;
    },
    [],
  );

  const syncGroupTeamAssignmentsForCategory = React.useCallback(
    async (
      previousGroups: GroupBucket[],
      nextGroups: GroupBucket[],
      categoryTeamIds: Set<number>,
    ) => {
      const token = getToken();
      if (!token) return;

      const previousPairs = extractPersistedGroupTeamPairs(previousGroups);
      const nextPairs = extractPersistedGroupTeamPairs(nextGroups);

      const toCreate = Array.from(nextPairs).filter((pair) => !previousPairs.has(pair));
      const toDelete = Array.from(previousPairs).filter((pair) => !nextPairs.has(pair));

      if (toCreate.length === 0 && toDelete.length === 0) return;

      try {
        await Promise.all(
          toCreate.map(async (pair) => {
            const [groupIdRaw, teamIdRaw] = pair.split(":");
            const groupId = Number(groupIdRaw);
            const teamId = Number(teamIdRaw);
            if (!categoryTeamIds.has(teamId)) return;
            const res = await fetch(`${API_URL}/group-teams`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ groupId, teamId }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => null);
              throw new Error(
                body?.message?.[0] ||
                  body?.error ||
                  `Failed to assign team ${teamId} to group ${groupId}.`,
              );
            }
          }),
        );

        await Promise.all(
          toDelete.map(async (pair) => {
            const [groupIdRaw, teamIdRaw] = pair.split(":");
            const groupId = Number(groupIdRaw);
            const teamId = Number(teamIdRaw);
            if (!categoryTeamIds.has(teamId)) return;
            const res = await fetch(
              `${API_URL}/group-teams/group/${groupId}/team/${teamId}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (!res.ok) {
              const body = await res.json().catch(() => null);
              throw new Error(
                body?.message?.[0] ||
                  body?.error ||
                  `Failed to unassign team ${teamId} from group ${groupId}.`,
              );
            }
          }),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to sync group-team assignments.",
        );
      }
    },
    [extractPersistedGroupTeamPairs],
  );

  const syncTournamentGroupsForCategory = React.useCallback(
    async (categoryId: string, nextGroups: GroupBucket[]) => {
      const token = getToken();
      if (!token) return;
      const parsedCategoryId = Number(categoryId);
      if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) return;

      const signature = groupStructureSignature(nextGroups);
      if (groupStructureSignatureRef.current[categoryId] === signature) return;

      try {
        const serverIds = new Set(serverGroupIdsByCategory[categoryId] ?? []);
        const usedIds = new Set<number>();
        const updated = [...nextGroups];
        let serverGroupsByName: Map<string, number> | null = null;

        const loadServerGroupsByName = async (): Promise<Map<string, number>> => {
          if (serverGroupsByName) return serverGroupsByName;
          const res = await fetch(
            `${API_URL}/tournament-groups?categoryId=${encodeURIComponent(parsedCategoryId)}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const body = await res.json().catch(() => null);
          if (!res.ok) {
            throw new Error(
              body?.message?.[0] ||
                body?.error ||
                "Failed to load existing tournament groups",
            );
          }
          const list: ApiTournamentGroup[] = Array.isArray(body)
            ? body
            : (body?.data ?? []);
          serverGroupsByName = new Map(
            list
              .map((group) => [String(group.name ?? "").trim().toLowerCase(), Number(group.id)] as const)
              .filter(
                ([nameKey, groupId]) =>
                  Boolean(nameKey) && Number.isFinite(groupId) && groupId > 0,
              ),
          );
          return serverGroupsByName;
        };

        for (let i = 0; i < updated.length; i += 1) {
          const group = updated[i];
          const backendId = Number(group.id);
          const isPersisted = Number.isFinite(backendId) && backendId > 0;

          if (isPersisted) {
            usedIds.add(backendId);
            const updateRes = await fetch(
              `${API_URL}/tournament-groups/${backendId}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  categoryId: parsedCategoryId,
                  name: group.name,
                }),
              },
            );
            if (!updateRes.ok) {
              const updateBody = await updateRes.json().catch(() => null);
              throw new Error(
                updateBody?.message?.[0] ||
                  updateBody?.error ||
                  "Failed to update tournament group",
              );
            }
            continue;
          }

          const existingByNameId = (
            await loadServerGroupsByName()
          ).get(String(group.name ?? "").trim().toLowerCase());
          if (Number.isFinite(existingByNameId) && Number(existingByNameId) > 0) {
            const normalizedId = Number(existingByNameId);
            usedIds.add(normalizedId);
            updated[i] = { ...group, id: String(normalizedId) };
            const updateRes = await fetch(
              `${API_URL}/tournament-groups/${normalizedId}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  categoryId: parsedCategoryId,
                  name: group.name,
                }),
              },
            );
            if (!updateRes.ok) {
              const updateBody = await updateRes.json().catch(() => null);
              throw new Error(
                updateBody?.message?.[0] ||
                  updateBody?.error ||
                  "Failed to reconcile tournament group",
              );
            }
            continue;
          }

          const createRes = await fetch(`${API_URL}/tournament-groups`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              categoryId: parsedCategoryId,
              name: group.name,
            }),
          });
          const createBody = await createRes.json().catch(() => null);
          if (!createRes.ok) {
            throw new Error(
              createBody?.message?.[0] ||
                createBody?.error ||
                "Failed to create tournament group",
            );
          }
          const newId = Number(createBody?.id ?? createBody?.data?.id);
          if (Number.isFinite(newId) && newId > 0) {
            usedIds.add(newId);
            updated[i] = { ...group, id: String(newId) };
          }
        }

        const deleteOps = Array.from(serverIds).filter(
          (idToDelete) => !usedIds.has(idToDelete),
        );
        await Promise.all(
          deleteOps.map(async (idToDelete) => {
            const deleteRes = await fetch(
              `${API_URL}/tournament-groups/${idToDelete}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (!deleteRes.ok) {
              const deleteBody = await deleteRes.json().catch(() => null);
              throw new Error(
                deleteBody?.message?.[0] ||
                  deleteBody?.error ||
                  "Failed to delete tournament group",
              );
            }
          }),
        );

        setGroupsByCategory((prev) => {
          const next = { ...prev, [categoryId]: updated };
          if (id) saveTournamentGroups(id, next);
          return next;
        });
        setServerGroupIdsByCategory((prev) => ({
          ...prev,
          [categoryId]: Array.from(usedIds),
        }));
        groupStructureSignatureRef.current[categoryId] =
          groupStructureSignature(updated);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to sync tournament groups",
        );
      }
    },
    [id, serverGroupIdsByCategory],
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
        const [eventRes, categoriesRes] = await Promise.all([
          fetch(`${API_URL}/events`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/tournament-categories?eventId=${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const data = await eventRes.json().catch(() => null);
        const categoriesData = await categoriesRes.json().catch(() => null);
        if (!eventRes.ok) {
          throw new Error(
            data?.message?.[0] ||
              data?.error ||
              `Failed to load tournament (${eventRes.status})`,
          );
        }
        if (!categoriesRes.ok) {
          throw new Error(
            categoriesData?.message?.[0] ||
              categoriesData?.error ||
              `Failed to load tournament categories (${categoriesRes.status})`,
          );
        }

        const raw: ApiEvent[] = Array.isArray(data) ? data : (data?.data ?? []);
        const hasOwnerField = raw.some(
          (e) => e.userId != null || e.user_id != null,
        );
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
        const saved = loadTournamentSetup(String(selected.id));
        const rawCategories: ApiTournamentCategory[] = Array.isArray(
          categoriesData,
        )
          ? categoriesData
          : (categoriesData?.data ?? []);
        const savedCategories = saved?.categories ?? [];
        const backendMappedCategories: TournamentCategory[] = rawCategories.map(
          (cat, idx) => {
            const fallbackName = `Category ${idx + 1}`;
            const categoryName = String(cat.name ?? "").trim() || fallbackName;
            const persisted =
              savedCategories.find((sc) => sc.id === String(cat.id)) ??
              savedCategories.find(
                (sc) =>
                  sc.name.trim().toLowerCase() === categoryName.toLowerCase(),
              );
            return {
              id: String(cat.id),
              name: categoryName,
              discipline:
                persisted?.discipline ?? inferDisciplineFromCategory(cat),
              groups: Math.max(1, Number(persisted?.groups ?? 2)),
            };
          },
        );

        if (saved) {
          const savedConfigs = saved.categoryConfigs ?? {};
          const computedConfigs: Record<string, CategorySetupConfig> = {};
          const sourceCategories =
            backendMappedCategories.length > 0
              ? backendMappedCategories
              : saved.categories;
          sourceCategories.forEach((cat) => {
            const current = savedConfigs[String(cat.id)];
            computedConfigs[String(cat.id)] = {
              formats: [inferFormatFromCategoryName(cat.name)],
              structureMode: (current?.structureMode as StructureMode) ?? "",
              groupCount:
                typeof current?.groupCount === "number"
                  ? current.groupCount
                  : undefined,
              teamsPerGroup:
                typeof current?.teamsPerGroup === "number"
                  ? current.teamsPerGroup
                  : undefined,
              qualifiedPerGroup:
                typeof current?.qualifiedPerGroup === "number"
                  ? current.qualifiedPerGroup
                  : undefined,
              bracketMatches: Array.isArray(current?.bracketMatches)
                ? current.bracketMatches.map((m) => ({
                    id: String(m.id),
                    name: String((m as any).name ?? `Match ${m.id}`),
                    round: String(m.round),
                    roundIndex: Number((m as any).roundIndex ?? 0),
                    home: String(m.home ?? ""),
                    away: String(m.away ?? ""),
                  }))
                : [],
            };
          });
          setCategoryConfigs(computedConfigs);

          if (backendMappedCategories.length > 0) {
            setCategories(backendMappedCategories);
          } else {
            setCategories(saved.categories);
          }
        } else if (backendMappedCategories.length > 0) {
          setCategories(backendMappedCategories);
          const computedConfigs: Record<string, CategorySetupConfig> = {};
          backendMappedCategories.forEach((cat) => {
            computedConfigs[String(cat.id)] = {
              formats: [inferFormatFromCategoryName(cat.name)],
              structureMode: "",
              bracketMatches: [],
            };
          });
          setCategoryConfigs(computedConfigs);
        }

        const categoriesForGroups =
          backendMappedCategories.length > 0
            ? backendMappedCategories
            : (saved?.categories ?? []);
        const groupFetches = await Promise.all(
          categoriesForGroups.map(async (cat) => {
            const catId = Number(cat.id);
            if (!Number.isFinite(catId) || catId <= 0) {
              return {
                categoryKey: String(cat.id),
                groups: [] as ApiTournamentGroup[],
              };
            }
            const res = await fetch(
              `${API_URL}/tournament-groups?categoryId=${encodeURIComponent(catId)}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!res.ok)
              return {
                categoryKey: String(cat.id),
                groups: [] as ApiTournamentGroup[],
              };
            const body = await res.json().catch(() => null);
            const list: ApiTournamentGroup[] = Array.isArray(body)
              ? body
              : (body?.data ?? []);
            return { categoryKey: String(cat.id), groups: list };
          }),
        );

        const groupTeamRes = await fetch(`${API_URL}/group-teams`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const groupTeamBody: ApiGroupTeamAssignment[] | null =
          await groupTeamRes.json().catch(() => null);
        const groupAssignments = Array.isArray(groupTeamBody)
          ? groupTeamBody
          : [];
        const teamIdsByGroupId = new Map<number, number[]>();
        groupAssignments.forEach((assignment) => {
          const groupId = Number(assignment.groupId);
          const teamId = Number(assignment.teamId);
          if (
            !Number.isFinite(groupId) ||
            groupId <= 0 ||
            !Number.isFinite(teamId) ||
            teamId <= 0
          ) {
            return;
          }
          const current = teamIdsByGroupId.get(groupId) ?? [];
          if (!current.includes(teamId)) current.push(teamId);
          teamIdsByGroupId.set(groupId, current);
        });

        const nextGroupsMap: Record<string, GroupBucket[]> = {};
        const nextServerIdsMap: Record<string, number[]> = {};
        groupFetches.forEach(({ categoryKey, groups }) => {
          const mappedGroups: GroupBucket[] = groups.map((g) => ({
            id: String(g.id),
            name: String(g.name ?? "Group"),
            participants: (teamIdsByGroupId.get(Number(g.id)) ?? []).map((teamId) =>
              String(teamId),
            ),
          }));
          nextGroupsMap[categoryKey] = mappedGroups;
          nextServerIdsMap[categoryKey] = groups
            .map((g) => Number(g.id))
            .filter((v) => Number.isFinite(v) && v > 0);
          groupStructureSignatureRef.current[categoryKey] =
            groupStructureSignature(mappedGroups);
        });
        setServerGroupIdsByCategory(nextServerIdsMap);
        setGroupsByCategory((prev) => {
          const merged = { ...prev, ...nextGroupsMap };
          if (id) saveTournamentGroups(id, merged);
          return merged;
        });
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
    if (!id || (activeTab !== "teams" && activeTab !== "overview")) return;
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    const run = async () => {
      setRegisteredPlayersLoading(true);
      setRegisteredPlayersError(null);
      try {
        const res = await fetch(`${API_URL}/events/${id}/subscriptions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body: ApiEventSubscription[] | null = await res
          .json()
          .catch(() => null);
        if (!res.ok) {
          const msg =
            (body as any)?.message?.[0] ||
            (body as any)?.error ||
            "Could not load registered players.";
          throw new Error(msg);
        }

        const list = Array.isArray(body) ? body : [];
        const players: RegisteredPlayer[] = list
          .filter(
            (item) => String(item.status ?? "").toUpperCase() === "REGISTERED",
          )
          .map((item) => ({
            id: String(item.userId ?? ""),
            name: String(item.userFullName ?? "Unnamed player"),
            email: String(item.userEmail ?? ""),
            preferredPartner:
              item.categories?.find((category) => category?.suggestedPlayer)
                ?.suggestedPlayer ?? null,
            categoryIds: Array.isArray(item.categories)
              ? item.categories
                  .map((category) => String(category?.id ?? ""))
                  .filter(Boolean)
              : [],
          }))
          .filter((item) => item.id);

        if (cancelled) return;
        setRegisteredPlayers(players);
      } catch (err) {
        if (cancelled) return;
        setRegisteredPlayersError(
          err instanceof Error
            ? err.message
            : "Could not load registered players.",
        );
        setRegisteredPlayers([]);
      } finally {
        if (!cancelled) setRegisteredPlayersLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [id, activeTab]);

  const isStructureReadyForConfig = React.useCallback(
    (cfg?: CategorySetupConfig) => {
      if (!cfg?.structureMode) return false;
      if (cfg.structureMode !== "groups_knockout") return true;
      const groupCount = Number(cfg.groupCount ?? 0);
      const teamsPerGroup = Number(cfg.teamsPerGroup ?? 0);
      const qualifiedPerGroup = Number(cfg.qualifiedPerGroup ?? 0);
      return (
        groupCount > 0 &&
        teamsPerGroup >= 4 &&
        qualifiedPerGroup > 0 &&
        qualifiedPerGroup <= teamsPerGroup
      );
    },
    [],
  );

  const getCategoryTeamEditor = React.useCallback(
    (categoryId: string): TeamEditorState =>
      teamEditorByCategory[categoryId] ?? {
        name: "",
        memberUserIds: [],
        autoNameFromMembers: true,
        editingTeamId: null,
      },
    [teamEditorByCategory],
  );

  const loadTeamsForCategory = React.useCallback(async (categoryId: string) => {
    const token = getToken();
    if (!token) return;
    const parsedCategoryId = Number(categoryId);
    if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) return;

    setTeamsLoadingByCategory((prev) => ({ ...prev, [categoryId]: true }));
    try {
      const res = await fetch(
        `${API_URL}/teams?categoryId=${encodeURIComponent(parsedCategoryId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.message?.[0] ||
            data?.error ||
            `Failed to load teams (${res.status})`,
        );
      }
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setTeamsByCategory((prev) => ({ ...prev, [categoryId]: list }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams.");
      setTeamsByCategory((prev) => ({ ...prev, [categoryId]: [] }));
    } finally {
      setTeamsLoadingByCategory((prev) => ({ ...prev, [categoryId]: false }));
    }
  }, []);

  const setCategoryTeamEditor = React.useCallback(
    (
      categoryId: string,
      updater: (current: TeamEditorState) => TeamEditorState,
    ) => {
      setTeamEditorByCategory((prev) => {
        const current: TeamEditorState = prev[categoryId] ?? {
          name: "",
          memberUserIds: [],
          autoNameFromMembers: true,
          editingTeamId: null,
        };
        return { ...prev, [categoryId]: updater(current) };
      });
    },
    [],
  );

  const saveCategoryTeam = React.useCallback(
    async (categoryId: string) => {
      const token = getToken();
      if (!token) {
        setError("You are not logged in.");
        return;
      }
      const parsedCategoryId = Number(categoryId);
      if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
        setError("Invalid category id for team.");
        return;
      }

      const editor = getCategoryTeamEditor(categoryId);
      const members = editor.memberUserIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
        .map((id) => ({ userId: id, role: "Player" }));

      if (members.length === 0) {
        setError("Select at least one player to create a team.");
        return;
      }

      const payload = {
        categoryId: parsedCategoryId,
        categoryIds: [parsedCategoryId],
        name: editor.name.trim() || undefined,
        autoNameFromMembers: editor.autoNameFromMembers,
        members,
      };

      setTeamsSubmittingByCategory((prev) => ({ ...prev, [categoryId]: true }));
      setError(null);
      try {
        const url =
          editor.editingTeamId == null
            ? `${API_URL}/teams`
            : `${API_URL}/teams/${editor.editingTeamId}`;
        const method = editor.editingTeamId == null ? "POST" : "PUT";
        const res = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            data?.message?.[0] ||
              data?.error ||
              (editor.editingTeamId == null
                ? "Failed to create team."
                : "Failed to update team."),
          );
        }
        setStatusMessage(
          editor.editingTeamId == null ? "Team created." : "Team updated.",
        );
        setCategoryTeamEditor(categoryId, () => ({
          name: "",
          memberUserIds: [],
          autoNameFromMembers: true,
          editingTeamId: null,
        }));
        await loadTeamsForCategory(categoryId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save team.");
      } finally {
        setTeamsSubmittingByCategory((prev) => ({
          ...prev,
          [categoryId]: false,
        }));
      }
    },
    [getCategoryTeamEditor, loadTeamsForCategory, setCategoryTeamEditor],
  );

  const deleteCategoryTeam = React.useCallback(async (categoryId: string, teamId: number) => {
    const token = getToken();
    if (!token) {
      setError("You are not logged in.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/teams/${teamId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message?.[0] || body?.error || "Failed to delete team.",
        );
      }
      setStatusMessage("Team deleted.");
      await loadTeamsForCategory(categoryId);
      setCategoryTeamEditor(categoryId, (current) =>
        current.editingTeamId === teamId
          ? {
              name: "",
              memberUserIds: [],
              autoNameFromMembers: true,
              editingTeamId: null,
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team.");
    }
  }, [loadTeamsForCategory, setCategoryTeamEditor]);

  React.useEffect(() => {
    if (
      (activeTab !== "teams" && activeTab !== "groups" && activeTab !== "overview") ||
      !selectedCategoryId
    ) {
      return;
    }
    void loadTeamsForCategory(selectedCategoryId);
  }, [activeTab, selectedCategoryId, loadTeamsForCategory]);

  React.useEffect(() => {
    if (categories.length === 0) return;
    setCategoryConfigs((prev) => {
      const next = { ...prev };
      categories.forEach((cat) => {
        const key = String(cat.id);
        if (!next[key]) {
          next[key] = {
            formats: [inferFormatFromCategoryName(cat.name)],
            structureMode: "",
            bracketMatches: [],
          };
        } else if (!next[key].formats || next[key].formats.length === 0) {
          next[key] = {
            ...next[key],
            formats: [inferFormatFromCategoryName(cat.name)],
          };
        }
      });
      return next;
    });
  }, [categories]);

  const selectedCategory =
    categories.find((c) => c.id === selectedCategoryId) ?? null;
  const selectedCategoryLevel =
    extractLevelFromCategoryName(selectedCategory?.name) ?? "Other";
  const selectedCategoryDisplayName = selectedCategory
    ? stripLevelPrefixFromCategoryName(
        selectedCategory.name,
        selectedCategoryLevel,
      )
    : "";
  const selectedConfig = selectedCategory
    ? (categoryConfigs[selectedCategory.id] ?? {
        formats: [],
        structureMode: "",
      })
    : undefined;
  const requiresGroupStructure =
    selectedConfig?.structureMode === "groups_knockout";
  const hasGroupStructureConfig = Boolean(
    selectedConfig &&
    (selectedConfig.groupCount ?? 0) > 0 &&
    (selectedConfig.teamsPerGroup ?? 0) >= 4 &&
    (selectedConfig.qualifiedPerGroup ?? 0) > 0 &&
    (selectedConfig.qualifiedPerGroup ?? 0) <=
      (selectedConfig.teamsPerGroup ?? 0),
  );
  const canSaveSelectedCategorySetup = Boolean(
    selectedCategory &&
    selectedConfig &&
    selectedConfig.structureMode &&
    (!requiresGroupStructure || hasGroupStructureConfig),
  );
  const selectedFormat = inferFormatFromCategoryName(selectedCategory?.name);
  const selectedEntryLabel = entryLabelFromFormat(selectedFormat);
  const selectedCategoryTeamsForTab = selectedCategory
    ? (teamsByCategory[selectedCategory.id] ?? [])
    : [];
  const selectedCategoryPlayersForTab = selectedCategory
    ? registeredPlayers.filter((player) =>
        player.categoryIds.includes(selectedCategory.id),
      )
    : [];
  const assignedUserIdsForTeamsTab = new Set(
    selectedCategoryTeamsForTab.flatMap((team) =>
      (team.members ?? []).map((member) => String(member.userId)),
    ),
  );
  const unassignedPlayersCountForTeamsTab = selectedCategoryPlayersForTab.filter(
    (player) => !assignedUserIdsForTeamsTab.has(player.id),
  ).length;
  const showTeamsTabContinueWarning = Boolean(
    pendingContinueWarningByCategory[selectedCategoryId],
  );
  const categoriesOverview = React.useMemo(
    () => {
      const dedupedMixed = new Map<
        string,
        {
          id: string;
          name: string;
          format: TournamentFormat;
          structure: string;
          hasGroups: boolean;
          hasBracket: boolean;
        }
      >();
      const regular: Array<{
        id: string;
        name: string;
        format: TournamentFormat;
        structure: string;
        hasGroups: boolean;
        hasBracket: boolean;
      }> = [];

      categories.forEach((cat) => {
        const cfg = categoryConfigs[cat.id];
        const groups = groupsByCategory[cat.id] ?? [];
        const hasGroups =
          groups.length > 0 &&
          groups.some((g) =>
            g.participants.some((p) => String(p).trim().length > 0),
          );
        const hasBracket = (cfg?.bracketMatches?.length ?? 0) > 0;
        const format = inferFormatFromCategoryName(cat.name);
        const isMixed =
          String(cat.discipline ?? "")
            .toLowerCase()
            .includes("mixed") || String(cat.name ?? "").toLowerCase().includes("mixed");
        if (isMixed) {
          const level = extractLevelFromCategoryName(cat.name) ?? "Open";
          const key = `mixed::${level.toLowerCase()}`;
          const previous = dedupedMixed.get(key);
          if (!previous) {
            dedupedMixed.set(key, {
              id: cat.id,
              name: `${level} - Mixed`,
              format,
              structure: cfg?.structureMode ?? "",
              hasGroups,
              hasBracket,
            });
          } else {
            dedupedMixed.set(key, {
              ...previous,
              structure: previous.structure || (cfg?.structureMode ?? ""),
              hasGroups: previous.hasGroups || hasGroups,
              hasBracket: previous.hasBracket || hasBracket,
            });
          }
          return;
        }
        regular.push({
          id: cat.id,
          name: cat.name,
          format,
          structure: cfg?.structureMode ?? "",
          hasGroups,
          hasBracket,
        });
      });

      return [...regular, ...Array.from(dedupedMixed.values())];
    },
    [categories, categoryConfigs, groupsByCategory],
  );
  const groupedCategoriesOverview = React.useMemo(() => {
    const levelOrder = ["Advanced", "Intermediate", "Beginner", "Open", "Other"];
    const byLevel = new Map<string, typeof categoriesOverview>();
    categoriesOverview.forEach((item) => {
      const level = extractLevelFromCategoryName(item.name) ?? "Other";
      const current = byLevel.get(level) ?? [];
      byLevel.set(level, [...current, item]);
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
  }, [categoriesOverview]);

  const saveSetup = () => {
    if (!id) return;
    saveTournamentSetup(id, {
      formats: [],
      structureMode: "groups_knockout",
      categories,
      categoryConfigs,
    });
    setStatusMessage("Category setup saved.");
  };

  const applyStructureToAllCategoriesFrom = (categoryId: string) => {
    const source = categoryConfigs[categoryId];
    const selectedStructure = source?.structureMode;
    if (!selectedStructure) return;
    const confirmed = window.confirm(
      `Apply "${selectedStructure}" structure to all ${categories.length} categories?`,
    );
    if (!confirmed) return;
    setCategoryConfigs((prev) => {
      const next = { ...prev };
      categories.forEach((cat) => {
        next[cat.id] = {
          ...(next[cat.id] ?? {
            formats: [inferFormatFromCategoryName(cat.name)],
            structureMode: "",
          }),
          structureMode: selectedStructure,
        };
      });
      return next;
    });
    setConfirmedStructureByCategory({});
    setOverviewStepByCategory({});
    setStatusMessage(`Applied ${selectedStructure} structure to all categories.`);
  };

  const applyGroupInputsToAllCategoriesFrom = (categoryId: string) => {
    const source = categoryConfigs[categoryId];
    if (!source || source.structureMode !== "groups_knockout") return;
    const groupCount = Number(source.groupCount ?? 0);
    const teamsPerGroup = Number(source.teamsPerGroup ?? 0);
    const qualifiedPerGroup = Number(source.qualifiedPerGroup ?? 0);
    if (
      groupCount <= 0 ||
      teamsPerGroup < 4 ||
      qualifiedPerGroup <= 0 ||
      qualifiedPerGroup > teamsPerGroup
    ) {
      setError(
        "Invalid group inputs. Use: groups > 0, teams/group >= 4, qualified between 1 and teams/group.",
      );
      return;
    }
    const confirmed = window.confirm(
      `Apply group inputs (${groupCount} groups, ${teamsPerGroup} teams/group, ${qualifiedPerGroup} qualified/group) to all categories?`,
    );
    if (!confirmed) return;
    setCategoryConfigs((prev) => {
      const next = { ...prev };
      categories.forEach((cat) => {
        next[cat.id] = {
          ...(next[cat.id] ?? {
            formats: [inferFormatFromCategoryName(cat.name)],
            structureMode: "groups_knockout",
          }),
          structureMode: "groups_knockout",
          groupCount,
          teamsPerGroup,
          qualifiedPerGroup,
        };
      });
      return next;
    });
    setConfirmedStructureByCategory({});
    setOverviewStepByCategory({});
    setError(null);
    setStatusMessage("Applied group inputs to all categories.");
  };

  const generateGroupsAndBracketForSelectedCategory = () => {
    if (!selectedCategory || !selectedConfig) return;
    const groupCount = Number(selectedConfig.groupCount ?? 0);
    const teamsPerGroup = Number(selectedConfig.teamsPerGroup ?? 0);
    const qualifiedPerGroup = Number(selectedConfig.qualifiedPerGroup ?? 0);
    if (
      groupCount <= 0 ||
      teamsPerGroup < 4 ||
      qualifiedPerGroup <= 0 ||
      qualifiedPerGroup > teamsPerGroup
    ) {
      setError(
        "Invalid structure. Use: groups > 0, teams/group >= 4, qualified between 1 and teams/group.",
      );
      return;
    }

    const existingTeams =
      groupsByCategory[selectedCategory.id]?.flatMap((g) =>
        (g.participants ?? []).map((p: string) => p.trim()).filter(Boolean),
      ) ?? [];
    const uniqueTeams = Array.from(new Set(existingTeams));

    const generatedGroups = generateGroupsSkeleton(
      groupCount,
      teamsPerGroup,
      uniqueTeams,
    ).map((group, idx) => {
      const existingGroupId = Number(
        groupsByCategory[selectedCategory.id]?.[idx]?.id,
      );
      return {
        ...group,
        id:
          Number.isFinite(existingGroupId) && existingGroupId > 0
            ? String(existingGroupId)
            : `g_${selectedCategory.id}_${idx + 1}`,
        name: `Group ${groupLetter(idx)}`,
      };
    });
    const bracketMatches = generateBracketSkeleton(
      groupCount,
      qualifiedPerGroup,
    );

    persistGroups({
      ...groupsByCategory,
      [selectedCategory.id]: generatedGroups,
    });
    setCategoryConfigs((prev) => ({
      ...prev,
      [selectedCategory.id]: {
        ...selectedConfig,
        bracketMatches,
      },
    }));
    setError(null);
    setStatusMessage(`Generated ${groupCount} groups and bracket structure.`);
  };

  const generateGroupsAndBracketForCategory = React.useCallback(
    (categoryId: string, seedTeams: string[] = []) => {
      const cfg = categoryConfigs[categoryId];
      if (!cfg) return false;
      const groupCount = Number(cfg.groupCount ?? 0);
      const teamsPerGroup = Number(cfg.teamsPerGroup ?? 0);
      const qualifiedPerGroup = Number(cfg.qualifiedPerGroup ?? 0);
      if (
        groupCount <= 0 ||
        teamsPerGroup < 4 ||
        qualifiedPerGroup <= 0 ||
        qualifiedPerGroup > teamsPerGroup
      ) {
        setError(
          "Invalid structure. Use: groups > 0, teams/group >= 4, qualified between 1 and teams/group.",
        );
        return false;
      }

      const existingTeams =
        groupsByCategory[categoryId]?.flatMap((g) =>
          (g.participants ?? []).map((p: string) => p.trim()).filter(Boolean),
        ) ?? [];
      const uniqueTeams = Array.from(
        new Set(
          [...existingTeams, ...seedTeams]
            .map((t) => String(t).trim())
            .filter(Boolean),
        ),
      );

      const generatedGroups = generateGroupsSkeleton(
        groupCount,
        teamsPerGroup,
        uniqueTeams,
      ).map((group, idx) => {
        const existingGroupId = Number(groupsByCategory[categoryId]?.[idx]?.id);
        return {
          ...group,
          id:
            Number.isFinite(existingGroupId) && existingGroupId > 0
              ? String(existingGroupId)
              : `g_${categoryId}_${idx + 1}`,
          name: `Group ${groupLetter(idx)}`,
        };
      });
      const bracketMatches = generateBracketSkeleton(
        groupCount,
        qualifiedPerGroup,
      );

      persistGroups({
        ...groupsByCategory,
        [categoryId]: generatedGroups,
      });
      setCategoryConfigs((prev) => ({
        ...prev,
        [categoryId]: {
          ...cfg,
          bracketMatches,
        },
      }));
      setError(null);
      return true;
    },
    [categoryConfigs, groupsByCategory],
  );

  const persistGroups = (next: Record<string, GroupBucket[]>) => {
    setGroupsByCategory(next);
    if (!id) return;
    saveTournamentGroups(id, next);
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
            {/* Left: Trophy Icon + Tournament Info */}
            <Stack direction="row" spacing={2} sx={{ flex: 1 }}>
              {/* Trophy Icon */}
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
                <EmojiEventsRoundedIcon
                  sx={{ fontSize: 32, color: "#FFFFFF" }}
                />
              </Box>

              {/* Tournament Name + Details */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Title + Managing Badge */}
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Typography
                    sx={{
                      fontSize: "1.875rem",
                      fontWeight: 700,
                      color: "#FFFFFF",
                      lineHeight: 1.2,
                    }}
                  >
                    {event?.name || "Tournament Setup"}
                  </Typography>
                  <Chip
                    label="MANAGING"
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

                {/* Location + Date Row */}
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ color: "#FFF7ED" }}
                >
                  {/* Location */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LocationOnOutlinedIcon
                      sx={{ fontSize: 16, color: "#FFF7ED" }}
                    />
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#FFF7ED",
                      }}
                    >
                      {event?.locationName || "Location TBD"}
                    </Typography>
                  </Stack>

                  {/* Date */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarMonthOutlinedIcon
                      sx={{ fontSize: 16, color: "#FFF7ED" }}
                    />
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#FFF7ED",
                      }}
                    >
                      {event?.startDate
                        ? new Date(event.startDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            },
                          )
                        : "Date TBD"}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            </Stack>

            {/* Right: Stats Cards */}
            <Stack direction="row" spacing={1.5}>
              {/* Registered */}
              <Box
                sx={{
                  width: 95,
                  height: 74,
                  borderRadius: "14px",
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  px: 2,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    lineHeight: 1,
                    mb: 0.5,
                  }}
                >
                  0
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: "#FFEDD4",
                    textAlign: "center",
                  }}
                >
                  Registered
                </Typography>
              </Box>

              {/* Categories */}
              <Box
                sx={{
                  width: 95,
                  height: 74,
                  borderRadius: "14px",
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  px: 2,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    lineHeight: 1,
                    mb: 0.5,
                  }}
                >
                  {categories.length}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: "#FFEDD4",
                    textAlign: "center",
                  }}
                >
                  Categories
                </Typography>
              </Box>

              {/* Complete % */}
              <Box
                sx={{
                  width: 95,
                  height: 74,
                  borderRadius: "14px",
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  px: 2,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    lineHeight: 1,
                    mb: 0.5,
                  }}
                >
                  {categories.length > 0
                    ? Math.round(
                        (categoriesOverview.filter(
                          (c) => c.format && c.structure && c.hasGroups,
                        ).length /
                          categories.length) *
                          100,
                      )
                    : 0}
                  %
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: "#FFEDD4",
                    textAlign: "center",
                  }}
                >
                  Complete
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Box>

        {/* Tabs Navigation - Integrated with Hero */}
        <Box
          sx={{
            mb: 2,
            borderRadius: "0 0 14px 14px",
            overflow: "hidden",
            bgcolor: "#F9FAFB",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, value: SetupTab) => {
              setError(null);
              setActiveTab(value);
            }}
            sx={{
              minHeight: 56,
              "& .MuiTabs-indicator": {
                height: 2,
                bgcolor: "#8B5CF6",
              },
              "& .MuiTab-root": {
                fontWeight: 600,
                textTransform: "none",
                fontSize: "1rem",
                minHeight: 56,
                color: "#4A5565",
                "&.Mui-selected": {
                  color: "#8B5CF6",
                  bgcolor: "white",
                },
              },
            }}
          >
            <Tab value="overview" label="Overview" />
            <Tab value="categories" label="Structure" />
            <Tab value="teams" label="Teams" />
            <Tab value="groups" label="Groups & Brackets" />
          </Tabs>
        </Box>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        {statusMessage ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {statusMessage}
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
            {activeTab === "overview" ? (
                <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      mb: 2,
                      p: 2,
                      borderRadius: "14px",
                      bgcolor: "#F9FAFB",
                      border: "1px solid #E5E7EB",
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                        mb: 1,
                        color: "#101828",
                        fontSize: "1.05rem",
                      }}
                    >
                      How to proceed
                    </Typography>
                    <Stack spacing={0.75}>
                      <Typography sx={{ color: "#4A5565", fontSize: "0.9rem" }}>
                        1. Choose a category from the list below.
                      </Typography>
                      <Typography sx={{ color: "#4A5565", fontSize: "0.9rem" }}>
                        2. Open the category page to configure its setup.
                      </Typography>
                      <Typography sx={{ color: "#4A5565", fontSize: "0.9rem" }}>
                        3. Complete Structure, Teams, then Groups & Brackets.
                      </Typography>
                      <Typography sx={{ color: "#4A5565", fontSize: "0.9rem" }}>
                        4. Return here and continue with the next category.
                      </Typography>
                    </Stack>
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  {/* Category List */}
                  <Typography
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: "#101828",
                      fontSize: "1.25rem",
                    }}
                  >
                    Category List
                  </Typography>
                  <Stack spacing={2}>
                    {groupedCategoriesOverview.map((section) => (
                      <Box key={`level-${section.level}`}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            color: "#6A7282",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                            mb: 1,
                          }}
                        >
                          {section.level}
                        </Typography>
                        <Stack spacing={1.5}>
                          {section.items.map((item) => (
                            <Box
                              key={item.id}
                              sx={{
                                p: 2,
                                borderRadius: "14px",
                                border: "1px solid #E5E7EB",
                                bgcolor: "white",
                                display: "flex",
                                flexDirection: { xs: "column", md: "row" },
                                alignItems: { md: "center" },
                                gap: 2,
                                transition: "all 120ms ease",
                                cursor: "pointer",
                                "&:hover": {
                                  borderColor: "#8B5CF6",
                                  boxShadow: "0 2px 8px rgba(139,92,246,0.1)",
                                },
                              }}
                              onClick={() => {
                                setSelectedCategoryId(item.id);
                                setExpandedOverviewCategoryId(null);
                                setActiveTab("categories");
                              }}
                            >
                              <Stack spacing={1.5} sx={{ width: "100%" }}>
                                <Stack
                                  direction={{ xs: "column", md: "row" }}
                                  alignItems={{ xs: "flex-start", md: "center" }}
                                  justifyContent="space-between"
                                  spacing={1.5}
                                  sx={{ width: "100%" }}
                                >
                                  {/* Trophy Icon + Category Name */}
                                  <Stack
                                    direction="row"
                                    spacing={2}
                                    alignItems="center"
                                    sx={{ minWidth: 0 }}
                                  >
                                    <Box
                                      sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: "10px",
                                        bgcolor: "#FFEDD4",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                      }}
                                    >
                                      <EmojiEventsRoundedIcon
                                        sx={{ fontSize: 20, color: "#F54900" }}
                                      />
                                    </Box>
                                    <Typography
                                      sx={{
                                        fontWeight: 700,
                                        fontSize: "1.125rem",
                                        color: "#101828",
                                      }}
                                    >
                                      {stripLevelPrefixFromCategoryName(
                                        item.name,
                                        section.level,
                                      )}
                                    </Typography>
                                  </Stack>

                                  {/* Status Badges + Expand Icon */}
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    useFlexGap
                                    flexWrap="wrap"
                                    alignItems="center"
                                    sx={{ justifyContent: { md: "flex-end" } }}
                                  >
                                    <Chip
                                      size="medium"
                                      label={
                                        item.format
                                          ? `Format: ${item.format}`
                                          : "Format: Pending"
                                      }
                                      sx={{
                                        bgcolor: item.format ? "#8B5CF6" : "#E5E7EB",
                                        color: item.format ? "white" : "#4A5565",
                                        fontWeight: 700,
                                        border: "none",
                                        fontSize: "0.75rem",
                                        height: 32,
                                        borderRadius: "10px",
                                        px: 2,
                                      }}
                                    />
                                    <Chip
                                      size="medium"
                                      label={
                                        item.structure
                                          ? "Structure: Set"
                                          : "Structure: Pending"
                                      }
                                      sx={{
                                        bgcolor: item.structure ? "#8B5CF6" : "#E5E7EB",
                                        color: item.structure ? "white" : "#4A5565",
                                        fontWeight: 700,
                                        border: "none",
                                        fontSize: "0.75rem",
                                        height: 32,
                                        borderRadius: "10px",
                                        px: 2,
                                      }}
                                    />
                                    <Chip
                                      size="medium"
                                      label={
                                        item.hasGroups
                                          ? "Groups: Created"
                                          : "Groups: Pending"
                                      }
                                      sx={{
                                        bgcolor: item.hasGroups ? "#8B5CF6" : "#E5E7EB",
                                        color: item.hasGroups ? "white" : "#4A5565",
                                        fontWeight: 700,
                                        border: "none",
                                        fontSize: "0.75rem",
                                        height: 32,
                                        borderRadius: "10px",
                                        px: 2,
                                      }}
                                    />
                                    <Chip
                                      size="medium"
                                      label={
                                        item.hasBracket
                                          ? "Bracket: Created"
                                          : "Bracket: Pending"
                                      }
                                      sx={{
                                        bgcolor: item.hasBracket ? "#8B5CF6" : "#E5E7EB",
                                        color: item.hasBracket ? "white" : "#4A5565",
                                        fontWeight: 700,
                                        border: "none",
                                        fontSize: "0.75rem",
                                        height: 32,
                                        borderRadius: "10px",
                                        px: 2,
                                      }}
                                    />

                                    <IconButton
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCategoryId(item.id);
                                        setExpandedOverviewCategoryId(null);
                                        setActiveTab("categories");
                                      }}
                                      sx={{
                                        border: "1px solid #D1D5DC",
                                        borderRadius: "10px",
                                        width: 36,
                                        height: 36,
                                        color: "#4A5565",
                                        bgcolor: "#FFFFFF",
                                      }}
                                    >
                                      <NavigateNextRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                </Stack>

                              <Collapse
                                in={expandedOverviewCategoryId === item.id}
                                timeout="auto"
                                unmountOnExit
                                sx={{ width: "100%" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Divider sx={{ my: 2 }} />
                                {(() => {
                                  const inlineConfig =
                                    categoryConfigs[item.id] ?? {
                                      formats: [item.format],
                                      structureMode: "",
                                    };
                                  const isInlineStructureReady =
                                    isStructureReadyForConfig(inlineConfig);
                                  const isInlineStructureConfirmed = Boolean(
                                    confirmedStructureByCategory[item.id],
                                  );
                                  const showInlineTeams =
                                    isInlineStructureConfirmed &&
                                    overviewStepByCategory[item.id] === "teams";
                                  const showInlineDrawing =
                                    isInlineStructureConfirmed &&
                                    overviewStepByCategory[item.id] ===
                                      "groups";
                                  const currentFlowStep =
                                    overviewStepByCategory[item.id] ?? "structure";
                                  const relevantPlayers = registeredPlayers.filter(
                                    (player) => player.categoryIds.includes(item.id),
                                  );
                                  const inlineTeams = teamsByCategory[item.id] ?? [];
                                  const inlineTeamsLoading = Boolean(
                                    teamsLoadingByCategory[item.id],
                                  );
                                  const inlineTeamsSubmitting = Boolean(
                                    teamsSubmittingByCategory[item.id],
                                  );
                                  const teamEditor = getCategoryTeamEditor(item.id);
                                  const assignedUserIds = new Set(
                                    inlineTeams
                                      .filter(
                                        (team) =>
                                          team.id !== teamEditor.editingTeamId,
                                      )
                                      .flatMap((team) =>
                                        (team.members ?? []).map((member) =>
                                          String(member.userId),
                                        ),
                                      ),
                                  );
                                  const selectablePlayers = relevantPlayers.filter(
                                    (player) =>
                                      !assignedUserIds.has(player.id) ||
                                      teamEditor.memberUserIds.includes(player.id),
                                  );
                                  const assignedUserIdsForProgress = new Set(
                                    inlineTeams.flatMap((team) =>
                                      (team.members ?? []).map((member) =>
                                        String(member.userId),
                                      ),
                                    ),
                                  );
                                  const inlineGroups =
                                    groupsByCategory[item.id] ?? [];
                                  const assignedTeamIdsInGroups = new Set(
                                    inlineGroups.flatMap((group) =>
                                      (group.participants ?? [])
                                        .map((p) => Number(String(p).trim()))
                                        .filter(
                                          (teamId) =>
                                            Number.isFinite(teamId) &&
                                            teamId > 0,
                                        )
                                        .map((teamId) => String(teamId))
                                        .filter(Boolean),
                                    ),
                                  );
                                  const unassignedTeamsForDrawing = inlineTeams.filter(
                                    (team) =>
                                      !assignedTeamIdsInGroups.has(String(team.id)),
                                  );
                                  const unassignedPlayersCount = relevantPlayers.filter(
                                    (player) =>
                                      !assignedUserIdsForProgress.has(player.id),
                                  ).length;
                                  const showContinueWarning = Boolean(
                                    pendingContinueWarningByCategory[item.id],
                                  );
                                  return (
                                    <Stack spacing={1.5}>
                                      {currentFlowStep === "structure" ? (
                                        <>
                                          <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                            alignItems="center"
                                          >
                                            <Typography
                                              variant="body2"
                                              sx={{ fontWeight: 800 }}
                                            >
                                              Structure
                                            </Typography>
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              onClick={() =>
                                                applyStructureToAllCategoriesFrom(
                                                  item.id,
                                                )
                                              }
                                              disabled={!inlineConfig.structureMode}
                                              sx={{ borderRadius: 999 }}
                                            >
                                              Apply structure to all
                                            </Button>
                                          </Stack>
                                          <Stack
                                            direction={{ xs: "column", md: "row" }}
                                            spacing={1}
                                            useFlexGap
                                            flexWrap="wrap"
                                          >
                                            {STRUCTURE_OPTIONS.map((opt) => {
                                              const isSelected =
                                                inlineConfig.structureMode === opt.id;
                                              return (
                                                <Card
                                                  key={`${item.id}-${opt.id}`}
                                                  onClick={() => {
                                                    setCategoryConfigs((prev) => ({
                                                      ...prev,
                                                      [item.id]: {
                                                        ...inlineConfig,
                                                        structureMode: opt.id,
                                                      },
                                                    }));
                                                    setConfirmedStructureByCategory(
                                                      (prev) => ({
                                                        ...prev,
                                                        [item.id]: false,
                                                      }),
                                                    );
                                                    setOverviewStepByCategory(
                                                      (prev) => ({
                                                        ...prev,
                                                        [item.id]: "structure",
                                                      }),
                                                    );
                                                  }}
                                                  sx={{
                                                    cursor: "pointer",
                                                    width: {
                                                      xs: "100%",
                                                      md: "calc(50% - 4px)",
                                                    },
                                                    borderRadius: 2,
                                                    border: "1px solid",
                                                    borderColor: isSelected
                                                      ? "rgba(139,92,246,0.45)"
                                                      : "rgba(15,23,42,0.10)",
                                                    bgcolor: isSelected
                                                      ? "rgba(139,92,246,0.08)"
                                                      : "background.paper",
                                                  }}
                                                >
                                                  <CardContent sx={{ p: 1.25 }}>
                                                    <Typography
                                                      sx={{ fontWeight: 800 }}
                                                    >
                                                      {opt.title}
                                                    </Typography>
                                                    <Typography
                                                      variant="body2"
                                                      color="text.secondary"
                                                    >
                                                      {opt.subtitle}
                                                    </Typography>
                                                  </CardContent>
                                                </Card>
                                              );
                                            })}
                                          </Stack>

                                          {inlineConfig.structureMode ===
                                          "groups_knockout" ? (
                                            <>
                                              <Stack
                                                direction="row"
                                                justifyContent="space-between"
                                                alignItems="center"
                                              >
                                                <Typography
                                                  variant="body2"
                                                  sx={{ fontWeight: 800 }}
                                                >
                                                  Group Inputs
                                                </Typography>
                                                <Button
                                                  size="small"
                                                  variant="outlined"
                                                  onClick={() =>
                                                    applyGroupInputsToAllCategoriesFrom(
                                                      item.id,
                                                    )
                                                  }
                                                  sx={{ borderRadius: 999 }}
                                                >
                                                  Apply group inputs to all
                                                </Button>
                                              </Stack>
                                              <Stack
                                                direction={{
                                                  xs: "column",
                                                  md: "row",
                                                }}
                                                spacing={1.25}
                                              >
                                                <TextField
                                                  label="Number of groups"
                                                  type="number"
                                                  value={
                                                    inlineConfig.groupCount ?? ""
                                                  }
                                                  onChange={(e) => {
                                                    setCategoryConfigs((prev) => ({
                                                      ...prev,
                                                      [item.id]: {
                                                        ...inlineConfig,
                                                        groupCount: Math.max(
                                                          1,
                                                          Number(
                                                            e.target.value || 0,
                                                          ),
                                                        ),
                                                      },
                                                    }));
                                                    setConfirmedStructureByCategory(
                                                      (prev) => ({
                                                        ...prev,
                                                        [item.id]: false,
                                                      }),
                                                    );
                                                    setOverviewStepByCategory(
                                                      (prev) => ({
                                                        ...prev,
                                                        [item.id]: "structure",
                                                      }),
                                                    );
                                                  }}
                                                  fullWidth
                                                />
                                                <TextField
                                                  label="Teams per group (min 4)"
                                                  type="number"
                                                  value={
                                                    inlineConfig.teamsPerGroup ?? ""
                                                  }
                                                  onChange={(e) => {
                                                    setCategoryConfigs((prev) => ({
                                                      ...prev,
                                                      [item.id]: {
                                                        ...inlineConfig,
                                                        teamsPerGroup: Math.max(
                                                          4,
                                                          Number(
                                                            e.target.value || 0,
                                                          ),
                                                        ),
                                                      },
                                                    }));
                                                    setConfirmedStructureByCategory(
                                                      (prev) => ({
                                                        ...prev,
                                                        [item.id]: false,
                                                      }),
                                                    );
                                                    setOverviewStepByCategory(
                                                      (prev) => ({
                                                        ...prev,
                                                        [item.id]: "structure",
                                                      }),
                                                    );
                                                  }}
                                                  fullWidth
                                                />
                                                <TextField
                                                  label="Qualified per group"
                                                  type="number"
                                                  value={
                                                    inlineConfig.qualifiedPerGroup ??
                                                    ""
                                                  }
                                                  onChange={(e) => {
                                                    setCategoryConfigs((prev) => ({
                                                      ...prev,
                                                      [item.id]: {
                                                        ...inlineConfig,
                                                        qualifiedPerGroup: Math.max(
                                                          1,
                                                          Number(
                                                            e.target.value || 0,
                                                          ),
                                                        ),
                                                      },
                                                    }));
                                                    setConfirmedStructureByCategory(
                                                      (prev) => ({
                                                        ...prev,
                                                        [item.id]: false,
                                                      }),
                                                    );
                                                    setOverviewStepByCategory(
                                                      (prev) => ({
                                                        ...prev,
                                                        [item.id]: "structure",
                                                      }),
                                                    );
                                                  }}
                                                  fullWidth
                                                />
                                              </Stack>
                                            </>
                                          ) : null}

                                          <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            spacing={1}
                                            justifyContent="flex-end"
                                          >
                                            <Button
                                              variant="contained"
                                              disabled={!isInlineStructureReady}
                                              onClick={() => {
                                                setConfirmedStructureByCategory(
                                                  (prev) => ({
                                                    ...prev,
                                                    [item.id]: true,
                                                  }),
                                                );
                                                setOverviewStepByCategory(
                                                  (prev) => ({
                                                    ...prev,
                                                    [item.id]: "structure",
                                                  }),
                                                );
                                                setStatusMessage(
                                                  `Structure confirmed for ${item.name}.`,
                                                );
                                              }}
                                            >
                                              Confirm structure
                                            </Button>
                                            <Button
                                              variant="outlined"
                                              disabled={!isInlineStructureConfirmed}
                                              onClick={() => {
                                                setOverviewStepByCategory(
                                                  (prev) => ({
                                                    ...prev,
                                                    [item.id]: "teams",
                                                  }),
                                                );
                                                void loadTeamsForCategory(item.id);
                                                window.setTimeout(() => {
                                                  document
                                                    .getElementById(
                                                      `overview-flow-panel-${item.id}`,
                                                    )
                                                    ?.scrollIntoView({
                                                      behavior: "smooth",
                                                      block: "nearest",
                                                    });
                                                }, 120);
                                              }}
                                            >
                                              Next
                                            </Button>
                                          </Stack>
                                        </>
                                      ) : null}

                                      <Slide
                                        in={showInlineTeams}
                                        direction="left"
                                        mountOnEnter
                                        unmountOnExit
                                        timeout={220}
                                      >
                                        <Box
                                          id={`overview-flow-panel-${item.id}`}
                                          sx={{
                                            p: 2,
                                            borderRadius: "12px",
                                            border: "1px solid #D1D5DC",
                                            bgcolor: "#F9FAFB",
                                          }}
                                        >
                                          <Alert
                                            severity="info"
                                            sx={{
                                              mb: 2,
                                              bgcolor: "#EFF6FF",
                                              border: "1px solid #BEDBFF",
                                              borderRadius: "14px",
                                              "& .MuiAlert-icon": {
                                                color: "#155DFC",
                                              },
                                            }}
                                          >
                                            <Typography
                                              sx={{
                                                fontWeight: 500,
                                                color: "#1C398E",
                                                fontSize: "0.875rem",
                                              }}
                                            >
                                              Create teams from registered players.
                                              Team size depends on format: Singles
                                              (1), Doubles (2), Teams (3+).
                                            </Typography>
                                          </Alert>

                                          <Stack
                                            direction={{ xs: "column", lg: "row" }}
                                            spacing={3}
                                          >
                                            <Box sx={{ flex: 1 }}>
                                              <Stack
                                                direction="row"
                                                justifyContent="space-between"
                                                alignItems="center"
                                                sx={{ mb: 2 }}
                                              >
                                                <Typography
                                                  sx={{
                                                    fontWeight: 700,
                                                    fontSize: "1.125rem",
                                                    color: "#101828",
                                                  }}
                                                >
                                                  Created Teams
                                                </Typography>
                                                <Typography
                                                  sx={{
                                                    fontWeight: 600,
                                                    fontSize: "0.875rem",
                                                    color: "#8B5CF6",
                                                  }}
                                                >
                                                  {inlineTeamsLoading
                                                    ? "Loading..."
                                                    : `${inlineTeams.length} teams`}
                                                </Typography>
                                              </Stack>
                                              <Box
                                                sx={{
                                                  p: 2,
                                                  bgcolor: "white",
                                                  border: "1px solid #E5E7EB",
                                                  borderRadius: "10px",
                                                }}
                                              >
                                                <Typography
                                                  sx={{
                                                    color: "#6A7282",
                                                    fontSize: "0.875rem",
                                                  }}
                                                >
                                                  {inlineTeamsLoading
                                                    ? "Loading teams..."
                                                    : inlineTeams.length === 0
                                                      ? "No teams created yet for this category."
                                                      : ""}
                                                </Typography>
                                                {inlineTeams.length > 0 ? (
                                                  <Stack spacing={1} sx={{ mt: 1 }}>
                                                    {inlineTeams.map((team) => (
                                                      <Box
                                                        key={`inline-team-${item.id}-${team.id}`}
                                                        sx={{
                                                          p: 1.25,
                                                          borderRadius: "10px",
                                                          border:
                                                            "1px solid #E5E7EB",
                                                          bgcolor: "#FFFFFF",
                                                        }}
                                                      >
                                                        <Stack
                                                          direction="row"
                                                          justifyContent="space-between"
                                                          alignItems="center"
                                                          sx={{ mb: 0.5 }}
                                                        >
                                                          <Typography
                                                            sx={{
                                                              fontWeight: 700,
                                                              color: "#101828",
                                                              fontSize: "0.9rem",
                                                            }}
                                                          >
                                                            {team.name || `Team #${team.id}`}
                                                          </Typography>
                                                          <Stack
                                                            direction="row"
                                                            spacing={0.75}
                                                          >
                                                            <Button
                                                              size="small"
                                                              variant="outlined"
                                                              onClick={() =>
                                                                setCategoryTeamEditor(
                                                                  item.id,
                                                                  () => ({
                                                                    name:
                                                                      team.name ??
                                                                      "",
                                                                    memberUserIds:
                                                                      (
                                                                        team.members ??
                                                                        []
                                                                      ).map((m) =>
                                                                        String(
                                                                          m.userId,
                                                                        ),
                                                                      ),
                                                                    autoNameFromMembers:
                                                                      Boolean(
                                                                        team.autoNameFromMembers,
                                                                      ),
                                                                    editingTeamId:
                                                                      team.id,
                                                                  }),
                                                                )
                                                              }
                                                            >
                                                              Edit
                                                            </Button>
                                                            <Button
                                                              size="small"
                                                              color="error"
                                                              variant="outlined"
                                                              onClick={() =>
                                                                void deleteCategoryTeam(
                                                                  item.id,
                                                                  team.id,
                                                                )
                                                              }
                                                            >
                                                              Delete
                                                            </Button>
                                                          </Stack>
                                                        </Stack>
                                                        <Typography
                                                          sx={{
                                                            color: "#6A7282",
                                                            fontSize: "0.75rem",
                                                          }}
                                                        >
                                                          Members:{" "}
                                                          {team.members?.length ??
                                                            0}
                                                        </Typography>
                                                      </Box>
                                                    ))}
                                                  </Stack>
                                                ) : null}
                                              </Box>
                                            </Box>

                                            <Box sx={{ flex: 1 }}>
                                              <Stack
                                                direction="row"
                                                justifyContent="space-between"
                                                alignItems="center"
                                                sx={{ mb: 2 }}
                                              >
                                                <Typography
                                                  sx={{
                                                    fontWeight: 700,
                                                    fontSize: "1.125rem",
                                                    color: "#101828",
                                                  }}
                                                >
                                                  Available Players
                                                </Typography>
                                              </Stack>
                                              <Box
                                                sx={{
                                                  p: 2.5,
                                                  bgcolor: "white",
                                                  border: "1px solid #E5E7EB",
                                                  borderRadius: "10px",
                                                  mb: 2,
                                                }}
                                              >
                                                <Typography
                                                  sx={{
                                                    fontWeight: 700,
                                                    fontSize: "1rem",
                                                    color: "#101828",
                                                    mb: 2,
                                                  }}
                                                >
                                                  New Team
                                                </Typography>
                                                <Box sx={{ mb: 2 }}>
                                                  <Typography
                                                    sx={{
                                                      fontSize: "0.875rem",
                                                      fontWeight: 500,
                                                      color: "#364153",
                                                      mb: 0.5,
                                                    }}
                                                  >
                                                    Team Name
                                                  </Typography>
                                                  <TextField
                                                    fullWidth
                                                    placeholder="Enter team name..."
                                                    size="small"
                                                    value={teamEditor.name}
                                                    onChange={(e) =>
                                                      setCategoryTeamEditor(
                                                        item.id,
                                                        (current) => ({
                                                          ...current,
                                                          name: e.target.value,
                                                        }),
                                                      )
                                                    }
                                                    sx={{
                                                      "& .MuiOutlinedInput-root": {
                                                        borderRadius: "10px",
                                                        bgcolor: "white",
                                                      },
                                                    }}
                                                  />
                                                </Box>
                                                <Box sx={{ mb: 2 }}>
                                                  <Typography
                                                    sx={{
                                                      fontSize: "0.875rem",
                                                      fontWeight: 500,
                                                      color: "#364153",
                                                      mb: 1,
                                                    }}
                                                  >
                                                    Select Players (
                                                    {
                                                      teamEditor.memberUserIds
                                                        .length
                                                    }{" "}
                                                    selected)
                                                  </Typography>
                                                  <Stack
                                                    spacing={1}
                                                    sx={{
                                                      maxHeight: 180,
                                                      overflowY: "auto",
                                                    }}
                                                  >
                                                    {registeredPlayersLoading ? (
                                                      <Typography
                                                        sx={{
                                                          fontSize: "0.875rem",
                                                          color: "#6A7282",
                                                          p: 1,
                                                        }}
                                                      >
                                                        Loading players...
                                                      </Typography>
                                                    ) : selectablePlayers.length ===
                                                      0 ? (
                                                      <Typography
                                                        sx={{
                                                          fontSize: "0.875rem",
                                                          color: "#6A7282",
                                                          p: 1,
                                                        }}
                                                      >
                                                        No available players for this
                                                        category. Assigned players are in
                                                        teams already.
                                                      </Typography>
                                                    ) : (
                                                      selectablePlayers.map(
                                                        (player) => (
                                                          <Box
                                                            key={`picker-${item.id}-${player.id}`}
                                                            sx={{
                                                              p: 1,
                                                              borderRadius: "4px",
                                                              "&:hover": {
                                                                bgcolor: "#F9FAFB",
                                                              },
                                                              cursor: "pointer",
                                                            }}
                                                            onClick={() =>
                                                              setCategoryTeamEditor(
                                                                item.id,
                                                                (current) => {
                                                                  const exists =
                                                                    current.memberUserIds.includes(
                                                                      player.id,
                                                                    );
                                                                  return {
                                                                    ...current,
                                                                    memberUserIds:
                                                                      exists
                                                                        ? current.memberUserIds.filter(
                                                                            (
                                                                              id,
                                                                            ) =>
                                                                              id !==
                                                                              player.id,
                                                                          )
                                                                        : [
                                                                            ...current.memberUserIds,
                                                                            player.id,
                                                                          ],
                                                                  };
                                                                },
                                                              )
                                                            }
                                                          >
                                                            <Stack
                                                              direction="row"
                                                              spacing={1}
                                                              alignItems="center"
                                                            >
                                                          <Box
                                                            sx={{
                                                              width: 16,
                                                              height: 16,
                                                              border:
                                                                "2px solid #D1D5DC",
                                                              borderRadius: "4px",
                                                              bgcolor:
                                                                teamEditor.memberUserIds.includes(
                                                                  player.id,
                                                                )
                                                                  ? "#8B5CF6"
                                                                  : "transparent",
                                                            }}
                                                          />
                                                              <Box sx={{ flex: 1 }}>
                                                                <Typography
                                                                  sx={{
                                                                    fontSize:
                                                                      "0.875rem",
                                                                    fontWeight: 500,
                                                                    color:
                                                                      "#101828",
                                                                  }}
                                                                >
                                                                  {player.name}
                                                                </Typography>
                                                                <Typography
                                                                  sx={{
                                                                    fontSize:
                                                                      "0.75rem",
                                                                    fontWeight: 500,
                                                                    color:
                                                                      "#6A7282",
                                                                  }}
                                                                >
                                                                  {player.email}
                                                                </Typography>
                                                              </Box>
                                                            </Stack>
                                                          </Box>
                                                        ),
                                                      )
                                                    )}
                                                  </Stack>
                                                </Box>
                                                <Button
                                                  fullWidth
                                                  disabled={
                                                    inlineTeamsSubmitting ||
                                                    teamEditor.memberUserIds
                                                      .length === 0
                                                  }
                                                  onClick={() =>
                                                    void saveCategoryTeam(item.id)
                                                  }
                                                  sx={{
                                                    bgcolor:
                                                      inlineTeamsSubmitting ||
                                                      teamEditor.memberUserIds
                                                        .length === 0
                                                        ? "#D1D5DC"
                                                        : "#8B5CF6",
                                                    color: "white",
                                                    fontWeight: 600,
                                                    fontSize: "1rem",
                                                    textTransform: "none",
                                                    height: 40,
                                                    borderRadius: "10px",
                                                    "&:hover": {
                                                      bgcolor:
                                                        inlineTeamsSubmitting ||
                                                        teamEditor.memberUserIds
                                                          .length === 0
                                                          ? "#D1D5DC"
                                                          : "#7C3AED",
                                                    },
                                                  }}
                                                >
                                                  {inlineTeamsSubmitting
                                                    ? "Saving..."
                                                    : teamEditor.editingTeamId ==
                                                          null
                                                      ? "Create Team"
                                                      : "Save Team"}
                                                </Button>
                                              </Box>

                                              <Typography
                                                sx={{
                                                  fontSize: "0.875rem",
                                                  fontWeight: 600,
                                                  color: "#364153",
                                                  mb: 1.5,
                                                }}
                                              >
                                                All Players
                                              </Typography>
                                              <Typography
                                                sx={{
                                                  fontSize: "0.75rem",
                                                  color: "#6A7282",
                                                  mb: 1.25,
                                                }}
                                              >
                                                Hint: `♥ Name` shows this player's desired
                                                partner for team creation.
                                              </Typography>
                                              <Stack
                                                spacing={1.5}
                                                sx={{ maxHeight: 260, overflowY: "auto", pr: 0.5 }}
                                              >
                                                {registeredPlayersLoading ? (
                                                  <Typography
                                                    sx={{
                                                      fontSize: "0.875rem",
                                                      color: "#6A7282",
                                                      p: 1,
                                                    }}
                                                  >
                                                    Loading players...
                                                  </Typography>
                                                ) : relevantPlayers.length === 0 ? (
                                                  <Typography
                                                    sx={{
                                                      fontSize: "0.875rem",
                                                      color: "#6A7282",
                                                      p: 1,
                                                    }}
                                                  >
                                                    No registered players available for
                                                    this category.
                                                  </Typography>
                                                ) : (
                                                  relevantPlayers.map((player) => (
                                                    (() => {
                                                      const isAssigned =
                                                        assignedUserIds.has(
                                                          player.id,
                                                        );
                                                      return (
                                                    <Box
                                                      key={`all-${item.id}-${player.id}`}
                                                      sx={{
                                                        p: 1.5,
                                                        bgcolor: isAssigned
                                                          ? "#ECFDF3"
                                                          : "white",
                                                        border: isAssigned
                                                          ? "1px solid #BBF7D0"
                                                          : "1px solid #E5E7EB",
                                                        borderRadius: "10px",
                                                      }}
                                                    >
                                                      <Stack
                                                        direction="row"
                                                        justifyContent="space-between"
                                                        alignItems="center"
                                                      >
                                                        <Box>
                                                          <Typography
                                                            sx={{
                                                              fontSize: "0.875rem",
                                                              fontWeight: 600,
                                                              color: "#101828",
                                                            }}
                                                          >
                                                            {player.name}
                                                          </Typography>
                                                          <Typography
                                                            sx={{
                                                              fontSize: "0.75rem",
                                                              color: "#6A7282",
                                                            }}
                                                          >
                                                            {player.email}
                                                          </Typography>
                                                          {player.preferredPartner ? (
                                                            <Typography
                                                              sx={{
                                                                fontSize: "0.75rem",
                                                                color: "#99A1AF",
                                                                fontStyle: "italic",
                                                                mt: 0.25,
                                                              }}
                                                            >
                                                              Wants to play with{" "}
                                                              {player.preferredPartner}
                                                            </Typography>
                                                          ) : null}
                                                        </Box>
                                                        {player.preferredPartner ? (
                                                          <Chip
                                                            label={`♥ ${player.preferredPartner}`}
                                                            size="small"
                                                            sx={{
                                                              bgcolor: "#FCE7F3",
                                                              color: "#EC4899",
                                                              fontWeight: 600,
                                                              fontSize: "0.75rem",
                                                              height: 24,
                                                              border: "none",
                                                            }}
                                                          />
                                                        ) : null}
                                                      </Stack>
                                                      {isAssigned ? (
                                                        <Typography
                                                          sx={{
                                                            mt: 0.5,
                                                            fontSize: "0.75rem",
                                                            color: "#166534",
                                                            fontWeight: 600,
                                                          }}
                                                        >
                                                          Assigned to a team
                                                        </Typography>
                                                      ) : null}
                                                    </Box>
                                                      );
                                                    })()
                                                  ))
                                                )}
                                              </Stack>
                                            </Box>
                                          </Stack>

                                          <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                            alignItems="center"
                                            sx={{ mt: 1 }}
                                          >
                                            <Button
                                              variant="text"
                                              onClick={() =>
                                                setOverviewStepByCategory(
                                                  (prev) => ({
                                                    ...prev,
                                                    [item.id]: "structure",
                                                  }),
                                                )
                                              }
                                              sx={{
                                                color: "#4A5565",
                                                fontWeight: 600,
                                                fontSize: "0.875rem",
                                                textTransform: "none",
                                                "&:hover": {
                                                  bgcolor: "transparent",
                                                  textDecoration: "underline",
                                                },
                                              }}
                                            >
                                              ← Back to Structure
                                            </Button>
                                            <Button
                                              variant="contained"
                                              onClick={() => {
                                                if (unassignedPlayersCount > 0) {
                                                  setPendingContinueWarningByCategory(
                                                    (prev) => ({
                                                      ...prev,
                                                      [item.id]: true,
                                                    }),
                                                  );
                                                  return;
                                                }
                                                setStatusMessage(
                                                  `All players are assigned for ${item.name}.`,
                                                );
                                                setPendingContinueWarningByCategory(
                                                  (prev) => ({
                                                    ...prev,
                                                    [item.id]: false,
                                                  }),
                                                );
                                                setOverviewStepByCategory(
                                                  (prev) => ({
                                                    ...prev,
                                                    [item.id]: "groups",
                                                  }),
                                                );
                                              }}
                                              sx={{
                                                bgcolor: "#8B5CF6",
                                                color: "white",
                                                fontWeight: 700,
                                                fontSize: "0.95rem",
                                                height: 40,
                                                borderRadius: "10px",
                                                px: 2.5,
                                                textTransform: "none",
                                                boxShadow: "none",
                                                "&:hover": {
                                                  bgcolor: "#7C3AED",
                                                  boxShadow: "none",
                                                },
                                              }}
                                            >
                                              Continue
                                            </Button>
                                          </Stack>
                                          {showContinueWarning ? (
                                            <Alert
                                              severity="warning"
                                              sx={{
                                                mt: 1.5,
                                                borderRadius: "10px",
                                                border: "1px solid #FDE68A",
                                                bgcolor: "#FFFBEB",
                                              }}
                                            >
                                              <Stack spacing={1}>
                                                <Typography
                                                  sx={{
                                                    fontSize: "0.875rem",
                                                    color: "#78350F",
                                                    fontWeight: 600,
                                                  }}
                                                >
                                                  {unassignedPlayersCount} player(s)
                                                  are still without a team in this
                                                  category.
                                                </Typography>
                                                <Stack
                                                  direction="row"
                                                  spacing={1}
                                                  sx={{
                                                    justifyContent: "flex-end",
                                                    flexWrap: "wrap",
                                                  }}
                                                >
                                                  <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() =>
                                                      setPendingContinueWarningByCategory(
                                                        (prev) => ({
                                                          ...prev,
                                                          [item.id]: false,
                                                        }),
                                                      )
                                                    }
                                                  >
                                                    Review Players
                                                  </Button>
                                                  <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="warning"
                                                    onClick={() => {
                                                      setPendingContinueWarningByCategory(
                                                        (prev) => ({
                                                          ...prev,
                                                          [item.id]: false,
                                                        }),
                                                      );
                                                      setStatusMessage(
                                                        `Continued with ${unassignedPlayersCount} unassigned player(s) in ${item.name}.`,
                                                      );
                                                      setOverviewStepByCategory(
                                                        (prev) => ({
                                                          ...prev,
                                                          [item.id]: "groups",
                                                        }),
                                                      );
                                                    }}
                                                  >
                                                    Continue Anyway
                                                  </Button>
                                                </Stack>
                                              </Stack>
                                            </Alert>
                                          ) : null}
                                        </Box>
                                      </Slide>
                                      <Slide
                                        in={showInlineDrawing}
                                        direction="left"
                                        mountOnEnter
                                        unmountOnExit
                                        timeout={220}
                                      >
                                        <Box
                                          sx={{
                                            p: 2,
                                            borderRadius: "12px",
                                            border: "1px solid #D1D5DC",
                                            bgcolor: "#F9FAFB",
                                          }}
                                        >
                                          <Alert
                                            severity="info"
                                            sx={{
                                              mb: 2,
                                              bgcolor: "#EFF6FF",
                                              border: "1px solid #BEDBFF",
                                              borderRadius: "14px",
                                              "& .MuiAlert-icon": {
                                                color: "#155DFC",
                                              },
                                            }}
                                          >
                                            <Typography
                                              sx={{
                                                fontWeight: 500,
                                                color: "#1C398E",
                                                fontSize: "0.875rem",
                                              }}
                                            >
                                              Drawing: assign teams into groups and
                                              review bracket progression for this
                                              category.
                                            </Typography>
                                          </Alert>

                                          <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            spacing={1}
                                            sx={{ mb: 2 }}
                                            justifyContent="space-between"
                                            alignItems={{ sm: "center" }}
                                          >
                                            <Button
                                              variant="text"
                                              onClick={() =>
                                                setOverviewStepByCategory(
                                                  (prev) => ({
                                                    ...prev,
                                                    [item.id]: "teams",
                                                  }),
                                                )
                                              }
                                              sx={{
                                                color: "#4A5565",
                                                fontWeight: 600,
                                                fontSize: "0.875rem",
                                                textTransform: "none",
                                                "&:hover": {
                                                  bgcolor: "transparent",
                                                  textDecoration: "underline",
                                                },
                                              }}
                                            >
                                              ← Back to Teams
                                            </Button>
                                            <Stack direction="row" spacing={1}>
                                              <Button
                                                variant="outlined"
                                                startIcon={<ShuffleOutlinedIcon />}
                                                onClick={() => {
                                                  const ok =
                                                    generateGroupsAndBracketForCategory(
                                                      item.id,
                                                      inlineTeams.map(
                                                        (team) => String(team.id),
                                                      ),
                                                    );
                                                  if (ok) {
                                                    setStatusMessage(
                                                      `Random draw generated for ${item.name}.`,
                                                    );
                                                  }
                                                }}
                                              >
                                                Random Draw
                                              </Button>
                                              <Button
                                                variant="contained"
                                                onClick={() => {
                                                  setSelectedCategoryId(item.id);
                                                  setActiveTab("groups");
                                                }}
                                              >
                                                Continue to Groups
                                              </Button>
                                            </Stack>
                                          </Stack>

                                          {unassignedTeamsForDrawing.length > 0 ? (
                                            <Alert
                                              severity="warning"
                                              sx={{
                                                mb: 2,
                                                borderRadius: "10px",
                                                border: "1px solid #FDE68A",
                                                bgcolor: "#FFFBEB",
                                              }}
                                            >
                                              {unassignedTeamsForDrawing.length} team(s)
                                              are not assigned to groups yet.
                                            </Alert>
                                          ) : null}

                                          <TournamentPhaseBuilder
                                            groups={inlineGroups}
                                            bracketMatches={
                                              inlineConfig.bracketMatches ?? []
                                            }
                                            groupCount={
                                              inlineConfig.groupCount ??
                                              Math.max(1, 2)
                                            }
                                            teamsPerGroup={
                                              inlineConfig.teamsPerGroup ?? 4
                                            }
                                            qualifiersPerGroup={
                                              inlineConfig.qualifiedPerGroup ?? 1
                                            }
                                            entryLabel={entryLabelFromFormat(
                                              item.format,
                                            )}
                                            availableEntries={inlineTeams.map((team) => ({
                                              value: String(team.id),
                                              label: getTeamDisplayName(team),
                                            }))}
                                            resolveEntryLabel={(value) => {
                                              const team = inlineTeams.find(
                                                (candidate) =>
                                                  String(candidate.id) ===
                                                  String(value),
                                              );
                                              return team
                                                ? getTeamDisplayName(team)
                                                : String(value ?? "");
                                            }}
                                            structureMode={
                                              inlineConfig.structureMode ?? ""
                                            }
                                            onGroupsChange={(nextGroups) => {
                                              const previousGroups =
                                                groupsByCategory[item.id] ?? [];
                                              persistGroups({
                                                ...groupsByCategory,
                                                [item.id]: nextGroups,
                                              });
                                              void syncTournamentGroupsForCategory(
                                                item.id,
                                                nextGroups,
                                              );
                                              void syncGroupTeamAssignmentsForCategory(
                                                previousGroups,
                                                nextGroups,
                                                new Set(
                                                  inlineTeams.map((team) =>
                                                    Number(team.id),
                                                  ),
                                                ),
                                              );
                                            }}
                                            onGroupCountChange={(count) => {
                                              setCategoryConfigs((prev) => ({
                                                ...prev,
                                                [item.id]: {
                                                  ...inlineConfig,
                                                  groupCount: count,
                                                },
                                              }));
                                            }}
                                            onBracketChange={(nextMatches) => {
                                              setCategoryConfigs((prev) => ({
                                                ...prev,
                                                [item.id]: {
                                                  ...inlineConfig,
                                                  bracketMatches: nextMatches,
                                                },
                                              }));
                                            }}
                                          />
                                        </Box>
                                      </Slide>
                                    </Stack>
                                  );
                                })()}
                              </Collapse>
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "teams" ? (
              <Card>
                <CardContent sx={{ p: 3 }}>
                  {(() => {
                    const selectedCategoryTeams = selectedCategory
                      ? (teamsByCategory[selectedCategory.id] ?? [])
                      : [];
                    const selectedCategoryId = selectedCategory?.id ?? "";
                    const teamEditor = getCategoryTeamEditor(selectedCategoryId);
                    const relevantPlayers = selectedCategory
                      ? registeredPlayers.filter((player) =>
                          player.categoryIds.includes(selectedCategory.id),
                        )
                      : [];
                    const assignedUserIds = new Set(
                      selectedCategoryTeams
                        .filter((team) => team.id !== teamEditor.editingTeamId)
                        .flatMap((team) =>
                          (team.members ?? []).map((member) =>
                            String(member.userId),
                          ),
                        ),
                    );
                    const selectablePlayers = relevantPlayers.filter(
                      (player) =>
                        !assignedUserIds.has(player.id) ||
                        teamEditor.memberUserIds.includes(player.id),
                    );
                    const teamsTabSubmitting = Boolean(
                      teamsSubmittingByCategory[selectedCategoryId],
                    );
                    return (
                      <>
                  {selectedCategory ? (
                    <Box sx={{ mb: 2.5 }}>
                      <Typography
                        sx={{
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          color: "#6A7282",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          mb: 1,
                        }}
                      >
                        {selectedCategoryLevel}
                      </Typography>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: "14px",
                          border: "1.5px solid #8B5CF6",
                          bgcolor: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: "10px",
                            bgcolor: "#FFEDD4",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <EmojiEventsRoundedIcon
                            sx={{ fontSize: 24, color: "#F54900" }}
                          />
                        </Box>
                        <Typography
                          sx={{
                            fontSize: "1.6rem",
                            fontWeight: 700,
                            color: "#101828",
                            lineHeight: 1.2,
                          }}
                        >
                          {selectedCategoryDisplayName}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Select a category from Category List first.
                    </Alert>
                  )}

                  <Box
                    sx={{
                      mb: 2,
                      p: 1.5,
                      borderRadius: "10px",
                      bgcolor: "#F9FAFB",
                      border: "1px solid #E5E7EB",
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "#101828",
                        fontSize: "0.95rem",
                        mb: 0.5,
                      }}
                    >
                      Instructions
                    </Typography>
                    <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
                      1. Create teams from registered players for this category.
                    </Typography>
                    <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
                      2. Assigned players are removed from selection.
                    </Typography>
                    <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
                      3. Continue to Drawing after team setup.
                    </Typography>
                  </Box>
                  {registeredPlayersError ? (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {registeredPlayersError}
                    </Alert>
                  ) : null}

                  {/* Two Column Layout */}
                  <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
                    {/* Left Column - Created Teams */}
                    <Box sx={{ flex: 1 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 2 }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "1.125rem",
                            color: "#101828",
                          }}
                        >
                          Created Teams
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            color: "#8B5CF6",
                          }}
                        >
                          {selectedCategoryTeams.length} teams
                        </Typography>
                      </Stack>

                      <Box
                        sx={{
                          p: 2,
                          bgcolor: "white",
                          border: "1px solid #E5E7EB",
                          borderRadius: "10px",
                        }}
                      >
                        {selectedCategoryTeams.length === 0 ? (
                          <Typography
                            sx={{ fontSize: "0.875rem", color: "#6A7282" }}
                          >
                            No teams created yet for this category.
                          </Typography>
                        ) : (
                          <Stack spacing={1}>
                            {selectedCategoryTeams.map((team) => (
                              <Box
                                key={`teams-tab-${team.id}`}
                                sx={{
                                  p: 1.25,
                                  border: "1px solid #E5E7EB",
                                  borderRadius: "10px",
                                  bgcolor: "white",
                                }}
                              >
                                <Stack
                                  direction="row"
                                  justifyContent="space-between"
                                  alignItems="center"
                                >
                                  <Typography
                                    sx={{
                                      fontWeight: 700,
                                      fontSize: "0.95rem",
                                      color: "#101828",
                                    }}
                                  >
                                    {team.name || `Team #${team.id}`}
                                  </Typography>
                                  <Stack direction="row" spacing={0.75}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() =>
                                        setCategoryTeamEditor(
                                          selectedCategoryId,
                                          () => ({
                                            name: team.name ?? "",
                                            memberUserIds: (
                                              team.members ?? []
                                            ).map((m) => String(m.userId)),
                                            autoNameFromMembers: Boolean(
                                              team.autoNameFromMembers,
                                            ),
                                            editingTeamId: team.id,
                                          }),
                                        )
                                      }
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="small"
                                      color="error"
                                      variant="outlined"
                                      onClick={() =>
                                        void deleteCategoryTeam(
                                          selectedCategoryId,
                                          team.id,
                                        )
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </Stack>
                                </Stack>
                                <Typography
                                  sx={{ fontSize: "0.75rem", color: "#6A7282" }}
                                >
                                  Members: {team.members?.length ?? 0}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </Box>
                    </Box>

                    {/* Right Column - Available Players */}
                    <Box sx={{ flex: 1 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 2 }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "1.125rem",
                            color: "#101828",
                          }}
                        >
                          Available Players
                        </Typography>
                        <Button
                          size="small"
                          sx={{
                            bgcolor: "#8B5CF6",
                            color: "white",
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            textTransform: "none",
                            height: 36,
                            borderRadius: "10px",
                            px: 2,
                            "&:hover": {
                              bgcolor: "#7C3AED",
                            },
                          }}
                        >
                          Cancel
                        </Button>
                      </Stack>

                      {/* New Team Form */}
                      <Box
                        sx={{
                          p: 2.5,
                          bgcolor: "white",
                          border: "1px solid #E5E7EB",
                          borderRadius: "10px",
                          mb: 2,
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "1rem",
                            color: "#101828",
                            mb: 2,
                          }}
                        >
                          New Team
                        </Typography>

                        {/* Team Name Input */}
                        <Box sx={{ mb: 2 }}>
                          <Typography
                            sx={{
                              fontSize: "0.875rem",
                              fontWeight: 500,
                              color: "#364153",
                              mb: 0.5,
                            }}
                          >
                            Team Name
                          </Typography>
                          <TextField
                            fullWidth
                            placeholder="Enter team name..."
                            size="small"
                            value={teamEditor.name}
                            onChange={(e) =>
                              setCategoryTeamEditor(
                                selectedCategoryId,
                                (current) => ({
                                  ...current,
                                  name: e.target.value,
                                }),
                              )
                            }
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: "10px",
                                bgcolor: "white",
                              },
                            }}
                          />
                        </Box>

                        {/* Select Players */}
                        <Box sx={{ mb: 2 }}>
                          <Typography
                            sx={{
                              fontSize: "0.875rem",
                              fontWeight: 500,
                              color: "#364153",
                              mb: 1,
                            }}
                          >
                            Select Players ({teamEditor.memberUserIds.length} selected)
                          </Typography>
                          <Stack
                            spacing={1}
                            sx={{ maxHeight: 180, overflowY: "auto" }}
                          >
                            {registeredPlayersLoading ? (
                              <Typography
                                sx={{ fontSize: "0.875rem", color: "#6A7282", p: 1 }}
                              >
                                Loading players...
                              </Typography>
                            ) : selectablePlayers.length === 0 ? (
                              <Typography
                                sx={{ fontSize: "0.875rem", color: "#6A7282", p: 1 }}
                              >
                                No available players for this category. Assigned
                                players are in teams already.
                              </Typography>
                            ) : (
                              selectablePlayers.map((player) => (
                              <Box
                                key={`picker-teams-${player.id}`}
                                sx={{
                                  p: 1,
                                  borderRadius: "4px",
                                  "&:hover": {
                                    bgcolor: "#F9FAFB",
                                  },
                                  cursor: "pointer",
                                }}
                                onClick={() =>
                                  setCategoryTeamEditor(
                                    selectedCategoryId,
                                    (current) => {
                                      const exists =
                                        current.memberUserIds.includes(player.id);
                                      return {
                                        ...current,
                                        memberUserIds: exists
                                          ? current.memberUserIds.filter(
                                              (id) => id !== player.id,
                                            )
                                          : [...current.memberUserIds, player.id],
                                      };
                                    },
                                  )
                                }
                              >
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                >
                                  <Box
                                    sx={{
                                      width: 16,
                                      height: 16,
                                      border: "2px solid #D1D5DC",
                                      borderRadius: "4px",
                                      bgcolor: teamEditor.memberUserIds.includes(
                                        player.id,
                                      )
                                        ? "#8B5CF6"
                                        : "transparent",
                                    }}
                                  />
                                  <Box sx={{ flex: 1 }}>
                                    <Typography
                                      sx={{
                                        fontSize: "0.875rem",
                                        fontWeight: 500,
                                        color: "#101828",
                                      }}
                                    >
                                      {player.name}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: "0.75rem",
                                        fontWeight: 500,
                                        color: "#6A7282",
                                      }}
                                    >
                                      {player.email}
                                    </Typography>
                                  </Box>
                                </Stack>
                              </Box>
                              ))
                            )}
                          </Stack>
                        </Box>

                        {/* Create Team Button */}
                        <Button
                          fullWidth
                          disabled={
                            teamsTabSubmitting ||
                            teamEditor.memberUserIds.length === 0 ||
                            !selectedCategoryId
                          }
                          onClick={() =>
                            selectedCategoryId
                              ? void saveCategoryTeam(selectedCategoryId)
                              : undefined
                          }
                          sx={{
                            bgcolor:
                              teamsTabSubmitting ||
                              teamEditor.memberUserIds.length === 0
                                ? "#D1D5DC"
                                : "#8B5CF6",
                            color: "white",
                            fontWeight: 600,
                            fontSize: "1rem",
                            textTransform: "none",
                            height: 40,
                            borderRadius: "10px",
                            "&:hover": {
                              bgcolor:
                                teamsTabSubmitting ||
                                teamEditor.memberUserIds.length === 0
                                  ? "#D1D5DC"
                                  : "#7C3AED",
                            },
                          }}
                        >
                          {teamsTabSubmitting
                            ? "Saving..."
                            : teamEditor.editingTeamId == null
                              ? "Create Team"
                              : "Save Team"}
                        </Button>
                      </Box>

                      {/* Available Players List */}
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: "#364153",
                          mb: 1.5,
                        }}
                      >
                        All Players
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: "#6A7282",
                          mb: 1.25,
                        }}
                      >
                        Hint: `♥ Name` shows this player's desired partner for team
                        creation.
                      </Typography>
                      <Stack
                        spacing={1.5}
                        sx={{ maxHeight: 280, overflowY: "auto", pr: 0.5 }}
                      >
                        {registeredPlayersLoading ? (
                          <Typography
                            sx={{ fontSize: "0.875rem", color: "#6A7282", p: 1 }}
                          >
                            Loading players...
                          </Typography>
                        ) : registeredPlayers.length === 0 ? (
                          <Typography
                            sx={{ fontSize: "0.875rem", color: "#6A7282", p: 1 }}
                          >
                            No registered players available yet.
                          </Typography>
                        ) : (
                          relevantPlayers.map((player) => (
                          <Box
                            key={`all-teams-${player.id}`}
                            sx={{
                              p: 1.5,
                              bgcolor: assignedUserIds.has(player.id)
                                ? "#ECFDF3"
                                : "white",
                              border: assignedUserIds.has(player.id)
                                ? "1px solid #BBF7D0"
                                : "1px solid #E5E7EB",
                              borderRadius: "10px",
                            }}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Box>
                                <Typography
                                  sx={{
                                    fontSize: "0.875rem",
                                    fontWeight: 600,
                                    color: "#101828",
                                  }}
                                >
                                  {player.name}
                                </Typography>
                                <Typography
                                  sx={{ fontSize: "0.75rem", color: "#6A7282" }}
                                >
                                  {player.email}
                                </Typography>
                                {player.preferredPartner && (
                                  <Typography
                                    sx={{
                                      fontSize: "0.75rem",
                                      color: "#99A1AF",
                                      fontStyle: "italic",
                                      mt: 0.25,
                                    }}
                                  >
                                    Wants to play with {player.preferredPartner}
                                  </Typography>
                                )}
                              </Box>
                              {player.preferredPartner && (
                                <Chip
                                  label={`♥ ${player.preferredPartner}`}
                                  size="small"
                                  sx={{
                                    bgcolor: "#FCE7F3",
                                    color: "#EC4899",
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    height: 24,
                                    border: "none",
                                  }}
                                />
                              )}
                            </Stack>
                            {assignedUserIds.has(player.id) ? (
                              <Typography
                                sx={{
                                  mt: 0.5,
                                  fontSize: "0.75rem",
                                  color: "#166534",
                                  fontWeight: 600,
                                }}
                              >
                                Assigned to a team
                              </Typography>
                            ) : null}
                          </Box>
                          ))
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                      </>
                    );
                  })()}

                  {/* Next Button */}
                  <Box
                    sx={{
                      mt: 3,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Button
                      variant="outlined"
                      onClick={() => setActiveTab("categories")}
                      sx={{ borderRadius: "10px" }}
                    >
                      Back: Structure
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => {
                        if (unassignedPlayersCountForTeamsTab > 0) {
                          setPendingContinueWarningByCategory((prev) => ({
                            ...prev,
                            [selectedCategoryId]: true,
                          }));
                          return;
                        }
                        setPendingContinueWarningByCategory((prev) => ({
                          ...prev,
                          [selectedCategoryId]: false,
                        }));
                        setActiveTab("groups");
                      }}
                      sx={{
                        bgcolor: "#8B5CF6",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "1rem",
                        height: 44,
                        borderRadius: "10px",
                        px: 3,
                        textTransform: "none",
                        boxShadow: "none",
                        "&:hover": {
                          bgcolor: "#7C3AED",
                          boxShadow: "none",
                        },
                      }}
                    >
                      Next: Groups & Brackets →
                    </Button>
                  </Box>
                  {showTeamsTabContinueWarning ? (
                    <Alert
                      severity="warning"
                      sx={{
                        mt: 1.5,
                        borderRadius: "10px",
                        border: "1px solid #FDE68A",
                        bgcolor: "#FFFBEB",
                      }}
                    >
                      <Stack spacing={1}>
                        <Typography
                          sx={{
                            fontSize: "0.875rem",
                            color: "#78350F",
                            fontWeight: 600,
                          }}
                        >
                          {unassignedPlayersCountForTeamsTab} player(s) are still without a
                          team in this category.
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ justifyContent: "flex-end", flexWrap: "wrap" }}
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              setPendingContinueWarningByCategory((prev) => ({
                                ...prev,
                                [selectedCategoryId]: false,
                              }))
                            }
                          >
                            Review Players
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            onClick={() => {
                              setPendingContinueWarningByCategory((prev) => ({
                                ...prev,
                                [selectedCategoryId]: false,
                              }));
                              setStatusMessage(
                                `Continued with ${unassignedPlayersCountForTeamsTab} unassigned player(s) in ${selectedCategoryDisplayName}.`,
                              );
                              setActiveTab("groups");
                            }}
                          >
                            Continue Anyway
                          </Button>
                        </Stack>
                      </Stack>
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "categories" ? (
              <Card>
                <CardContent sx={{ p: 3 }}>
                  {selectedCategory ? (
                    <Box sx={{ mb: 2.5 }}>
                      <Typography
                        sx={{
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          color: "#6A7282",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          mb: 1,
                        }}
                      >
                        {selectedCategoryLevel}
                      </Typography>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: "14px",
                          border: "1.5px solid #8B5CF6",
                          bgcolor: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: "10px",
                            bgcolor: "#FFEDD4",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <EmojiEventsRoundedIcon
                            sx={{ fontSize: 24, color: "#F54900" }}
                          />
                        </Box>
                        <Typography
                          sx={{
                            fontSize: "1.6rem",
                            fontWeight: 700,
                            color: "#101828",
                            lineHeight: 1.2,
                          }}
                        >
                          {selectedCategoryDisplayName}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Select a category from Category List first.
                    </Alert>
                  )}
                  <Box
                    sx={{
                      mb: 2,
                      p: 1.5,
                      borderRadius: "10px",
                      bgcolor: "#F9FAFB",
                      border: "1px solid #E5E7EB",
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "#101828",
                        fontSize: "0.95rem",
                        mb: 0.5,
                      }}
                    >
                      Instructions
                    </Typography>
                    <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
                      1. Pick the structure for this category.
                    </Typography>
                    <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
                      2. If needed, set group inputs.
                    </Typography>
                    <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
                      3. Continue to Teams and then Groups & Brackets.
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 900, mb: 1 }}>
                    Structure
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Configure structure for the selected category.
                  </Typography>

                  <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
                    Structure
                  </Typography>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.25}
                    useFlexGap
                    flexWrap="wrap"
                  >
                    {STRUCTURE_OPTIONS.map((opt) => {
                      const isSelected =
                        selectedConfig?.structureMode === opt.id;
                      return (
                        <Card
                          key={opt.id}
                          onClick={() => {
                            if (!selectedCategory || !selectedConfig) return;
                            setCategoryConfigs((prev) => ({
                              ...prev,
                              [selectedCategory.id]: {
                                ...selectedConfig,
                                structureMode: opt.id,
                              },
                            }));
                          }}
                          sx={{
                            cursor: selectedCategory
                              ? "pointer"
                              : "not-allowed",
                            width: { xs: "100%", md: "calc(50% - 5px)" },
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: isSelected
                              ? "rgba(139,92,246,0.45)"
                              : "rgba(15,23,42,0.10)",
                            bgcolor: isSelected
                              ? "rgba(139,92,246,0.08)"
                              : "background.paper",
                            opacity: selectedCategory ? 1 : 0.6,
                          }}
                        >
                          <CardContent sx={{ p: 1.5 }}>
                            <Typography sx={{ fontWeight: 800 }}>
                              {opt.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {opt.subtitle}
                            </Typography>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>

                  {selectedConfig?.structureMode === "groups_knockout" ? (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 800, mb: 1 }}
                      >
                        Group Phase Inputs
                      </Typography>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1.25}
                      >
                        <TextField
                          label="Number of groups"
                          type="number"
                          value={selectedConfig.groupCount ?? ""}
                          onChange={(e) => {
                            if (!selectedCategory || !selectedConfig) return;
                            setCategoryConfigs((prev) => ({
                              ...prev,
                              [selectedCategory.id]: {
                                ...selectedConfig,
                                groupCount: Math.max(
                                  1,
                                  Number(e.target.value || 0),
                                ),
                              },
                            }));
                          }}
                          fullWidth
                        />
                        <TextField
                          label="Teams per group (min 4)"
                          type="number"
                          value={selectedConfig.teamsPerGroup ?? ""}
                          onChange={(e) => {
                            if (!selectedCategory || !selectedConfig) return;
                            setCategoryConfigs((prev) => ({
                              ...prev,
                              [selectedCategory.id]: {
                                ...selectedConfig,
                                teamsPerGroup: Math.max(
                                  4,
                                  Number(e.target.value || 0),
                                ),
                              },
                            }));
                          }}
                          fullWidth
                        />
                        <TextField
                          label="Qualified per group"
                          type="number"
                          value={selectedConfig.qualifiedPerGroup ?? ""}
                          onChange={(e) => {
                            if (!selectedCategory || !selectedConfig) return;
                            setCategoryConfigs((prev) => ({
                              ...prev,
                              [selectedCategory.id]: {
                                ...selectedConfig,
                                qualifiedPerGroup: Math.max(
                                  1,
                                  Number(e.target.value || 0),
                                ),
                              },
                            }));
                          }}
                          fullWidth
                        />
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: "block" }}
                      >
                        Groups and bracket will be auto-generated when you click
                        Next: Teams.
                      </Typography>
                    </>
                  ) : null}

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.25}
                    justifyContent="space-between"
                    sx={{ mt: 2 }}
                  >
                    <Button
                      variant="outlined"
                      onClick={() => setActiveTab("overview")}
                      sx={{ borderRadius: 999 }}
                    >
                      Back: Overview
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => {
                        if (
                          selectedConfig?.structureMode === "groups_knockout" &&
                          hasGroupStructureConfig
                        ) {
                          generateGroupsAndBracketForSelectedCategory();
                        }
                        saveSetup();
                        setActiveTab("teams");
                      }}
                      disabled={!canSaveSelectedCategorySetup}
                      sx={{ borderRadius: 999 }}
                    >
                      Next: Teams
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "groups" ? (
              <Card>
                <CardContent sx={{ p: 3 }}>
                  {!selectedCategory ? (
                    <Alert severity="info">
                      Select a category in the Structure tab first.
                    </Alert>
                  ) : (
                    <Stack spacing={1.25}>
                      <Box
                        sx={{
                          mb: 2,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "1.1rem",
                            fontWeight: 700,
                            color: "#6A7282",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            mb: 1,
                          }}
                        >
                          {selectedCategoryLevel}
                        </Typography>
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: "14px",
                            border: "1.5px solid #8B5CF6",
                            bgcolor: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: "10px",
                              bgcolor: "#FFEDD4",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <EmojiEventsRoundedIcon
                              sx={{ fontSize: 24, color: "#F54900" }}
                            />
                          </Box>
                          <Typography
                            sx={{
                              fontSize: "1.6rem",
                              fontWeight: 700,
                              color: "#101828",
                              lineHeight: 1.2,
                            }}
                          >
                            {selectedCategoryDisplayName}
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          mb: 2,
                          p: 1.5,
                          borderRadius: "10px",
                          bgcolor: "#F9FAFB",
                          border: "1px solid #E5E7EB",
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                            color: "#101828",
                            fontSize: "0.95rem",
                            mb: 0.5,
                          }}
                        >
                          Instructions
                        </Typography>
                        <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
                          1. Assign teams to groups manually or use random draw.
                        </Typography>
                        <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
                          2. Review group distribution and bracket pairings.
                        </Typography>
                        <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
                          3. Save updates and go back to adjust earlier steps if needed.
                        </Typography>
                        <Typography sx={{ fontSize: "0.85rem", color: "#6B7280", mt: 0.75 }}>
                          {selectedConfig?.structureMode
                            ? `Structure: ${selectedConfig.structureMode}`
                            : "Structure not selected yet"}
                        </Typography>
                      </Box>
                      <TournamentPhaseBuilder
                        groups={groupsByCategory[selectedCategory.id] ?? []}
                        bracketMatches={selectedConfig?.bracketMatches ?? []}
                        groupCount={
                          selectedConfig?.groupCount ??
                          Math.max(1, selectedCategory.groups || 2)
                        }
                        teamsPerGroup={selectedConfig?.teamsPerGroup ?? 4}
                        qualifiersPerGroup={
                          selectedConfig?.qualifiedPerGroup ?? 1
                        }
                        entryLabel={selectedEntryLabel}
                        availableEntries={(
                          teamsByCategory[selectedCategory.id] ?? []
                        ).map((team) => ({
                          value: String(team.id),
                          label: getTeamDisplayName(team),
                        }))}
                        resolveEntryLabel={(value) => {
                          const team = (
                            teamsByCategory[selectedCategory.id] ?? []
                          ).find(
                            (candidate) =>
                              String(candidate.id) === String(value),
                          );
                          return team
                            ? getTeamDisplayName(team)
                            : String(value ?? "");
                        }}
                        structureMode={selectedConfig?.structureMode ?? ""}
                        onGroupsChange={(nextGroups) => {
                          const previousGroups =
                            groupsByCategory[selectedCategory.id] ?? [];
                          persistGroups({
                            ...groupsByCategory,
                            [selectedCategory.id]: nextGroups,
                          });
                          void syncTournamentGroupsForCategory(
                            selectedCategory.id,
                            nextGroups,
                          );
                          void syncGroupTeamAssignmentsForCategory(
                            previousGroups,
                            nextGroups,
                            new Set(
                              (teamsByCategory[selectedCategory.id] ?? []).map(
                                (team) => Number(team.id),
                              ),
                            ),
                          );
                        }}
                        onGroupCountChange={(count) => {
                          if (!selectedConfig) return;
                          setCategoryConfigs((prev) => ({
                            ...prev,
                            [selectedCategory.id]: {
                              ...selectedConfig,
                              groupCount: count,
                            },
                          }));
                        }}
                        onBracketChange={(nextMatches) => {
                          if (!selectedConfig) return;
                          setCategoryConfigs((prev) => ({
                            ...prev,
                            [selectedCategory.id]: {
                              ...selectedConfig,
                              bracketMatches: nextMatches,
                            },
                          }));
                        }}
                      />
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-start",
                          pt: 1,
                        }}
                      >
                        <Button
                          variant="outlined"
                          onClick={() => setActiveTab("teams")}
                          sx={{ borderRadius: "10px" }}
                        >
                          Back: Teams
                        </Button>
                      </Box>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
}
