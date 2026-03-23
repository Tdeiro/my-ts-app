import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Tab,
  Tabs,
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
import type { BuilderBracketMatch } from "../Components/Shared/TournamentPhaseBuilder";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import {
  entryLabelFromFormat,
  extractLevelFromCategoryName,
  inferDisciplineFromCategory,
  inferFormatFromCategoryName,
  stripLevelPrefixFromCategoryName,
  STRUCTURE_OPTIONS,
} from "./tournament-setup/helpers";
import { useTournamentSetupNavigation } from "./tournament-setup/hooks";
import {
  type ApiEvent,
  type ApiEventDetailsCategory,
  type ApiEventDetailsResponse,
  type ApiTournamentCategory,
  type CategoryScheduleItem,
  type CategorySetupConfig,
  type SetupTab,
  type StructureMode,
  type TeamDto,
  type TournamentFormat,
} from "./tournament-setup/types";
import { TeamsTab } from "./tournament-setup/TeamsTab";
import { StructureTab } from "./tournament-setup/StructureTab";
import { GroupsTab } from "./tournament-setup/GroupsTab";
import { ScheduleTab } from "./tournament-setup/ScheduleTab";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const EMPTY_TEAMS: TeamDto[] = [];
const EMPTY_GROUPS: GroupBucket[] = [];
const EMPTY_BRACKET_MATCHES: BuilderBracketMatch[] = [];

