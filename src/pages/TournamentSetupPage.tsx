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
  MenuItem,
  Slide,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getToken } from "../auth/tokens";
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
} from "../Components/Shared/TournamentPhaseBuilder";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ShuffleOutlinedIcon from "@mui/icons-material/ShuffleOutlined";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import {
  entryLabelFromFormat,
  extractLevelFromCategoryName,
  formatMinutesToTime,
  fromApiTime,
  getTeamDisplayName,
  groupLetter,
  inferDisciplineFromCategory,
  inferFormatFromCategoryName,
  normalizeMatchIdentity,
  normalizeRoundForApi,
  parseTimeToMinutes,
  stripLevelPrefixFromCategoryName,
  STRUCTURE_OPTIONS,
  toApiTime,
} from "./tournament-setup/helpers";
import { useTournamentSetupNavigation } from "./tournament-setup/hooks";
import {
  type ApiEvent,
  type ApiEventDetailsCategory,
  type ApiEventDetailsResponse,
  type ApiEventSubscription,
  type ApiMatchDto,
  type ApiTournamentCategory,
  type ApiTournamentGroup,
  type CategoryScheduleItem,
  type CategorySetupConfig,
  type RegisteredPlayer,
  type ScheduleDraftInput,
  type SetupTab,
  type StructureMode,
  type TeamDto,
  type TeamEditorState,
  type TournamentFormat,
} from "./tournament-setup/types";
import { TeamsTab } from "./tournament-setup/TeamsTab";
import { StructureTab } from "./tournament-setup/StructureTab";
import { GroupsTab } from "./tournament-setup/GroupsTab";
import { ScheduleTab } from "./tournament-setup/ScheduleTab";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type ApiStructureType =
  | "GROUP_PHASE_KO"
  | "KNOCKOUT_ONLY"
  | "GROUP_PHASE_ONLY"
  | "SWISS";

type ApiTournamentCategoryStructure = {
  categoryId?: number | string;
  structureType?: string;
  numberOfGroups?: number | string;
  teamsPerGroup?: number | string;
  qualifiedPerGroup?: number | string;
};

function toApiStructureType(mode: StructureMode): ApiStructureType {
  if (mode === "groups_knockout") return "GROUP_PHASE_KO";
  if (mode === "knockout_only") return "KNOCKOUT_ONLY";
  if (mode === "group_phase_only") return "GROUP_PHASE_ONLY";
  return "SWISS";
}

function fromApiStructureType(type?: string): StructureMode | "" {
  const normalized = String(type ?? "").trim().toUpperCase();
  if (normalized === "GROUP_PHASE_KO") return "groups_knockout";
  if (normalized === "KNOCKOUT_ONLY") return "knockout_only";
  if (normalized === "GROUP_PHASE_ONLY") return "group_phase_only";
  if (normalized === "SWISS") return "swiss";
  return "";
}

function parseStructureResponse(
  body: unknown,
): ApiTournamentCategoryStructure | null {
  if (!body || typeof body !== "object") return null;
  const source = body as Record<string, unknown>;
  const nested =
    source.data && typeof source.data === "object"
      ? (source.data as Record<string, unknown>)
      : source;
  if (!nested) return null;
  const hasStructureType = Boolean(
    String(nested.structureType ?? "").trim().length,
  );
  if (!hasStructureType) return null;
  return {
    categoryId: nested.categoryId as number | string | undefined,
    structureType: nested.structureType as string | undefined,
    numberOfGroups: nested.numberOfGroups as number | string | undefined,
    teamsPerGroup: nested.teamsPerGroup as number | string | undefined,
    qualifiedPerGroup: nested.qualifiedPerGroup as number | string | undefined,
  };
}

function toSafeCount(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, parsed);
}

function mapEmbeddedGroups(category: ApiTournamentCategory): GroupBucket[] {
  const groups = (Array.isArray((category as ApiEventDetailsCategory).groups)
    ? (category as ApiEventDetailsCategory).groups
    : []) as NonNullable<ApiEventDetailsCategory["groups"]>;
  return groups.map((group, idx) => ({
    id: String(group.id ?? `group-${idx + 1}`),
    name: String(group.name ?? `Group ${idx + 1}`),
    participants: Array.from(
      new Set(
        (Array.isArray(group.teams) ? group.teams : [])
          .map((team) => Number(team?.id))
          .filter((teamId) => Number.isFinite(teamId) && teamId > 0)
          .map((teamId) => String(teamId)),
      ),
    ),
  }));
}

function mapEmbeddedTeams(category: ApiTournamentCategory): TeamDto[] {
  const categoryId = Number(category.id);
  const groups = (Array.isArray((category as ApiEventDetailsCategory).groups)
    ? (category as ApiEventDetailsCategory).groups
    : []) as NonNullable<ApiEventDetailsCategory["groups"]>;
  const byId = new Map<number, TeamDto>();

  groups.forEach((group) => {
    (Array.isArray(group.teams) ? group.teams : []).forEach((team) => {
      const teamId = Number(team?.id);
      if (!Number.isFinite(teamId) || teamId <= 0 || byId.has(teamId)) return;
      byId.set(teamId, {
        id: teamId,
        categoryId:
          Number.isFinite(categoryId) && categoryId > 0 ? categoryId : 0,
        name: String(team?.name ?? ""),
        autoNameFromMembers: Boolean(team?.autoNameFromMembers),
        members: Array.isArray(team?.members)
          ? team.members.map((member) => ({
              userId: Number(member.userId ?? 0),
              userFullName: member.userFullName,
              joinedAt: member.joinedAt,
            }))
          : [],
      });
    });
  });

  return Array.from(byId.values());
}

function createEmptyTeamEditorState(): TeamEditorState {
  return {
    name: "",
    memberUserIds: [],
    autoNameFromMembers: true,
    editingTeamId: null,
  };
}