type ApiTournamentCategoryStructure = {
  categoryId?: number | string;
  structureType?: string;
  numberOfGroups?: number | string;
  teamsPerGroup?: number | string;
  qualifiedPerGroup?: number | string;
};

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
  const [activeTab, setActiveTab] = React.useState<SetupTab>("overview");
  const [hasPersistedStructureByCategory, setHasPersistedStructureByCategory] =
    React.useState<Record<string, boolean>>({});
  const [teamsByCategory, setTeamsByCategory] = React.useState<
    Record<string, TeamDto[]>
  >({});
  const [groupsByCategory, setGroupsByCategory] = React.useState<
    Record<string, GroupBucket[]>
  >({});

  React.useEffect(() => {
    if (!id) return;
    setGroupsByCategory(loadTournamentGroups(id));
  }, [id]);

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
        const nextTeamsMap: Record<string, TeamDto[]> = {};
        rawCategories.forEach((cat) => {
          const categoryKey = String(cat.id);
          const mappedGroups = mapEmbeddedGroups(cat);
          nextGroupsMap[categoryKey] = mappedGroups;
          nextTeamsMap[categoryKey] = mapEmbeddedTeams(cat);
        });
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

  const loadTeamsForCategory = React.useCallback(async (categoryId: string) => {
    const token = getToken();
    if (!token) return [];
    const parsedCategoryId = Number(categoryId);
    if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) return [];
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
    }
  }, []);

  React.useEffect(() => {
    if (
      (activeTab !== "groups" &&
        activeTab !== "schedule") ||
      !selectedCategoryId
    ) {
      return;
    }
    void loadTeamsForCategory(selectedCategoryId);
  }, [activeTab, selectedCategoryId, loadTeamsForCategory]);

  const handleCategoryTeamsChange = React.useCallback(
    (categoryId: string, nextTeams: TeamDto[]) => {
      setTeamsByCategory((prev) => ({ ...prev, [categoryId]: nextTeams }));

      const validTeamIds = new Set(
        nextTeams
          .map((team) => Number(team.id))
          .filter((teamId) => Number.isFinite(teamId) && teamId > 0)
          .map((teamId) => String(teamId)),
      );
      const currentGroups = groupsByCategory[categoryId] ?? [];
      const cleanedGroups = currentGroups.map((group) => ({
        ...group,
        participants: (group.participants ?? []).filter((participant) =>
          validTeamIds.has(String(participant)),
        ),
      }));
      setGroupsByCategory((prev) => {
        const next = { ...prev, [categoryId]: cleanedGroups };
        if (id) saveTournamentGroups(id, next);
        return next;
      });
    },
    [groupsByCategory, id],
  );

  const handleSelectedCategoryTeamsChange = React.useCallback(
    (nextTeams: TeamDto[]) => {
      if (!selectedCategoryId) return;
      handleCategoryTeamsChange(selectedCategoryId, nextTeams);
    },
    [handleCategoryTeamsChange, selectedCategoryId],
  );

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
  const selectedFormat = inferFormatFromCategoryName(selectedCategory?.name);
  const selectedEntryLabel = entryLabelFromFormat(selectedFormat);
  const selectedCategoryTeamsForTab = selectedCategory
    ? (teamsByCategory[selectedCategory.id] ?? EMPTY_TEAMS)
    : EMPTY_TEAMS;
  const selectedCategoryGroupsForTab = selectedCategory
    ? (groupsByCategory[selectedCategory.id] ?? EMPTY_GROUPS)
    : EMPTY_GROUPS;
  const selectedCategoryBracketMatchesForTab =
    selectedConfig?.bracketMatches ?? EMPTY_BRACKET_MATCHES;
  const handleScheduleSaved = React.useCallback(
    (categoryId: string, categoryName: string, nextItems: CategoryScheduleItem[]) => {
      setCategoryConfigs((prev) => ({
        ...prev,
        [categoryId]: {
          ...(prev[categoryId] ?? {
            formats: [inferFormatFromCategoryName(categoryName)],
            structureMode: "",
          }),
          scheduleItems: nextItems,
        },
      }));
    },
    [],
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
      setActiveTab,
    });

  const isCategorySetupMode = Boolean(selectedCategoryId);
  const categoryTabsValue: Exclude<SetupTab, "overview"> =
    activeTab === "teams" || activeTab === "groups" || activeTab === "schedule"
      ? activeTab
      : "categories";

  React.useEffect(() => {
    if (!id) return;
    saveTournamentSetup(id, {
      formats: [],
      structureMode: "groups_knockout",
      categories,
      categoryConfigs,
    });
  }, [categoryConfigs, categories, id]);

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
                    {Number(event?.subscriptionsCount ?? 0)}
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
                        <Typography sx={{ color: "#4A5565", fontSize: "0.92rem" }}>
                          1. Open a category to start managing it.
                        </Typography>
                        <Typography sx={{ color: "#4A5565", fontSize: "0.92rem" }}>
                          2. Start in Teams, then move through Structure, Groups, and Schedule as needed.
                        </Typography>
                        <Typography sx={{ color: "#4A5565", fontSize: "0.92rem" }}>
                          3. Each tab loads and saves its own data for the selected category.
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
                            {section.items.map((item) => (
                              <Box
                                key={item.id}
                                onClick={() => openCategorySetup(item.id, "teams")}
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
                                    boxShadow: "0 2px 8px rgba(139,92,246,0.10)",
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
                                        {stripLevelPrefixFromCategoryName(item.name, section.level)}
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
                            ))}
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "teams" ? (
              selectedCategory ? (
                <TeamsTab
                  eventId={String(id ?? "")}
                  selectedCategoryId={selectedCategory.id}
                  selectedCategoryLevel={selectedCategoryLevel}
                  selectedCategoryDisplayName={selectedCategoryDisplayName}
                  initialTeams={teamsByCategory[selectedCategory.id] ?? []}
                  onTeamsChange={handleSelectedCategoryTeamsChange}
                  onBackToCategoryList={backToCategoryList}
                  onNextToStructure={() => {
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
                  selectedCategoryId={selectedCategory.id}
                  selectedCategoryLevel={selectedCategoryLevel}
                  selectedCategoryDisplayName={selectedCategoryDisplayName}
                  selectedCategoryTeamsCount={selectedCategoryTeamsForTab.length}
                  initialConfig={selectedConfig}
                  initialHasPersistedStructure={
                    hasPersistedStructureByCategory[selectedCategory.id] ?? false
                  }
                  structureOptions={STRUCTURE_OPTIONS}
                  onStructureSaved={(nextConfig) =>
                    setCategoryConfigs((prev) => ({
                      ...prev,
                      [selectedCategory.id]: nextConfig,
                    }))
                  }
                  onPersistedChange={(value) =>
                    setHasPersistedStructureByCategory((prev) => ({
                      ...prev,
                      [selectedCategory.id]: value,
                    }))
                  }
                  onBackToTeams={() => {
                    setActiveTab("teams");
                    updateSetupQuery(selectedCategory.id, "teams");
                  }}
                  onNextToGroups={() => {
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
                  selectedCategoryId={selectedCategory.id}
                  selectedCategoryLevel={selectedCategoryLevel}
                  selectedCategoryDisplayName={selectedCategoryDisplayName}
                  structureMode={selectedConfig?.structureMode ?? ""}
                  initialGroups={selectedCategoryGroupsForTab}
                  initialBracketMatches={selectedCategoryBracketMatchesForTab}
                  initialGroupCount={
                    selectedConfig?.groupCount ??
                    Math.max(1, selectedCategory.groups || 2)
                  }
                  teamsPerGroup={selectedConfig?.teamsPerGroup ?? 2}
                  qualifiersPerGroup={selectedConfig?.qualifiedPerGroup ?? 1}
                  entryLabel={selectedEntryLabel}
                  teams={selectedCategoryTeamsForTab}
                  onGroupsSaved={({ groups, bracketMatches, groupCount }) => {
                    persistGroups({
                      ...groupsByCategory,
                      [selectedCategory.id]: groups,
                    });
                    setCategoryConfigs((prev) => ({
                      ...prev,
                      [selectedCategory.id]: {
                        ...(prev[selectedCategory.id] ?? {
                          formats: [inferFormatFromCategoryName(selectedCategory.name)],
                          structureMode: "",
                        }),
                        groupCount,
                        bracketMatches,
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
                  selectedCategoryId={selectedCategory.id}
                  selectedCategoryLevel={selectedCategoryLevel}
                  selectedCategoryDisplayName={selectedCategoryDisplayName}
                  selectedConfig={selectedConfig}
                  eventStartDate={String(event?.startDate ?? "")}
                  groups={selectedCategoryGroupsForTab}
                  teams={selectedCategoryTeamsForTab}
                  onBackToGroups={() => {
                    setActiveTab("groups");
                    updateSetupQuery(selectedCategory.id, "groups");
                  }}
                  onScheduleSaved={(nextItems) => {
                    handleScheduleSaved(
                      selectedCategory.id,
                      selectedCategory.name,
                      nextItems,
                    );
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
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
}