export default function TournamentSetupPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
  const [hasPersistedStructureByCategory, setHasPersistedStructureByCategory] =
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
  const [scheduleDraftByCategory, setScheduleDraftByCategory] = React.useState<
    Record<string, ScheduleDraftInput>
  >({});
  const [matchesPostingByCategory, setMatchesPostingByCategory] = React.useState<
    Record<string, boolean>
  >({});
  const [editingScheduleItemByCategory, setEditingScheduleItemByCategory] =
    React.useState<Record<string, string | null>>({});
  const [finalizingSetupByCategory, setFinalizingSetupByCategory] = React.useState<
    Record<string, boolean>
  >({});
  const [finalizedSetupByCategory, setFinalizedSetupByCategory] = React.useState<
    Record<string, boolean>
  >({});
  const groupStructureSignatureRef = React.useRef<Record<string, string>>({});

  React.useEffect(() => {
    if (!id) return;
    setGroupsByCategory(loadTournamentGroups(id));
  }, [id]);

  const groupStructureSignature = (groups: GroupBucket[]) =>
    groups
      .map((g) => {
        const participants = (g.participants ?? [])
          .map((participant) => String(participant ?? "").trim())
          .join(",");
        return `${g.id}::${g.name}::${participants}`;
      })
      .join("||");

  const syncCategoryStructure = React.useCallback(
    async (categoryId: string, cfg?: CategorySetupConfig): Promise<boolean> => {
      const token = getToken();
      if (!token) return false;
      const parsedCategoryId = Number(categoryId);
      if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
        return false;
      }

      const alreadyPersisted =
        hasPersistedStructureByCategory[categoryId] ?? false;
      const mode = cfg?.structureMode ?? "";

      try {
        if (!mode) {
          if (!alreadyPersisted) return true;
          const deleteRes = await fetch(
            `${API_URL}/tournament-category-structures/${encodeURIComponent(parsedCategoryId)}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const deleteBody = await deleteRes.json().catch(() => null);
          if (!deleteRes.ok) {
            throw new Error(
              deleteBody?.message?.[0] ||
                deleteBody?.error ||
                "Failed to delete structure.",
            );
          }
          setHasPersistedStructureByCategory((prev) => ({
            ...prev,
            [categoryId]: false,
          }));
          return true;
        }

        const payload = {
          categoryId: parsedCategoryId,
          structureType: toApiStructureType(mode),
          numberOfGroups: Math.max(0, Number(cfg?.groupCount ?? 0)),
          teamsPerGroup: Math.max(0, Number(cfg?.teamsPerGroup ?? 0)),
          qualifiedPerGroup: Math.max(0, Number(cfg?.qualifiedPerGroup ?? 0)),
        };

        const endpoint = alreadyPersisted
          ? `${API_URL}/tournament-category-structures/${encodeURIComponent(parsedCategoryId)}`
          : `${API_URL}/tournament-category-structures`;
        const method = alreadyPersisted ? "PUT" : "POST";
        const res = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            body?.message?.[0] || body?.error || "Failed to save structure.",
          );
        }
        setHasPersistedStructureByCategory((prev) => ({
          ...prev,
          [categoryId]: true,
        }));
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to sync structure.",
        );
        return false;
      }
    },
    [hasPersistedStructureByCategory],
  );

  const syncTournamentGroupsForCategory = React.useCallback(
    async (
      categoryId: string,
      nextGroups: GroupBucket[],
      categoryTeams: TeamDto[] = [],
    ) => {
      const token = getToken();
      if (!token) return nextGroups;
      const parsedCategoryId = Number(categoryId);
      if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0)
        return nextGroups;

      const signature = groupStructureSignature(nextGroups);
      if (groupStructureSignatureRef.current[categoryId] === signature)
        return nextGroups;

      try {
        const serverIds = new Set(serverGroupIdsByCategory[categoryId] ?? []);
        const usedIds = new Set<number>();
        const updated = [...nextGroups];
        let serverGroupsByName: Map<string, number> | null = null;
        const categoryTeamMap = new Map<number, TeamDto>(
          categoryTeams
            .map((team) => [Number(team.id), team] as const)
            .filter(
              ([teamId]) => Number.isFinite(teamId) && Number(teamId) > 0,
            ),
        );

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
          const groupTeamIds = Array.from(
            new Set(
              (group.participants ?? [])
                .map((participant) => Number(String(participant ?? "").trim()))
                .filter(
                  (teamId) =>
                    Number.isFinite(teamId) &&
                    teamId > 0 &&
                    categoryTeamMap.has(teamId),
                ),
            ),
          );
          const teams = groupTeamIds
            .map((teamId) => categoryTeamMap.get(teamId))
            .filter((team): team is TeamDto => Boolean(team))
            .map((team) => ({
              id: team.id,
              name: team.name,
              autoNameFromMembers: Boolean(team.autoNameFromMembers),
              members: (team.members ?? []).map((member) => ({
                userId: member.userId,
                userFullName: member.userFullName,
                role: member.role,
                joinedAt: member.joinedAt,
              })),
            }));
          const payload = {
            categoryId: parsedCategoryId,
            name: group.name,
            teams,
            teamIds: groupTeamIds,
          };

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
                body: JSON.stringify(payload),
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
                body: JSON.stringify(payload),
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
            body: JSON.stringify(payload),
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
        return updated;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to sync tournament groups",
        );
        return nextGroups;
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

      if (!token) {
        setError("Invalid session. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        const detailsRes = await fetch(
          `${API_URL}/events/${encodeURIComponent(id)}/details`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const detailsBody: ApiEventDetailsResponse | null = await detailsRes
          .json()
          .catch(() => null);
        if (!detailsRes.ok) {
          throw new Error(
            (detailsBody as any)?.message?.[0] ||
              (detailsBody as any)?.error ||
              `Failed to load tournament (${detailsRes.status})`,
          );
        }

        const selected = detailsBody?.event ?? null;

        if (!selected) {
          throw new Error("Tournament not found or you do not have access.");
        }
        if (String(selected.eventType ?? "").toUpperCase() !== "TOURNAMENT") {
          throw new Error("Selected event is not a tournament.");
        }

        if (cancelled) return;
        setEvent(selected);
        const saved = loadTournamentSetup(String(selected.id));
        const rawCategories: ApiTournamentCategory[] = Array.isArray(
          selected.categories,
        )
          ? selected.categories
          : [];
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
              groups: Math.max(
                1,
                Number(
                  toSafeCount(
                    (cat as ApiEventDetailsCategory).groupsCount,
                  ) ?? persisted?.groups ?? 2,
                ),
              ),
            };
          },
        );
        const structureByCategory = Object.fromEntries(
          rawCategories.map((cat) => [
            String(cat.id),
            parseStructureResponse(cat.structure),
          ]),
        ) as Record<string, ApiTournamentCategoryStructure | null>;
        const persistedStructureByCategory = Object.fromEntries(
          Object.entries(structureByCategory).map(([key, value]) => [
            key,
            Boolean(value),
          ]),
        ) as Record<string, boolean>;
        setHasPersistedStructureByCategory(persistedStructureByCategory);

        if (saved) {
          const savedConfigs = saved.categoryConfigs ?? {};
          const computedConfigs: Record<string, CategorySetupConfig> = {};
          const sourceCategories =
            backendMappedCategories.length > 0
              ? backendMappedCategories
              : saved.categories;
          sourceCategories.forEach((cat) => {
            const current = savedConfigs[String(cat.id)];
            const backendStructure = structureByCategory[String(cat.id)];
            const backendStructureMode = fromApiStructureType(
              backendStructure?.structureType,
            );
            computedConfigs[String(cat.id)] = {
              formats: [inferFormatFromCategoryName(cat.name)],
              structureMode:
                backendStructureMode ||
                ((current?.structureMode as StructureMode) ?? ""),
              groupCount:
                toSafeCount(backendStructure?.numberOfGroups) ??
                toSafeCount((rawCategories.find((item) => String(item.id) === String(cat.id)) as ApiEventDetailsCategory | undefined)?.groupsCount) ??
                (typeof current?.groupCount === "number"
                  ? current.groupCount
                  : undefined),
              teamsPerGroup:
                toSafeCount(backendStructure?.teamsPerGroup) ??
                (typeof current?.teamsPerGroup === "number"
                  ? current.teamsPerGroup
                  : undefined),
              qualifiedPerGroup:
                toSafeCount(backendStructure?.qualifiedPerGroup) ??
                (typeof current?.qualifiedPerGroup === "number"
                  ? current.qualifiedPerGroup
                  : undefined),
              scheduleStartTime:
                typeof current?.scheduleStartTime === "string"
                  ? current.scheduleStartTime
                  : undefined,
              scheduleEndTime:
                typeof current?.scheduleEndTime === "string"
                  ? current.scheduleEndTime
                  : undefined,
              scheduleDate:
                typeof current?.scheduleDate === "string"
                  ? current.scheduleDate
                  : undefined,
              scheduleVenue:
                typeof current?.scheduleVenue === "string"
                  ? current.scheduleVenue
                  : undefined,
              scheduleBufferMinutes:
                typeof current?.scheduleBufferMinutes === "number"
                  ? current.scheduleBufferMinutes
                  : undefined,
              scheduleItems: Array.isArray(current?.scheduleItems)
                ? current.scheduleItems.map((item) => ({
                    id: String(item.id),
                    matchLabel: String(item.matchLabel ?? ""),
                    startTime: String(item.startTime ?? ""),
                    endTime: String(item.endTime ?? ""),
                    venue: String(item.venue ?? ""),
                    backendMatchId:
                      Number.isFinite(Number((item as any).backendMatchId)) &&
                      Number((item as any).backendMatchId) > 0
                        ? Number((item as any).backendMatchId)
                        : undefined,
                    groupId:
                      Number.isFinite(Number((item as any).groupId)) &&
                      Number((item as any).groupId) > 0
                        ? Number((item as any).groupId)
                        : undefined,
                    round: String((item as any).round ?? ""),
                    homeTeamId:
                      Number.isFinite(Number((item as any).homeTeamId)) &&
                      Number((item as any).homeTeamId) > 0
                        ? Number((item as any).homeTeamId)
                        : undefined,
                    awayTeamId:
                      Number.isFinite(Number((item as any).awayTeamId)) &&
                      Number((item as any).awayTeamId) > 0
                        ? Number((item as any).awayTeamId)
                        : undefined,
                    matchDate: String((item as any).matchDate ?? ""),
                    status: String((item as any).status ?? "SCHEDULED"),
                  }))
                : [],
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
            const backendStructure = structureByCategory[String(cat.id)];
            const backendStructureMode = fromApiStructureType(
              backendStructure?.structureType,
            );
            computedConfigs[String(cat.id)] = {
              formats: [inferFormatFromCategoryName(cat.name)],
              structureMode: backendStructureMode,
              groupCount:
                toSafeCount(backendStructure?.numberOfGroups) ??
                toSafeCount(
                  (rawCategories.find((item) => String(item.id) === String(cat.id)) as ApiEventDetailsCategory | undefined)?.groupsCount,
                ),
              teamsPerGroup: toSafeCount(backendStructure?.teamsPerGroup),
              qualifiedPerGroup: toSafeCount(
                backendStructure?.qualifiedPerGroup,
              ),
              bracketMatches: [],
            };
          });
          setCategoryConfigs(computedConfigs);
        }
        const nextGroupsMap: Record<string, GroupBucket[]> = {};
        const nextServerIdsMap: Record<string, number[]> = {};
        const nextTeamsMap: Record<string, TeamDto[]> = {};
        rawCategories.forEach((cat) => {
          const categoryKey = String(cat.id);
          const mappedGroups = mapEmbeddedGroups(cat);
          nextGroupsMap[categoryKey] = mappedGroups;
          nextServerIdsMap[categoryKey] = mappedGroups
            .map((group) => Number(group.id))
            .filter((value) => Number.isFinite(value) && value > 0);
          nextTeamsMap[categoryKey] = mapEmbeddedTeams(cat);
          groupStructureSignatureRef.current[categoryKey] =
            groupStructureSignature(mappedGroups);
        });
        setServerGroupIdsByCategory(nextServerIdsMap);
        setTeamsByCategory((prev) => ({ ...prev, ...nextTeamsMap }));
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
    if (!id || activeTab !== "teams") return;
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
      teamEditorByCategory[categoryId] ?? createEmptyTeamEditorState(),
    [teamEditorByCategory],
  );

  const loadTeamsForCategory = React.useCallback(async (categoryId: string) => {
    const token = getToken();
    if (!token) return [];
    const parsedCategoryId = Number(categoryId);
    if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) return [];

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
      return list as TeamDto[];
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams.");
      setTeamsByCategory((prev) => ({ ...prev, [categoryId]: [] }));
      return [];
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
        const current: TeamEditorState =
          prev[categoryId] ?? createEmptyTeamEditorState();
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
        setCategoryTeamEditor(categoryId, () => createEmptyTeamEditorState());
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

      const deletedTeamId = String(teamId);
      const currentGroups = groupsByCategory[categoryId] ?? [];
      const cleanedGroups = currentGroups.map((group) => ({
        ...group,
        participants: (group.participants ?? []).filter(
          (participant) => String(participant) !== deletedTeamId,
        ),
      }));
      setGroupsByCategory((prev) => {
        const next = { ...prev, [categoryId]: cleanedGroups };
        if (id) saveTournamentGroups(id, next);
        return next;
      });

      const remainingTeams = await loadTeamsForCategory(categoryId);
      void syncTournamentGroupsForCategory(
        categoryId,
        cleanedGroups,
        remainingTeams,
      );

      setStatusMessage("Team deleted.");
      setCategoryTeamEditor(categoryId, (current) =>
        current.editingTeamId === teamId
          ? createEmptyTeamEditorState()
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team.");
    }
  }, [
    groupsByCategory,
    id,
    loadTeamsForCategory,
    setCategoryTeamEditor,
    syncTournamentGroupsForCategory,
  ]);

  React.useEffect(() => {
    if (
      (activeTab !== "teams" &&
        activeTab !== "groups" &&
        activeTab !== "schedule") ||
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
  const selectedConfigResolved = selectedConfig;
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
  const selectedTargetTeamsForStructure =
    selectedConfig?.structureMode === "groups_knockout"
      ? Math.max(
          0,
          Number(selectedConfig.groupCount ?? 0) *
            Number(selectedConfig.teamsPerGroup ?? 0),
        )
      : 0;
  const selectedExpectedScheduleKeys = React.useMemo(() => {
    if (!selectedCategory || !selectedConfig) return [];
    return Array.from(
      new Set(
        buildScheduleItemsForCategory(selectedCategory.id, selectedConfig)
          .map((item) => normalizeMatchIdentity(item))
          .filter((key): key is string => Boolean(key)),
      ),
    );
  }, [buildScheduleItemsForCategory, selectedCategory, selectedConfig]);
  const selectedScheduledMatchKeys = React.useMemo(() => {
    if (!selectedConfig) return new Set<string>();
    return new Set(
      (selectedConfig.scheduleItems ?? [])
        .map((item) => normalizeMatchIdentity(item))
        .filter((key): key is string => Boolean(key)),
    );
  }, [selectedConfig]);
  const selectedMissingScheduleCount = React.useMemo(() => {
    if (selectedExpectedScheduleKeys.length === 0) return 0;
    return selectedExpectedScheduleKeys.filter(
      (key) => !selectedScheduledMatchKeys.has(key),
    ).length;
  }, [selectedExpectedScheduleKeys, selectedScheduledMatchKeys]);
  const selectedCategoryIsFinalized = Boolean(
    selectedCategory ? finalizedSetupByCategory[selectedCategory.id] : false,
  );
  const selectedCategoryIsFinalizing = Boolean(
    selectedCategory ? finalizingSetupByCategory[selectedCategory.id] : false,
  );
  const canFinalizeSelectedCategory = Boolean(
    selectedCategory &&
      selectedExpectedScheduleKeys.length > 0 &&
      selectedMissingScheduleCount === 0 &&
      !selectedCategoryIsFinalizing &&
      !selectedCategoryIsFinalized,
  );
  const finalizeDisabledReason = !selectedCategory
    ? "Select a category first."
    : selectedExpectedScheduleKeys.length === 0
      ? "No schedulable matches found yet."
      : selectedMissingScheduleCount > 0
        ? `Schedule all matches first. ${selectedMissingScheduleCount} match(es) still missing.`
        : selectedCategoryIsFinalized
          ? "This category setup is already finalized."
          : "Finalize is currently unavailable.";
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
          hasTeams: boolean;
          structure: string;
          hasGroups: boolean;
          hasBracket: boolean;
          hasSchedule: boolean;
        }
      >();
      const regular: Array<{
        id: string;
        name: string;
        format: TournamentFormat;
        hasTeams: boolean;
        structure: string;
        hasGroups: boolean;
        hasBracket: boolean;
        hasSchedule: boolean;
      }> = [];

      categories.forEach((cat) => {
        const cfg = categoryConfigs[cat.id];
        const teams = teamsByCategory[cat.id] ?? [];
        const groups = groupsByCategory[cat.id] ?? [];
        const hasTeams = teams.length > 0;
        const hasGroups =
          groups.length > 0 &&
          groups.some((g) =>
            g.participants.some((p) => String(p).trim().length > 0),
          );
        const hasBracket = (cfg?.bracketMatches?.length ?? 0) > 0;
        const format = inferFormatFromCategoryName(cat.name);
        const hasSchedule = (cfg?.scheduleItems?.length ?? 0) > 0;
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
              hasTeams,
              structure: cfg?.structureMode ?? "",
              hasGroups,
              hasBracket,
              hasSchedule,
            });
          } else {
            dedupedMixed.set(key, {
              ...previous,
              format: previous.format || format,
              hasTeams: previous.hasTeams || hasTeams,
              structure: previous.structure || (cfg?.structureMode ?? ""),
              hasGroups: previous.hasGroups || hasGroups,
              hasBracket: previous.hasBracket || hasBracket,
              hasSchedule: previous.hasSchedule || hasSchedule,
            });
          }
          return;
        }
        regular.push({
          id: cat.id,
          name: cat.name,
          format,
          hasTeams,
          structure: cfg?.structureMode ?? "",
          hasGroups,
          hasBracket,
          hasSchedule,
        });
      });

      return [...regular, ...Array.from(dedupedMixed.values())];
    },
    [categories, categoryConfigs, groupsByCategory, teamsByCategory],
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

  const { openCategorySetup, backToCategoryList, updateSetupQuery } =
    useTournamentSetupNavigation({
      categories,
      searchParams,
      setSearchParams,
      setError,
      setSelectedCategoryId,
      setExpandedOverviewCategoryId,
      setActiveTab,
    });

  const isCategorySetupMode = Boolean(selectedCategoryId);
  const categoryTabsValue: Exclude<SetupTab, "overview"> =
    activeTab === "teams" || activeTab === "groups" || activeTab === "schedule"
      ? activeTab
      : "categories";

  const saveSetup = async (): Promise<boolean> => {
    if (!id) return false;
    const structureSyncResults = await Promise.all(
      categories.map((cat) =>
        syncCategoryStructure(cat.id, categoryConfigs[cat.id]),
      ),
    );
    if (structureSyncResults.some((ok) => !ok)) return false;
    saveTournamentSetup(id, {
      formats: [],
      structureMode: "groups_knockout",
      categories,
      categoryConfigs,
    });
    setStatusMessage("Category setup saved.");
    return true;
  };

  React.useEffect(() => {
    if (!id) return;
    saveTournamentSetup(id, {
      formats: [],
      structureMode: "groups_knockout",
      categories,
      categoryConfigs,
    });
  }, [categoryConfigs, categories, id]);

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

    const nextGroups = {
      ...groupsByCategory,
      [selectedCategory.id]: generatedGroups,
    };
    persistGroups({
      ...nextGroups,
    });
    setCategoryConfigs((prev) => ({
      ...prev,
      [selectedCategory.id]: {
        ...selectedConfig,
        bracketMatches,
      },
    }));
    void syncTournamentGroupsForCategory(
      selectedCategory.id,
      generatedGroups,
      teamsByCategory[selectedCategory.id] ?? [],
    );
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

      const nextGroups = {
        ...groupsByCategory,
        [categoryId]: generatedGroups,
      };
      persistGroups({
        ...nextGroups,
      });
      setCategoryConfigs((prev) => ({
        ...prev,
        [categoryId]: {
          ...cfg,
          bracketMatches,
        },
      }));
      void syncTournamentGroupsForCategory(
        categoryId,
        generatedGroups,
        teamsByCategory[categoryId] ?? [],
      );
      setError(null);
      return true;
    },
    [categoryConfigs, groupsByCategory, syncTournamentGroupsForCategory, teamsByCategory],
  );

  const persistGroups = (next: Record<string, GroupBucket[]>) => {
    setGroupsByCategory(next);
    if (!id) return;
    saveTournamentGroups(id, next);
  };

  function buildScheduleItemsForCategory(
    categoryId: string,
    cfg: CategorySetupConfig,
  ): CategoryScheduleItem[] {
      const groups = groupsByCategory[categoryId] ?? [];
      const teams = teamsByCategory[categoryId] ?? [];
      const teamNameById = new Map(
        teams.map((team) => [String(team.id), getTeamDisplayName(team)] as const),
      );
      const resolveLabel = (value: string) => {
        const key = String(value ?? "").trim();
        return teamNameById.get(key) ?? (key || "TBD");
      };

      const scheduledDate =
        String(cfg.scheduleDate ?? "").trim() ||
        (event?.startDate ? String(event.startDate).slice(0, 10) : "");
      const generatedMatches: Array<{
        label: string;
        groupId?: number;
        round: string;
        homeTeamId?: number;
        awayTeamId?: number;
      }> = [];
      groups.forEach((group) => {
        const numericGroupId = Number(group.id);
        const groupId =
          Number.isFinite(numericGroupId) && numericGroupId > 0
            ? numericGroupId
            : undefined;
        const participants = (group.participants ?? [])
          .map((participant) => String(participant ?? "").trim())
          .filter(Boolean);
        for (let i = 0; i < participants.length; i += 1) {
          for (let j = i + 1; j < participants.length; j += 1) {
            const homeTeamId = Number(participants[i]);
            const awayTeamId = Number(participants[j]);
            generatedMatches.push({
              label: `${group.name}: ${resolveLabel(participants[i])} vs ${resolveLabel(participants[j])}`,
              groupId,
              round: "GROUP",
              homeTeamId:
                Number.isFinite(homeTeamId) && homeTeamId > 0 ? homeTeamId : undefined,
              awayTeamId:
                Number.isFinite(awayTeamId) && awayTeamId > 0 ? awayTeamId : undefined,
            });
          }
        }
      });

      (cfg.bracketMatches ?? []).forEach((match) => {
        const homeTeamId = Number(String(match.home ?? "").trim());
        const awayTeamId = Number(String(match.away ?? "").trim());
        generatedMatches.push({
          label: `${match.name}: ${resolveLabel(String(match.home ?? ""))} vs ${resolveLabel(String(match.away ?? ""))}`,
          round: normalizeRoundForApi(match.round),
          homeTeamId:
            Number.isFinite(homeTeamId) && homeTeamId > 0 ? homeTeamId : undefined,
          awayTeamId:
            Number.isFinite(awayTeamId) && awayTeamId > 0 ? awayTeamId : undefined,
        });
      });

      const uniqueMatches = Array.from(
        new Map(
          generatedMatches
            .filter((item) => item.label)
            .map((item) => [
              `${item.groupId ?? "na"}::${item.round}::${item.homeTeamId ?? "na"}::${item.awayTeamId ?? "na"}::${item.label}`,
              item,
            ]),
        ).values(),
      );
      if (uniqueMatches.length === 0) return [];

      const venues = String(cfg.scheduleVenue ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const effectiveVenues = venues.length > 0 ? venues : ["Court 1"];

      const startMinutes = parseTimeToMinutes(cfg.scheduleStartTime) ?? 9 * 60;
      const endMinutes = parseTimeToMinutes(cfg.scheduleEndTime) ?? 18 * 60;
      const requestedBufferMinutes = Math.max(
        0,
        Number(cfg.scheduleBufferMinutes ?? 10),
      );
      const rounds = Math.max(1, Math.ceil(uniqueMatches.length / effectiveVenues.length));
      const totalWindow = Math.max(1, endMinutes - startMinutes);
      const slotSpan = Math.max(1, Math.floor(totalWindow / rounds));
      const bufferMinutes = Math.min(requestedBufferMinutes, Math.max(0, slotSpan - 1));
      const matchDuration = Math.max(1, slotSpan - bufferMinutes);

      return uniqueMatches.map((item, idx) => {
        const roundIndex = Math.floor(idx / effectiveVenues.length);
        const venue = effectiveVenues[idx % effectiveVenues.length];
        const itemStart = startMinutes + roundIndex * slotSpan;
        const itemEnd = Math.min(endMinutes, itemStart + matchDuration);
        return {
          id: `sched_${categoryId}_${idx + 1}`,
          matchLabel: item.label,
          startTime: formatMinutesToTime(itemStart),
          endTime: formatMinutesToTime(itemEnd),
          venue,
          groupId: item.groupId,
          round: item.round,
          homeTeamId: item.homeTeamId,
          awayTeamId: item.awayTeamId,
          matchDate: scheduledDate,
          status: "SCHEDULED",
        };
      });
  }

  const createMatchViaApi = React.useCallback(
    async (
      categoryId: string,
      item: Omit<CategoryScheduleItem, "id"> & { id?: string },
    ): Promise<CategoryScheduleItem | null> => {
      const token = getToken();
      if (!token) return null;
      const parsedCategoryId = Number(categoryId);
      if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) return null;
      if (
        !Number.isFinite(Number(item.homeTeamId)) ||
        Number(item.homeTeamId) <= 0 ||
        !Number.isFinite(Number(item.awayTeamId)) ||
        Number(item.awayTeamId) <= 0
      ) {
        return null;
      }

      const payload = {
        ...(Number.isFinite(Number(item.groupId)) && Number(item.groupId) > 0
          ? { groupId: Number(item.groupId) }
          : { categoryId: parsedCategoryId }),
        round: String(item.round ?? "GROUP"),
        homeTeamId: Number(item.homeTeamId),
        awayTeamId: Number(item.awayTeamId),
        matchDate: String(item.matchDate ?? ""),
        startTime: toApiTime(item.startTime),
        venue: String(item.venue ?? ""),
        status: String(item.status ?? "SCHEDULED"),
      };

      const res = await fetch(`${API_URL}/matches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message?.[0] || body?.error || "Failed to create match.");
      }
      const backendMatchId = Number(body?.id ?? body?.data?.id);
      return {
        ...item,
        id: item.id ?? `sched_${categoryId}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        backendMatchId:
          Number.isFinite(backendMatchId) && backendMatchId > 0
            ? backendMatchId
            : undefined,
      };
    },
    [],
  );

  const updateMatchViaApi = React.useCallback(
    async (categoryId: string, item: CategoryScheduleItem): Promise<boolean> => {
      const token = getToken();
      if (!token) return false;
      const matchId = Number(item.backendMatchId);
      if (!Number.isFinite(matchId) || matchId <= 0) return false;
      const parsedCategoryId = Number(categoryId);
      if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) return false;

      const payload = {
        ...(Number.isFinite(Number(item.groupId)) && Number(item.groupId) > 0
          ? { groupId: Number(item.groupId) }
          : { categoryId: parsedCategoryId }),
        round: String(item.round ?? "GROUP"),
        homeTeamId: Number(item.homeTeamId),
        awayTeamId: Number(item.awayTeamId),
        matchDate: String(item.matchDate ?? ""),
        startTime: toApiTime(item.startTime),
        venue: String(item.venue ?? ""),
        status: String(item.status ?? "SCHEDULED"),
      };

      const res = await fetch(`${API_URL}/matches/${matchId}`, {
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
      return true;
    },
    [],
  );

  const deleteMatchViaApi = React.useCallback(async (backendMatchId?: number) => {
    const token = getToken();
    if (!token) return;
    const parsedId = Number(backendMatchId);
    if (!Number.isFinite(parsedId) || parsedId <= 0) return;
    const res = await fetch(`${API_URL}/matches/${parsedId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.message?.[0] || body?.error || "Failed to delete match.");
    }
  }, []);

  const loadMatchesForCategory = React.useCallback(
    async (categoryId: string) => {
      const token = getToken();
      if (!token) return;
      const parsedCategoryId = Number(categoryId);
      if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) return;

      try {
        const res = await fetch(`${API_URL}/matches?categoryId=${parsedCategoryId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            body?.message?.[0] || body?.error || "Failed to load matches.",
          );
        }

        const rawItems: ApiMatchDto[] = Array.isArray(body)
          ? body
          : Array.isArray(body?.data)
            ? body.data
            : Array.isArray(body?.items)
              ? body.items
              : Array.isArray(body?.results)
                ? body.results
                : [];
        const teams = teamsByCategory[categoryId] ?? [];
        const teamNameById = new Map(
          teams.map((team) => [Number(team.id), getTeamDisplayName(team)] as const),
        );
        const mappedItems = rawItems.reduce<CategoryScheduleItem[]>(
          (acc, item, idx) => {
            const row = item as Record<string, any>;
            const backendMatchId = Number(item.id ?? row.matchId ?? row.match_id);
            const homeTeamId = Number(
              item.homeTeamId ??
                row.home_team_id ??
                row.homeTeam?.id ??
                row.home_team?.id,
            );
            const awayTeamId = Number(
              item.awayTeamId ??
                row.away_team_id ??
                row.awayTeam?.id ??
                row.away_team?.id,
            );
            if (
              !Number.isFinite(backendMatchId) ||
              backendMatchId <= 0 ||
              !Number.isFinite(homeTeamId) ||
              homeTeamId <= 0 ||
              !Number.isFinite(awayTeamId) ||
              awayTeamId <= 0
            ) {
              return acc;
            }
            const groupId = Number(item.groupId ?? row.group?.id ?? row.group_id);
            const homeName =
              String(
                item.homeTeamName ??
                  row.homeTeam?.name ??
                  row.home_team?.name ??
                  "",
              ).trim() ||
              teamNameById.get(homeTeamId) ||
              `Team #${homeTeamId}`;
            const awayName =
              String(
                item.awayTeamName ??
                  row.awayTeam?.name ??
                  row.away_team?.name ??
                  "",
              ).trim() ||
              teamNameById.get(awayTeamId) ||
              `Team #${awayTeamId}`;
            acc.push({
              id: `sched_${categoryId}_${backendMatchId}_${idx + 1}`,
              backendMatchId,
              groupId: Number.isFinite(groupId) && groupId > 0 ? groupId : undefined,
              round: String(item.round ?? row.stage ?? "GROUP"),
              homeTeamId,
              awayTeamId,
              matchDate: String(item.matchDate ?? row.match_date ?? ""),
              startTime: fromApiTime(item.startTime ?? row.start_time),
              endTime: "",
              venue: String(item.venue ?? row.court ?? row.field ?? ""),
              status: String(item.status ?? row.matchStatus ?? "SCHEDULED"),
              matchLabel: `${homeName} vs ${awayName}`,
            });
            return acc;
          },
          [],
        );

        setCategoryConfigs((prev) => {
          const current = prev[categoryId];
          if (!current) return prev;
          const existingItems = current.scheduleItems ?? [];
          const localOnlyItems = existingItems.filter(
            (row) =>
              !Number.isFinite(Number(row.backendMatchId)) ||
              Number(row.backendMatchId) <= 0,
          );
          const merged = [...localOnlyItems, ...mappedItems];
          const dedupedByIdentity = Array.from(
            new Map(
              merged.map((row) => [
                Number.isFinite(Number(row.backendMatchId)) && Number(row.backendMatchId) > 0
                  ? `backend:${Number(row.backendMatchId)}`
                  : `local:${normalizeMatchIdentity(row) ?? row.id}`,
                row,
              ]),
            ).values(),
          );
          return {
            ...prev,
            [categoryId]: {
              ...current,
              scheduleItems: dedupedByIdentity,
            },
          };
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load matches.");
      }
    },
    [teamsByCategory],
  );

  React.useEffect(() => {
    if (activeTab !== "schedule" || !selectedCategoryId) return;
    void loadMatchesForCategory(selectedCategoryId);
  }, [activeTab, selectedCategoryId, loadMatchesForCategory]);

  const getScheduleDraft = React.useCallback(
    (categoryId: string, cfg?: CategorySetupConfig): ScheduleDraftInput => {
      const fallbackDate =
        String(cfg?.scheduleDate ?? "").trim() ||
        (event?.startDate ? String(event.startDate).slice(0, 10) : "");
      return (
        scheduleDraftByCategory[categoryId] ?? {
          groupId: "",
          round: "GROUP",
          homeTeamId: "",
          awayTeamId: "",
          matchDate: fallbackDate,
          startTime: String(cfg?.scheduleStartTime ?? ""),
          venue:
            String(cfg?.scheduleVenue ?? "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)[0] ?? "",
          status: "SCHEDULED",
        }
      );
    },
    [event?.startDate, scheduleDraftByCategory],
  );

  const setScheduleDraft = React.useCallback(
    (
      categoryId: string,
      updater: (current: ScheduleDraftInput) => ScheduleDraftInput,
      cfg?: CategorySetupConfig,
    ) => {
      setScheduleDraftByCategory((prev) => {
        const current = prev[categoryId] ?? getScheduleDraft(categoryId, cfg);
        return { ...prev, [categoryId]: updater(current) };
      });
    },
    [getScheduleDraft],
  );

  const createManualMatchForCategory = React.useCallback(
    async (categoryId: string, cfg: CategorySetupConfig) => {
      const draft = getScheduleDraft(categoryId, cfg);
      const homeTeamId = Number(draft.homeTeamId);
      const awayTeamId = Number(draft.awayTeamId);
      if (!Number.isFinite(homeTeamId) || homeTeamId <= 0) {
        setError("Select a valid Home Team.");
        return;
      }
      if (!Number.isFinite(awayTeamId) || awayTeamId <= 0) {
        setError("Select a valid Away Team.");
        return;
      }
      if (homeTeamId === awayTeamId) {
        setError("Home and away team must be different.");
        return;
      }
      if (!draft.matchDate || !draft.startTime || !draft.venue.trim()) {
        setError("Match date, start time, and court/field are required.");
        return;
      }
      const candidateIdentity = normalizeMatchIdentity({
        groupId:
          Number.isFinite(Number(draft.groupId)) && Number(draft.groupId) > 0
            ? Number(draft.groupId)
            : undefined,
        round: draft.round || "GROUP",
        homeTeamId,
        awayTeamId,
      });
      const existingKeys = new Set(
        (cfg.scheduleItems ?? [])
          .map((item) => normalizeMatchIdentity(item))
          .filter((key): key is string => Boolean(key)),
      );
      if (candidateIdentity && existingKeys.has(candidateIdentity)) {
        setError("This match already exists in the schedule.");
        return;
      }

      setMatchesPostingByCategory((prev) => ({ ...prev, [categoryId]: true }));
      setError(null);
      try {
        const teams = teamsByCategory[categoryId] ?? [];
        const nameById = new Map(teams.map((team) => [Number(team.id), getTeamDisplayName(team)]));
        const created = await createMatchViaApi(categoryId, {
          matchLabel: `${nameById.get(homeTeamId) ?? `Team #${homeTeamId}`} vs ${nameById.get(awayTeamId) ?? `Team #${awayTeamId}`}`,
          startTime: draft.startTime,
          endTime: "",
          venue: draft.venue.trim(),
          groupId:
            Number.isFinite(Number(draft.groupId)) && Number(draft.groupId) > 0
              ? Number(draft.groupId)
              : undefined,
          round: draft.round || "GROUP",
          homeTeamId,
          awayTeamId,
          matchDate: draft.matchDate,
          status: draft.status || "SCHEDULED",
        });
        if (!created) {
          setError("Could not create match with current details.");
          return;
        }
        setCategoryConfigs((prev) => {
          const current = prev[categoryId] ?? cfg;
          return {
            ...prev,
            [categoryId]: {
              ...current,
              scheduleItems: [...(current.scheduleItems ?? []), created],
            },
          };
        });
        setScheduleDraft(categoryId, (current) => ({
          ...current,
          homeTeamId: "",
          awayTeamId: "",
        }), cfg);
        setStatusMessage("Match created.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create match.");
      } finally {
        setMatchesPostingByCategory((prev) => ({ ...prev, [categoryId]: false }));
      }
    },
    [createMatchViaApi, getScheduleDraft, setScheduleDraft, teamsByCategory],
  );

  const createRandomMatchesForCategory = React.useCallback(
    async (categoryId: string, cfg: CategorySetupConfig) => {
      const startMinutes = parseTimeToMinutes(cfg.scheduleStartTime);
      const endMinutes = parseTimeToMinutes(cfg.scheduleEndTime);
      if (
        startMinutes != null &&
        endMinutes != null &&
        Number.isFinite(startMinutes) &&
        Number.isFinite(endMinutes) &&
        endMinutes <= startMinutes
      ) {
        setError("End time must be later than start time to generate matches.");
        return;
      }
      setMatchesPostingByCategory((prev) => ({ ...prev, [categoryId]: true }));
      setError(null);
      try {
        const generatedItems = buildScheduleItemsForCategory(categoryId, cfg).filter(
          (item) =>
            Number.isFinite(Number(item.homeTeamId)) &&
            Number(item.homeTeamId) > 0 &&
            Number.isFinite(Number(item.awayTeamId)) &&
            Number(item.awayTeamId) > 0,
        );
        const existingKeys = new Set(
          (cfg.scheduleItems ?? [])
            .map((item) => normalizeMatchIdentity(item))
            .filter((key): key is string => Boolean(key)),
        );
        const dedupedItems = generatedItems.filter((item) => {
          const key = normalizeMatchIdentity(item);
          if (!key) return false;
          if (existingKeys.has(key)) return false;
          existingKeys.add(key);
          return true;
        });
        if (dedupedItems.length === 0) {
          setError("No valid team-vs-team matches available to generate.");
          return;
        }
        const createdItems: CategoryScheduleItem[] = [];
        for (const item of dedupedItems) {
          const created = await createMatchViaApi(categoryId, item);
          if (created) createdItems.push(created);
        }
        setCategoryConfigs((prev) => {
          const current = prev[categoryId] ?? cfg;
          return {
            ...prev,
            [categoryId]: {
              ...current,
              scheduleItems: [...(current.scheduleItems ?? []), ...createdItems],
            },
          };
        });
        setStatusMessage(
          `Randomly generated and created ${createdItems.length} match(es) without duplicates.`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate matches.");
      } finally {
        setMatchesPostingByCategory((prev) => ({ ...prev, [categoryId]: false }));
      }
    },
    [buildScheduleItemsForCategory, createMatchViaApi],
  );

  const finalizeCategorySetup = React.useCallback(async (categoryId: string) => {
    setError(null);
    setFinalizingSetupByCategory((prev) => ({ ...prev, [categoryId]: true }));
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setFinalizedSetupByCategory((prev) => ({ ...prev, [categoryId]: true }));
      setStatusMessage("Category setup finalized.");
    } finally {
      setFinalizingSetupByCategory((prev) => ({ ...prev, [categoryId]: false }));
    }
  }, []);

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

            {/* Right: Stats + Action */}
            <Stack spacing={1.25} alignItems={{ xs: "stretch", lg: "flex-end" }}>
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
                            (c) =>
                              c.hasTeams &&
                              Boolean(c.structure) &&
                              ((c.structure === "groups_knockout" &&
                                c.hasGroups &&
                                c.hasBracket) ||
                                ((c.structure === "group_phase_only" ||
                                  c.structure === "swiss") &&
                                  c.hasGroups) ||
                                (c.structure === "knockout_only" &&
                                  c.hasBracket)) &&
                              c.hasSchedule,
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
              <Button
                variant="contained"
                startIcon={<PlayArrowRoundedIcon />}
                onClick={() => {
                  if (!id) return;
                  navigate(`/tournaments/${id}/run`);
                }}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 700,
                  minHeight: 42,
                  px: 2.25,
                  bgcolor: "#FFFFFF",
                  color: "#FFFFFF",
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.16)",
                  "&:hover": {
                    bgcolor: "#FFF7ED",
                  },
                }}
              >
                Run Tournament
              </Button>
            </Stack>
          </Stack>
        </Box>

        {isCategorySetupMode ? (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
              <Button
                startIcon={<ArrowBackRoundedIcon />}
                variant="text"
                onClick={backToCategoryList}
                sx={{ px: 0.5 }}
              >
                Back to Category List
              </Button>
              <Typography sx={{ color: "#6A7282" }}>
                {selectedCategoryDisplayName || selectedCategory?.name || "Category Setup"}
              </Typography>
            </Stack>
            <Box
              sx={{
                borderRadius: "0 0 14px 14px",
                overflow: "hidden",
                bgcolor: "#F9FAFB",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              <Tabs
                value={categoryTabsValue}
                onChange={(_, value: Exclude<SetupTab, "overview">) => {
                  setError(null);
                  setActiveTab(value);
                  if (selectedCategoryId) updateSetupQuery(selectedCategoryId, value);
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
                <Tab value="teams" label="Teams" />
                <Tab value="categories" label="Structure" />
                <Tab value="groups" label="Groups & Brackets" />
                <Tab value="schedule" label="Schedule" />
              </Tabs>
            </Box>
          </Box>
        ) : null}

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
              true ? (
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2.5}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: "14px",
                          bgcolor: "#F9FAFB",
                          border: "1px solid #E5E7EB",
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                            mb: 0.75,
                            color: "#101828",
                            fontSize: "1.05rem",
                          }}
                        >
                          Tournament overview
                        </Typography>
                        <Stack spacing={0.5}>
                          <Typography
                            sx={{ color: "#4A5565", fontSize: "0.92rem" }}
                          >
                            1. Open a category to start managing it.
                          </Typography>
                          <Typography
                            sx={{ color: "#4A5565", fontSize: "0.92rem" }}
                          >
                            2. Start in Teams, then move through the other tabs as needed.
                          </Typography>
                          <Typography
                            sx={{ color: "#4A5565", fontSize: "0.92rem" }}
                          >
                            3. Structure, groups, and schedule load as you work through that category.
                          </Typography>
                        </Stack>
                      </Box>

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
                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: "1fr",
                                gap: 1.25,
                              }}
                            >
                              {section.items.map((item) => {
                                return (
                                  <Box
                                    key={item.id}
                                    onClick={() =>
                                      openCategorySetup(item.id, "teams")
                                    }
                                    sx={{
                                      p: 2,
                                      borderRadius: "14px",
                                      border: "1px solid #E5E7EB",
                                      bgcolor: "white",
                                      display: "flex",
                                      flexDirection: { xs: "column", md: "row" },
                                      alignItems: { xs: "flex-start", md: "center" },
                                      gap: 2,
                                      cursor: "pointer",
                                      transition: "all 120ms ease",
                                      "&:hover": {
                                        borderColor: "#8B5CF6",
                                        boxShadow:
                                          "0 2px 8px rgba(139,92,246,0.10)",
                                      },
                                    }}
                                  >
                                    <Stack
                                      direction={{ xs: "column", md: "row" }}
                                      alignItems={{ xs: "flex-start", md: "center" }}
                                      justifyContent="space-between"
                                      spacing={1.5}
                                      sx={{ width: "100%" }}
                                    >
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
                                        <Box sx={{ minWidth: 0 }}>
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
                                          <Typography
                                            sx={{
                                              color: "#6A7282",
                                              fontSize: "0.9rem",
                                            }}
                                          >
                                            {item.format} format
                                          </Typography>
                                        </Box>
                                      </Stack>

                                      <Button
                                        variant="contained"
                                        endIcon={<NavigateNextRoundedIcon />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openCategorySetup(item.id, "teams");
                                        }}
                                        sx={{
                                          borderRadius: "10px",
                                          minWidth: 170,
                                          flexShrink: 0,
                                        }}
                                      >
                                        Open Teams
                                      </Button>
                                    </Stack>
                                  </Box>
                                );
                              })}
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ) : (
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
                        3. Complete Teams, Structure, then Groups & Brackets.
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
                                    openCategorySetup(item.id, "teams");
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
                                        item.hasTeams
                                          ? "Teams: Set"
                                          : "Teams: Pending"
                                      }
                                      sx={{
                                        bgcolor: item.hasTeams ? "#8B5CF6" : "#E5E7EB",
                                        color: item.hasTeams ? "white" : "#4A5565",
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
                                        item.structure === "groups_knockout"
                                          ? item.hasGroups && item.hasBracket
                                            ? "Groups & Brackets: Set"
                                            : "Groups & Brackets: Pending"
                                          : item.structure === "group_phase_only" ||
                                              item.structure === "swiss"
                                            ? item.hasGroups
                                              ? "Groups & Brackets: Set"
                                              : "Groups & Brackets: Pending"
                                            : item.structure === "knockout_only"
                                              ? item.hasBracket
                                                ? "Groups & Brackets: Set"
                                                : "Groups & Brackets: Pending"
                                              : "Groups & Brackets: Pending"
                                      }
                                      sx={{
                                        bgcolor:
                                          (item.structure === "groups_knockout" &&
                                            item.hasGroups &&
                                            item.hasBracket) ||
                                          ((item.structure === "group_phase_only" ||
                                            item.structure === "swiss") &&
                                            item.hasGroups) ||
                                          (item.structure === "knockout_only" &&
                                            item.hasBracket)
                                            ? "#8B5CF6"
                                            : "#E5E7EB",
                                        color:
                                          (item.structure === "groups_knockout" &&
                                            item.hasGroups &&
                                            item.hasBracket) ||
                                          ((item.structure === "group_phase_only" ||
                                            item.structure === "swiss") &&
                                            item.hasGroups) ||
                                          (item.structure === "knockout_only" &&
                                            item.hasBracket)
                                            ? "white"
                                            : "#4A5565",
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
                                        item.hasSchedule
                                          ? "Schedule: Set"
                                          : "Schedule: Pending"
                                      }
                                      sx={{
                                        bgcolor: item.hasSchedule ? "#8B5CF6" : "#E5E7EB",
                                        color: item.hasSchedule ? "white" : "#4A5565",
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
                                        openCategorySetup(item.id, "teams");
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
                                              onClick={async () => {
                                                const ok = await syncCategoryStructure(
                                                  item.id,
                                                  inlineConfig,
                                                );
                                                if (!ok) return;
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
                                                  openCategorySetup(item.id, "groups");
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
                                              persistGroups({
                                                ...groupsByCategory,
                                                [item.id]: nextGroups,
                                              });
                                              void syncTournamentGroupsForCategory(
                                                item.id,
                                                nextGroups,
                                                inlineTeams,
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
              )
            ) : null}

            {activeTab === "teams" ? (
              selectedCategory ? (
                <TeamsTab
                  selectedCategoryId={selectedCategory.id}
                  selectedCategoryLevel={selectedCategoryLevel}
                  selectedCategoryDisplayName={selectedCategoryDisplayName}
                  selectedCategoryTeams={teamsByCategory[selectedCategory.id] ?? []}
                  teamEditor={getCategoryTeamEditor(selectedCategory.id)}
                  relevantPlayers={registeredPlayers.filter((player) =>
                    player.categoryIds.includes(selectedCategory.id),
                  )}
                  selectablePlayers={(() => {
                    const teamEditor = getCategoryTeamEditor(selectedCategory.id);
                    const selectedCategoryTeams = teamsByCategory[selectedCategory.id] ?? [];
                    const relevantPlayers = registeredPlayers.filter((player) =>
                      player.categoryIds.includes(selectedCategory.id),
                    );
                    const assignedUserIds = new Set(
                      selectedCategoryTeams
                        .filter((team) => team.id !== teamEditor.editingTeamId)
                        .flatMap((team) =>
                          (team.members ?? []).map((member) => String(member.userId)),
                        ),
                    );
                    return relevantPlayers.filter(
                      (player) =>
                        !assignedUserIds.has(player.id) ||
                        teamEditor.memberUserIds.includes(player.id),
                    );
                  })()}
                  assignedUserIds={(() => {
                    const teamEditor = getCategoryTeamEditor(selectedCategory.id);
                    const selectedCategoryTeams = teamsByCategory[selectedCategory.id] ?? [];
                    return new Set(
                      selectedCategoryTeams
                        .filter((team) => team.id !== teamEditor.editingTeamId)
                        .flatMap((team) =>
                          (team.members ?? []).map((member) => String(member.userId)),
                        ),
                    );
                  })()}
                  registeredPlayersLoading={registeredPlayersLoading}
                  registeredPlayersError={registeredPlayersError}
                  teamsTabSubmitting={Boolean(
                    teamsSubmittingByCategory[selectedCategory.id],
                  )}
                  unassignedPlayersCount={unassignedPlayersCountForTeamsTab}
                  showContinueWarning={showTeamsTabContinueWarning}
                  onTeamEditorChange={(updater) =>
                    setCategoryTeamEditor(selectedCategory.id, updater)
                  }
                  onEditTeam={(team) =>
                    setCategoryTeamEditor(selectedCategory.id, () => ({
                      name: team.name ?? "",
                      memberUserIds: (team.members ?? []).map((m) => String(m.userId)),
                      autoNameFromMembers: Boolean(team.autoNameFromMembers),
                      editingTeamId: team.id,
                    }))
                  }
                  onDeleteTeam={(teamId) =>
                    void deleteCategoryTeam(selectedCategory.id, teamId)
                  }
                  onSaveTeam={() => void saveCategoryTeam(selectedCategory.id)}
                  onBackToCategoryList={backToCategoryList}
                  onNextToStructure={() => {
                    if (unassignedPlayersCountForTeamsTab > 0) {
                      setPendingContinueWarningByCategory((prev) => ({
                        ...prev,
                        [selectedCategory.id]: true,
                      }));
                      return;
                    }
                    setPendingContinueWarningByCategory((prev) => ({
                      ...prev,
                      [selectedCategory.id]: false,
                    }));
                    setActiveTab("categories");
                    updateSetupQuery(selectedCategory.id, "categories");
                  }}
                  onDismissContinueWarning={() =>
                    setPendingContinueWarningByCategory((prev) => ({
                      ...prev,
                      [selectedCategory.id]: false,
                    }))
                  }
                  onContinueAnyway={() => {
                    setPendingContinueWarningByCategory((prev) => ({
                      ...prev,
                      [selectedCategory.id]: false,
                    }));
                    setStatusMessage(
                      `Continued with ${unassignedPlayersCountForTeamsTab} unassigned player(s) in ${selectedCategoryDisplayName}.`,
                    );
                    setActiveTab("categories");
                    updateSetupQuery(selectedCategory.id, "categories");
                  }}
                />
              ) : (
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Alert severity="warning">
                      Select a category from Category List first.
                    </Alert>
                  </CardContent>
                </Card>
              )
            ) : null}

            {activeTab === "categories" ? (
              selectedCategory ? (
                <StructureTab
                  selectedCategoryLevel={selectedCategoryLevel}
                  selectedCategoryDisplayName={selectedCategoryDisplayName}
                  selectedCategoryTeamsCount={selectedCategoryTeamsForTab.length}
                  selectedTargetTeamsForStructure={selectedTargetTeamsForStructure}
                  selectedConfig={selectedConfig}
                  structureOptions={STRUCTURE_OPTIONS}
                  hasGroupStructureConfig={hasGroupStructureConfig}
                  canSaveSelectedCategorySetup={canSaveSelectedCategorySetup}
                  onStructureModeChange={(mode) => {
                    if (!selectedConfig) return;
                    setCategoryConfigs((prev) => ({
                      ...prev,
                      [selectedCategory.id]: {
                        ...selectedConfig,
                        structureMode: mode,
                      },
                    }));
                  }}
                  onGroupCountChange={(value) => {
                    if (!selectedConfig) return;
                    setCategoryConfigs((prev) => ({
                      ...prev,
                      [selectedCategory.id]: {
                        ...selectedConfig,
                        groupCount: Math.max(1, value),
                      },
                    }));
                  }}
                  onTeamsPerGroupChange={(value) => {
                    if (!selectedConfig) return;
                    setCategoryConfigs((prev) => ({
                      ...prev,
                      [selectedCategory.id]: {
                        ...selectedConfig,
                        teamsPerGroup: Math.max(4, value),
                      },
                    }));
                  }}
                  onQualifiedPerGroupChange={(value) => {
                    if (!selectedConfig) return;
                    setCategoryConfigs((prev) => ({
                      ...prev,
                      [selectedCategory.id]: {
                        ...selectedConfig,
                        qualifiedPerGroup: Math.max(1, value),
                      },
                    }));
                  }}
                  onBackToTeams={() => {
                    setActiveTab("teams");
                    updateSetupQuery(selectedCategory.id, "teams");
                  }}
                  onNextToGroups={async () => {
                    const saved = await saveSetup();
                    if (!saved) return;
                    if (
                      selectedConfig?.structureMode === "groups_knockout" &&
                      hasGroupStructureConfig
                    ) {
                      generateGroupsAndBracketForSelectedCategory();
                    }
                    setActiveTab("groups");
                    updateSetupQuery(selectedCategory.id, "groups");
                  }}
                />
              ) : (
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Alert severity="warning">
                      Select a category from Category List first.
                    </Alert>
                  </CardContent>
                </Card>
              )
            ) : null}

            {activeTab === "groups" ? (
              selectedCategory ? (
                <GroupsTab
                  selectedCategoryLevel={selectedCategoryLevel}
                  selectedCategoryDisplayName={selectedCategoryDisplayName}
                  structureMode={selectedConfig?.structureMode ?? ""}
                  groups={groupsByCategory[selectedCategory.id] ?? []}
                  bracketMatches={selectedConfig?.bracketMatches ?? []}
                  groupCount={
                    selectedConfig?.groupCount ??
                    Math.max(1, selectedCategory.groups || 2)
                  }
                  teamsPerGroup={selectedConfig?.teamsPerGroup ?? 4}
                  qualifiersPerGroup={selectedConfig?.qualifiedPerGroup ?? 1}
                  entryLabel={selectedEntryLabel}
                  availableEntries={(teamsByCategory[selectedCategory.id] ?? []).map((team) => ({
                    value: String(team.id),
                    label: getTeamDisplayName(team),
                  }))}
                  resolveEntryLabel={(value) => {
                    const team = (teamsByCategory[selectedCategory.id] ?? []).find(
                      (candidate) => String(candidate.id) === String(value),
                    );
                    return team ? getTeamDisplayName(team) : String(value ?? "");
                  }}
                  onGroupsChange={(nextGroups) => {
                    persistGroups({
                      ...groupsByCategory,
                      [selectedCategory.id]: nextGroups,
                    });
                    void syncTournamentGroupsForCategory(
                      selectedCategory.id,
                      nextGroups,
                      teamsByCategory[selectedCategory.id] ?? [],
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
                  onBackToStructure={() => {
                    setActiveTab("categories");
                    updateSetupQuery(selectedCategory.id, "categories");
                  }}
                  onNextToSchedule={() => {
                    setActiveTab("schedule");
                    updateSetupQuery(selectedCategory.id, "schedule");
                  }}
                />
              ) : (
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Alert severity="info">
                      Select a category in the Teams tab first.
                    </Alert>
                  </CardContent>
                </Card>
              )
            ) : null}

            {activeTab === "schedule" ? (
              selectedCategory ? (
                <ScheduleTab
                  selectedCategoryLevel={selectedCategoryLevel}
                  selectedCategoryDisplayName={selectedCategoryDisplayName}
                  canFinalizeSelectedCategory={canFinalizeSelectedCategory}
                  finalizeDisabledReason={finalizeDisabledReason}
                  selectedCategoryIsFinalizing={selectedCategoryIsFinalizing}
                  selectedCategoryIsFinalized={selectedCategoryIsFinalized}
                  onFinalize={() => void finalizeCategorySetup(selectedCategory.id)}
                  onGoToRunTournament={() => {
                    if (!id) return;
                    navigate(`/tournaments/${id}/run`);
                  }}
                  creatorContent={
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: "10px",
                        bgcolor: "#F9FAFB",
                        border: "1px solid #E5E7EB",
                      }}
                    >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: { xs: "flex-start", md: "center" },
                            gap: 1,
                            mb: 1.25,
                            flexDirection: { xs: "column", md: "row" },
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 700,
                              color: "#101828",
                              fontSize: "0.95rem",
                            }}
                          >
                            Create Matches
                          </Typography>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setActiveTab("groups");
                              if (selectedCategory?.id) {
                                updateSetupQuery(selectedCategory.id, "groups");
                              }
                            }}
                            sx={{ borderRadius: "10px" }}
                          >
                            Back: Groups & Brackets
                          </Button>
                        </Box>

                        {selectedCategory && selectedConfig ? (
                          <Stack
                            spacing={1.25}
                          >
                            <Button
                              variant="outlined"
                              onClick={() =>
                                void createRandomMatchesForCategory(
                                  selectedCategory.id,
                                  selectedConfig,
                                )
                              }
                              disabled={Boolean(matchesPostingByCategory[selectedCategory.id])}
                              sx={{ borderRadius: "10px", textTransform: "none" }}
                            >
                              Randomly Generate Matches
                            </Button>
                            

                            {(() => {
                              const draft = getScheduleDraft(
                                selectedCategory.id,
                                selectedConfig,
                              );
                              const categoryGroups =
                                groupsByCategory[selectedCategory.id] ?? [];
                              const categoryTeams =
                                teamsByCategory[selectedCategory.id] ?? [];
                              const selectedGroup = categoryGroups.find(
                                (group) => String(group.id) === String(draft.groupId),
                              );
                              const groupTeamIds = new Set(
                                (selectedGroup?.participants ?? [])
                                  .map((participant) => Number(String(participant).trim()))
                                  .filter((teamId) => Number.isFinite(teamId) && teamId > 0),
                              );
                              const selectableTeams =
                                selectedGroup != null
                                  ? categoryTeams.filter((team) =>
                                      groupTeamIds.has(Number(team.id)),
                                    )
                                  : categoryTeams;
                              return (
                                <Stack spacing={1}>
                                  <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    spacing={1}
                                  >
                                    <TextField
                                      label="Group (optional)"
                                      select
                                      fullWidth
                                      value={draft.groupId}
                                      onChange={(e) =>
                                        setScheduleDraft(
                                          selectedCategory.id,
                                          (current) => ({
                                            ...current,
                                            groupId: e.target.value,
                                          }),
                                          selectedConfig,
                                        )
                                      }
                                    >
                                      <MenuItem value="">No Group</MenuItem>
                                      {categoryGroups.map((group) => (
                                        <MenuItem key={group.id} value={String(group.id)}>
                                          {group.name}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                    <TextField
                                      label="Round"
                                      select
                                      fullWidth
                                      value={draft.round}
                                      onChange={(e) =>
                                        setScheduleDraft(
                                          selectedCategory.id,
                                          (current) => ({
                                            ...current,
                                            round: e.target.value,
                                          }),
                                          selectedConfig,
                                        )
                                      }
                                    >
                                      <MenuItem value="GROUP">GROUP</MenuItem>
                                      <MenuItem value="QUARTERFINAL">QUARTERFINAL</MenuItem>
                                      <MenuItem value="SEMIFINAL">SEMIFINAL</MenuItem>
                                      <MenuItem value="FINAL">FINAL</MenuItem>
                                    </TextField>
                                  </Stack>

                                  <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    spacing={1}
                                  >
                                    <TextField
                                      label="Home Team"
                                      select
                                      fullWidth
                                      value={draft.homeTeamId}
                                      disabled={selectedGroup != null && selectableTeams.length === 0}
                                      onChange={(e) =>
                                        setScheduleDraft(
                                          selectedCategory.id,
                                          (current) => ({
                                            ...current,
                                            homeTeamId: e.target.value,
                                          }),
                                          selectedConfig,
                                        )
                                      }
                                    >
                                      <MenuItem value="">Select home team</MenuItem>
                                      {selectableTeams.map((team) => (
                                        <MenuItem key={`home-${team.id}`} value={String(team.id)}>
                                          {getTeamDisplayName(team)}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                    <TextField
                                      label="Away Team"
                                      select
                                      fullWidth
                                      value={draft.awayTeamId}
                                      disabled={selectedGroup != null && selectableTeams.length === 0}
                                      onChange={(e) =>
                                        setScheduleDraft(
                                          selectedCategory.id,
                                          (current) => ({
                                            ...current,
                                            awayTeamId: e.target.value,
                                          }),
                                          selectedConfig,
                                        )
                                      }
                                    >
                                      <MenuItem value="">Select away team</MenuItem>
                                      {selectableTeams.map((team) => (
                                        <MenuItem key={`away-${team.id}`} value={String(team.id)}>
                                          {getTeamDisplayName(team)}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                  </Stack>

                                  <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    spacing={1}
                                  >
                                    <TextField
                                      label="Match date"
                                      type="date"
                                      fullWidth
                                      value={draft.matchDate}
                                      onChange={(e) =>
                                        setScheduleDraft(
                                          selectedCategory.id,
                                          (current) => ({
                                            ...current,
                                            matchDate: e.target.value,
                                          }),
                                          selectedConfig,
                                        )
                                      }
                                      InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                      label="Start time"
                                      type="time"
                                      fullWidth
                                      value={draft.startTime}
                                      onChange={(e) =>
                                        setScheduleDraft(
                                          selectedCategory.id,
                                          (current) => ({
                                            ...current,
                                            startTime: e.target.value,
                                          }),
                                          selectedConfig,
                                        )
                                      }
                                      InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                      label="Court / Field"
                                      fullWidth
                                      value={draft.venue}
                                      onChange={(e) =>
                                        setScheduleDraft(
                                          selectedCategory.id,
                                          (current) => ({
                                            ...current,
                                            venue: e.target.value,
                                          }),
                                          selectedConfig,
                                        )
                                      }
                                    />
                                    <TextField
                                      label="Status"
                                      select
                                      fullWidth
                                      value={draft.status}
                                      onChange={(e) =>
                                        setScheduleDraft(
                                          selectedCategory.id,
                                          (current) => ({
                                            ...current,
                                            status: e.target.value,
                                          }),
                                          selectedConfig,
                                        )
                                      }
                                    >
                                      <MenuItem value="SCHEDULED">SCHEDULED</MenuItem>
                                      <MenuItem value="IN_PROGRESS">IN_PROGRESS</MenuItem>
                                      <MenuItem value="COMPLETED">COMPLETED</MenuItem>
                                    </TextField>
                                  </Stack>

                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "flex-end",
                                    }}
                                  >
                                    <Button
                                      variant="contained"
                                      onClick={() =>
                                        void createManualMatchForCategory(
                                          selectedCategory.id,
                                          selectedConfig,
                                        )
                                      }
                                      disabled={Boolean(
                                        matchesPostingByCategory[selectedCategory.id],
                                      )}
                                      sx={{ borderRadius: "10px" }}
                                    >
                                      Add Match
                                    </Button>
                                  </Box>
                                </Stack>
                              );
                            })()}
                          </Stack>
                        ) : null}
                      </Box>
                  }
                  overviewContent={
                    (selectedConfig?.scheduleItems?.length ?? 0) > 0 ? (
                      <Box
                        sx={{
                          mt: 1,
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
                              mb: 1,
                            }}
                          >
                            Schedule Overview
                          </Typography>
                          {(() => {
                            const currentConfig: CategorySetupConfig =
                              selectedConfigResolved ?? {
                                formats: [inferFormatFromCategoryName(selectedCategory.name)],
                                structureMode: "",
                                bracketMatches: [],
                              };
                            const selectedConfig = currentConfig;
                            const categoryGroups =
                              groupsByCategory[selectedCategory.id] ?? [];
                            const groupNameById = new Map(
                              categoryGroups
                                .map((group) => [Number(group.id), group.name] as const)
                                .filter(([groupId]) => Number.isFinite(groupId) && groupId > 0),
                            );
                            const grouped = new Map<string, CategoryScheduleItem[]>();
                            (selectedConfig?.scheduleItems ?? []).forEach((item) => {
                              const groupId = Number(item.groupId);
                              const key =
                                Number.isFinite(groupId) && groupId > 0
                                  ? groupNameById.get(groupId) ?? `Group ${groupId}`
                                  : "No Group";
                              const current = grouped.get(key) ?? [];
                              grouped.set(key, [...current, item]);
                            });
                            const ordered = Array.from(grouped.entries()).sort((a, b) => {
                              if (a[0] === "No Group") return 1;
                              if (b[0] === "No Group") return -1;
                              return a[0].localeCompare(b[0]);
                            });
                            return (
                              <Stack spacing={1.5}>
                                {ordered.map(([groupName, matches]) => (
                                  <Box key={groupName}>
                                    <Typography
                                      sx={{
                                        fontWeight: 700,
                                        fontSize: "0.85rem",
                                        color: "#6A7282",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.03em",
                                        mb: 0.75,
                                      }}
                                    >
                                      {groupName}
                                    </Typography>
                                    <Stack spacing={1}>
                                      {matches.map((item, idx) => (
                                        <Box
                                          key={item.id}
                                          sx={{
                                            p: 1.25,
                                            borderRadius: "10px",
                                            border: "1px solid #E5E7EB",
                                            bgcolor: "#FFFFFF",
                                          }}
                                        >
                                          {(() => {
                                            const categoryTeams =
                                              teamsByCategory[selectedCategory.id] ?? [];
                                            const teamNameById = new Map(
                                              categoryTeams.map((team) => [
                                                Number(team.id),
                                                getTeamDisplayName(team),
                                              ]),
                                            );
                                            const isEditing =
                                              editingScheduleItemByCategory[
                                                selectedCategory.id
                                              ] === item.id;
                                            const selectedGroup = categoryGroups.find(
                                              (group) =>
                                                String(group.id) === String(item.groupId ?? ""),
                                            );
                                            const groupTeamIds = new Set(
                                              (selectedGroup?.participants ?? [])
                                                .map((participant) =>
                                                  Number(String(participant).trim()),
                                                )
                                                .filter(
                                                  (teamId) =>
                                                    Number.isFinite(teamId) &&
                                                    teamId > 0,
                                                ),
                                            );
                                            const selectableTeams =
                                              selectedGroup != null
                                                ? categoryTeams.filter((team) =>
                                                    groupTeamIds.has(Number(team.id)),
                                                  )
                                                : categoryTeams;
                                            const homeLabel =
                                              teamNameById.get(Number(item.homeTeamId)) ??
                                              `Team #${item.homeTeamId ?? "?"}`;
                                            const awayLabel =
                                              teamNameById.get(Number(item.awayTeamId)) ??
                                              `Team #${item.awayTeamId ?? "?"}`;

                                            if (!isEditing) {
                                              return (
                                                <Stack spacing={0.75}>
                                                  <Stack
                                                    direction={{ xs: "column", md: "row" }}
                                                    spacing={0.75}
                                                    alignItems={{ md: "center" }}
                                                  >
                                                    <Typography
                                                      sx={{
                                                        fontWeight: 600,
                                                        color: "#111827",
                                                        flex: 1,
                                                      }}
                                                    >
                                                      {homeLabel} vs {awayLabel}
                                                    </Typography>
                                                    <Typography
                                                      sx={{ color: "#4B5563", minWidth: 80 }}
                                                    >
                                                      {item.startTime}
                                                    </Typography>
                                                    <Typography
                                                      sx={{ color: "#4B5563", minWidth: 120 }}
                                                    >
                                                      {item.matchDate || "-"}
                                                    </Typography>
                                                    <Typography
                                                      sx={{ color: "#4B5563", minWidth: 120 }}
                                                    >
                                                      {item.venue}
                                                    </Typography>
                                                    <Typography
                                                      sx={{ color: "#4B5563", minWidth: 110 }}
                                                    >
                                                      {item.status || "SCHEDULED"}
                                                    </Typography>
                                                  </Stack>
                                                  <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    justifyContent="flex-end"
                                                  >
                                                    <Button
                                                      size="small"
                                                      variant="outlined"
                                                      onClick={() =>
                                                        setEditingScheduleItemByCategory(
                                                          (prev) => ({
                                                            ...prev,
                                                            [selectedCategory.id]: item.id,
                                                          }),
                                                        )
                                                      }
                                                      sx={{ borderRadius: "8px" }}
                                                    >
                                                      Edit
                                                    </Button>
                                                    <Button
                                                      size="small"
                                                      color="error"
                                                      variant="outlined"
                                                      onClick={() => {
                                                        void (async () => {
                                                          setMatchesPostingByCategory((prev) => ({
                                                            ...prev,
                                                            [selectedCategory.id]: true,
                                                          }));
                                                          setError(null);
                                                          try {
                                                            await deleteMatchViaApi(
                                                              item.backendMatchId,
                                                            );
                                                            setCategoryConfigs((prev) => ({
                                                              ...prev,
                                                              [selectedCategory.id]: {
                                                                ...selectedConfig,
                                                                scheduleItems: (
                                                                  selectedConfig.scheduleItems ??
                                                                  []
                                                                ).filter(
                                                                  (row) =>
                                                                    row.id !== item.id,
                                                                ),
                                                              },
                                                            }));
                                                            setEditingScheduleItemByCategory(
                                                              (prev) => ({
                                                                ...prev,
                                                                [selectedCategory.id]:
                                                                  prev[selectedCategory.id] ===
                                                                  item.id
                                                                    ? null
                                                                    : prev[
                                                                        selectedCategory.id
                                                                      ],
                                                              }),
                                                            );
                                                            setStatusMessage(
                                                              "Match deleted.",
                                                            );
                                                          } catch (err) {
                                                            setError(
                                                              err instanceof Error
                                                                ? err.message
                                                                : "Failed to delete match.",
                                                            );
                                                          } finally {
                                                            setMatchesPostingByCategory(
                                                              (prev) => ({
                                                                ...prev,
                                                                [selectedCategory.id]: false,
                                                              }),
                                                            );
                                                          }
                                                        })();
                                                      }}
                                                      sx={{ borderRadius: "8px" }}
                                                    >
                                                      Delete
                                                    </Button>
                                                  </Stack>
                                                </Stack>
                                              );
                                            }

                                            return (
                                              <Stack spacing={1}>
                                                <Stack
                                                  direction={{ xs: "column", md: "row" }}
                                                  spacing={1}
                                                >
                                                  <TextField
                                                    label="Group"
                                                    select
                                                    fullWidth
                                                    value={String(item.groupId ?? "")}
                                                    onChange={(e) => {
                                                      const value = e.target.value;
                                                      const numeric =
                                                        Number.isFinite(Number(value)) &&
                                                        Number(value) > 0
                                                          ? Number(value)
                                                          : undefined;
                                                      setCategoryConfigs((prev) => ({
                                                        ...prev,
                                                        [selectedCategory.id]: {
                                                          ...selectedConfig,
                                                          scheduleItems: (
                                                            selectedConfig.scheduleItems ??
                                                            []
                                                          ).map((row) =>
                                                            row.id === item.id
                                                              ? {
                                                                  ...row,
                                                                  groupId: numeric,
                                                                }
                                                              : row,
                                                          ),
                                                        },
                                                      }));
                                                    }}
                                                  >
                                                    <MenuItem value="">No Group</MenuItem>
                                                    {categoryGroups.map((group) => (
                                                      <MenuItem
                                                        key={`edit-g-${group.id}`}
                                                        value={String(group.id)}
                                                      >
                                                        {group.name}
                                                      </MenuItem>
                                                    ))}
                                                  </TextField>
                                                  <TextField
                                                    label="Round"
                                                    select
                                                    fullWidth
                                                    value={String(item.round ?? "GROUP")}
                                                    onChange={(e) =>
                                                      setCategoryConfigs((prev) => ({
                                                        ...prev,
                                                        [selectedCategory.id]: {
                                                          ...selectedConfig,
                                                          scheduleItems: (
                                                            selectedConfig.scheduleItems ??
                                                            []
                                                          ).map((row) =>
                                                            row.id === item.id
                                                              ? {
                                                                  ...row,
                                                                  round: e.target.value,
                                                                }
                                                              : row,
                                                          ),
                                                        },
                                                      }))
                                                    }
                                                  >
                                                    <MenuItem value="GROUP">GROUP</MenuItem>
                                                    <MenuItem value="QUARTERFINAL">
                                                      QUARTERFINAL
                                                    </MenuItem>
                                                    <MenuItem value="SEMIFINAL">
                                                      SEMIFINAL
                                                    </MenuItem>
                                                    <MenuItem value="FINAL">FINAL</MenuItem>
                                                  </TextField>
                                                </Stack>

                                                <Stack
                                                  direction={{ xs: "column", md: "row" }}
                                                  spacing={1}
                                                >
                                                  <TextField
                                                    label="Home Team"
                                                    select
                                                    fullWidth
                                                    value={String(item.homeTeamId ?? "")}
                                                    onChange={(e) =>
                                                      setCategoryConfigs((prev) => ({
                                                        ...prev,
                                                        [selectedCategory.id]: {
                                                          ...selectedConfig,
                                                          scheduleItems: (
                                                            selectedConfig.scheduleItems ??
                                                            []
                                                          ).map((row) =>
                                                            row.id === item.id
                                                              ? {
                                                                  ...row,
                                                                  homeTeamId: Number(
                                                                    e.target.value,
                                                                  ),
                                                                }
                                                              : row,
                                                          ),
                                                        },
                                                      }))
                                                    }
                                                    disabled={
                                                      selectedGroup != null &&
                                                      selectableTeams.length === 0
                                                    }
                                                  >
                                                    <MenuItem value="">
                                                      Select home team
                                                    </MenuItem>
                                                    {selectableTeams.map((team) => (
                                                      <MenuItem
                                                        key={`edit-home-${team.id}`}
                                                        value={String(team.id)}
                                                      >
                                                        {getTeamDisplayName(team)}
                                                      </MenuItem>
                                                    ))}
                                                  </TextField>
                                                  <TextField
                                                    label="Away Team"
                                                    select
                                                    fullWidth
                                                    value={String(item.awayTeamId ?? "")}
                                                    onChange={(e) =>
                                                      setCategoryConfigs((prev) => ({
                                                        ...prev,
                                                        [selectedCategory.id]: {
                                                          ...selectedConfig,
                                                          scheduleItems: (
                                                            selectedConfig.scheduleItems ??
                                                            []
                                                          ).map((row) =>
                                                            row.id === item.id
                                                              ? {
                                                                  ...row,
                                                                  awayTeamId: Number(
                                                                    e.target.value,
                                                                  ),
                                                                }
                                                              : row,
                                                          ),
                                                        },
                                                      }))
                                                    }
                                                    disabled={
                                                      selectedGroup != null &&
                                                      selectableTeams.length === 0
                                                    }
                                                  >
                                                    <MenuItem value="">
                                                      Select away team
                                                    </MenuItem>
                                                    {selectableTeams.map((team) => (
                                                      <MenuItem
                                                        key={`edit-away-${team.id}`}
                                                        value={String(team.id)}
                                                      >
                                                        {getTeamDisplayName(team)}
                                                      </MenuItem>
                                                    ))}
                                                  </TextField>
                                                </Stack>

                                                <Stack
                                                  direction={{ xs: "column", md: "row" }}
                                                  spacing={1}
                                                >
                                                  <TextField
                                                    label="Match date"
                                                    type="date"
                                                    fullWidth
                                                    value={String(item.matchDate ?? "")}
                                                    onChange={(e) =>
                                                      setCategoryConfigs((prev) => ({
                                                        ...prev,
                                                        [selectedCategory.id]: {
                                                          ...selectedConfig,
                                                          scheduleItems: (
                                                            selectedConfig.scheduleItems ??
                                                            []
                                                          ).map((row) =>
                                                            row.id === item.id
                                                              ? {
                                                                  ...row,
                                                                  matchDate: e.target.value,
                                                                }
                                                              : row,
                                                          ),
                                                        },
                                                      }))
                                                    }
                                                    InputLabelProps={{ shrink: true }}
                                                  />
                                                  <TextField
                                                    label="Start time"
                                                    type="time"
                                                    fullWidth
                                                    value={item.startTime}
                                                    onChange={(e) =>
                                                      setCategoryConfigs((prev) => ({
                                                        ...prev,
                                                        [selectedCategory.id]: {
                                                          ...selectedConfig,
                                                          scheduleItems: (
                                                            selectedConfig.scheduleItems ??
                                                            []
                                                          ).map((row) =>
                                                            row.id === item.id
                                                              ? {
                                                                  ...row,
                                                                  startTime: e.target.value,
                                                                }
                                                              : row,
                                                          ),
                                                        },
                                                      }))
                                                    }
                                                    InputLabelProps={{ shrink: true }}
                                                  />
                                                  <TextField
                                                    label="Court / Field"
                                                    fullWidth
                                                    value={item.venue}
                                                    onChange={(e) =>
                                                      setCategoryConfigs((prev) => ({
                                                        ...prev,
                                                        [selectedCategory.id]: {
                                                          ...selectedConfig,
                                                          scheduleItems: (
                                                            selectedConfig.scheduleItems ??
                                                            []
                                                          ).map((row) =>
                                                            row.id === item.id
                                                              ? {
                                                                  ...row,
                                                                  venue: e.target.value,
                                                                }
                                                              : row,
                                                          ),
                                                        },
                                                      }))
                                                    }
                                                  />
                                                  <TextField
                                                    label="Status"
                                                    select
                                                    fullWidth
                                                    value={String(item.status ?? "SCHEDULED")}
                                                    onChange={(e) =>
                                                      setCategoryConfigs((prev) => ({
                                                        ...prev,
                                                        [selectedCategory.id]: {
                                                          ...selectedConfig,
                                                          scheduleItems: (
                                                            selectedConfig.scheduleItems ??
                                                            []
                                                          ).map((row) =>
                                                            row.id === item.id
                                                              ? {
                                                                  ...row,
                                                                  status: e.target.value,
                                                                }
                                                              : row,
                                                          ),
                                                        },
                                                      }))
                                                    }
                                                  >
                                                    <MenuItem value="SCHEDULED">
                                                      SCHEDULED
                                                    </MenuItem>
                                                    <MenuItem value="IN_PROGRESS">
                                                      IN_PROGRESS
                                                    </MenuItem>
                                                    <MenuItem value="COMPLETED">
                                                      COMPLETED
                                                    </MenuItem>
                                                  </TextField>
                                                </Stack>

                                                <Stack
                                                  direction="row"
                                                  spacing={1}
                                                  justifyContent="flex-end"
                                                >
                                                  <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() =>
                                                      setEditingScheduleItemByCategory(
                                                        (prev) => ({
                                                          ...prev,
                                                          [selectedCategory.id]: null,
                                                        }),
                                                      )
                                                    }
                                                    sx={{ borderRadius: "8px" }}
                                                  >
                                                    Cancel
                                                  </Button>
                                                  <Button
                                                    size="small"
                                                    variant="contained"
                                                    onClick={() => {
                                                      void (async () => {
                                                        const homeTeamId = Number(
                                                          item.homeTeamId,
                                                        );
                                                        const awayTeamId = Number(
                                                          item.awayTeamId,
                                                        );
                                                        if (
                                                          !Number.isFinite(homeTeamId) ||
                                                          homeTeamId <= 0 ||
                                                          !Number.isFinite(awayTeamId) ||
                                                          awayTeamId <= 0
                                                        ) {
                                                          setError(
                                                            "Home and away teams are required.",
                                                          );
                                                          return;
                                                        }
                                                        if (homeTeamId === awayTeamId) {
                                                          setError(
                                                            "Home and away team must be different.",
                                                          );
                                                          return;
                                                        }
                                                        if (
                                                          !String(item.matchDate ?? "").trim() ||
                                                          !String(item.startTime ?? "").trim() ||
                                                          !String(item.venue ?? "")
                                                            .trim()
                                                        ) {
                                                          setError(
                                                            "Match date, start time, and venue are required.",
                                                          );
                                                          return;
                                                        }

                                                        const duplicateKey =
                                                          normalizeMatchIdentity(item);
                                                        const hasDuplicate =
                                                          Boolean(duplicateKey) &&
                                                          (selectedConfig.scheduleItems ?? [])
                                                            .filter(
                                                              (row) =>
                                                                row.id !== item.id,
                                                            )
                                                            .map((row) =>
                                                              normalizeMatchIdentity(row),
                                                            )
                                                            .filter(Boolean)
                                                            .includes(duplicateKey);
                                                        if (hasDuplicate) {
                                                          setError(
                                                            "Another match with the same teams/group/round already exists.",
                                                          );
                                                          return;
                                                        }

                                                        setMatchesPostingByCategory(
                                                          (prev) => ({
                                                            ...prev,
                                                            [selectedCategory.id]: true,
                                                          }),
                                                        );
                                                        setError(null);
                                                        try {
                                                          const nextLabel = `${
                                                            teamNameById.get(
                                                              Number(item.homeTeamId),
                                                            ) ??
                                                            `Team #${item.homeTeamId ?? "?"}`
                                                          } vs ${
                                                            teamNameById.get(
                                                              Number(item.awayTeamId),
                                                            ) ??
                                                            `Team #${item.awayTeamId ?? "?"}`
                                                          }`;
                                                          let nextRow: CategoryScheduleItem = {
                                                            ...item,
                                                            matchLabel: nextLabel,
                                                          };
                                                          if (
                                                            Number.isFinite(
                                                              Number(item.backendMatchId),
                                                            ) &&
                                                            Number(item.backendMatchId) > 0
                                                          ) {
                                                            await updateMatchViaApi(
                                                              selectedCategory.id,
                                                              nextRow,
                                                            );
                                                          } else {
                                                            const created =
                                                              await createMatchViaApi(
                                                                selectedCategory.id,
                                                                nextRow,
                                                              );
                                                            if (created) nextRow = created;
                                                          }
                                                          setCategoryConfigs((prev) => ({
                                                            ...prev,
                                                            [selectedCategory.id]: {
                                                              ...selectedConfig,
                                                              scheduleItems: (
                                                                selectedConfig.scheduleItems ??
                                                                []
                                                              ).map((row) =>
                                                                row.id === item.id
                                                                  ? nextRow
                                                                  : row,
                                                              ),
                                                            },
                                                          }));
                                                          setEditingScheduleItemByCategory(
                                                            (prev) => ({
                                                              ...prev,
                                                              [selectedCategory.id]: null,
                                                            }),
                                                          );
                                                          setStatusMessage(
                                                            "Match updated.",
                                                          );
                                                        } catch (err) {
                                                          setError(
                                                            err instanceof Error
                                                              ? err.message
                                                              : "Failed to update match.",
                                                          );
                                                        } finally {
                                                          setMatchesPostingByCategory(
                                                            (prev) => ({
                                                              ...prev,
                                                              [selectedCategory.id]:
                                                                false,
                                                            }),
                                                          );
                                                        }
                                                      })();
                                                    }}
                                                    sx={{ borderRadius: "8px" }}
                                                  >
                                                    Save
                                                  </Button>
                                                </Stack>
                                              </Stack>
                                            );
                                          })()}
                                          <Typography
                                            sx={{ mt: 0.75, color: "#6B7280", fontSize: "0.8rem" }}
                                          >
                                            Match {idx + 1}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Stack>
                                  </Box>
                                ))}
                              </Stack>
                            );
                          })()}
                      </Box>
                    ) : null
                  }
                />
              ) : (
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Alert severity="info">
                      Select a category in the Teams tab first.
                    </Alert>
                  </CardContent>
                </Card>
              )
            ) : null}
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
}
