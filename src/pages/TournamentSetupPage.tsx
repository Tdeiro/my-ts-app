import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
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
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ShuffleOutlinedIcon from "@mui/icons-material/ShuffleOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";

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

type StructureMode =
  | "groups_knockout"
  | "knockout_only"
  | "group_phase_only"
  | "swiss";
type TournamentFormat = "Singles" | "Doubles" | "Teams";
type SetupTab = "overview" | "categories" | "teams" | "drawing" | "groups";
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

function entryLabelFromFormat(format?: TournamentFormat): string {
  if (format === "Singles") return "Player";
  if (format === "Doubles") return "Pair";
  return "Team";
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

        const nextGroupsMap: Record<string, GroupBucket[]> = {};
        const nextServerIdsMap: Record<string, number[]> = {};
        groupFetches.forEach(({ categoryKey, groups }) => {
          const mappedGroups: GroupBucket[] = groups.map((g) => ({
            id: String(g.id),
            name: String(g.name ?? "Group"),
            participants: [],
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
  const categoriesOverview = React.useMemo(
    () =>
      categories.map((cat) => {
        const cfg = categoryConfigs[cat.id];
        const groups = groupsByCategory[cat.id] ?? [];
        const hasGroups =
          groups.length > 0 &&
          groups.some((g) =>
            g.participants.some((p) => String(p).trim().length > 0),
          );
        const hasBracket = (cfg?.bracketMatches?.length ?? 0) > 0;
        return {
          id: cat.id,
          name: cat.name,
          format: inferFormatFromCategoryName(cat.name),
          structure: cfg?.structureMode ?? "",
          hasGroups,
          hasBracket,
        };
      }),
    [categories, categoryConfigs, groupsByCategory],
  );

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

  const applySelectedStructureToAllCategories = () => {
    if (!selectedCategory || !selectedConfig) return;
    const selectedStructure = selectedConfig.structureMode;
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
    setStatusMessage(`Applied ${selectedStructure} structure to all categories.`);
  };

  const applySelectedGroupInputsToAllCategories = () => {
    if (!selectedCategory || !selectedConfig) return;
    if (selectedConfig.structureMode !== "groups_knockout") return;
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
    ).map((group, idx) => ({
      ...group,
      id: `g_${selectedCategory.id}_${idx + 1}`,
      name: `Group ${groupLetter(idx)}`,
    }));
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
            <Tab value="drawing" label="Drawing" />
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
                  {/* Blue Info Alert */}
                  <Alert
                    severity="info"
                    sx={{
                      mb: 3,
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
                        mb: 0.5,
                        color: "#1C398E",
                        fontSize: "0.875rem",
                      }}
                    >
                      Setup flow: Category List to Structure to Teams to Groups
                      and Brackets.
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "#1447E6", fontSize: "0.75rem" }}
                    >
                      Open Category List from Overview, pick a category, set
                      structure, then continue with teams and groups.
                    </Typography>
                  </Alert>

                  {/* Setup Progress Section */}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      fontSize: "1.25rem",
                      color: "#101828",
                    }}
                  >
                    Setup Progress
                  </Typography>

                  {/* Overall Completion Progress Bar */}
                  <Box sx={{ mb: 3 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "#364153",
                        }}
                      >
                        Overall Completion
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          color: "#8B5CF6",
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
                    </Stack>
                    <Box
                      sx={{
                        width: "100%",
                        height: 12,
                        bgcolor: "#E5E7EB",
                        borderRadius: "999px",
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          width: `${
                            categories.length > 0
                              ? Math.round(
                                  (categoriesOverview.filter(
                                    (c) =>
                                      c.format && c.structure && c.hasGroups,
                                  ).length /
                                    categories.length) *
                                    100,
                                )
                              : 0
                          }%`,
                          height: "100%",
                          background:
                            "linear-gradient(to right, #8B5CF6, #A855F7)",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Status Cards Grid */}
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    {/* Category List Status Card */}
                    <Box
                      sx={{
                        flex: 1,
                        p: 2,
                        bgcolor: "#F9FAFB",
                        border: "1px solid #E5E7EB",
                        borderRadius: "14px",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                          >
                            <circle
                              cx="10"
                              cy="10"
                              r="9"
                              stroke="#00A63E"
                              strokeWidth="1.67"
                            />
                            <path
                              d="M6 10L9 13L14 7"
                              stroke="#00A63E"
                              strokeWidth="1.67"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Box>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: "1rem",
                            color: "#101828",
                          }}
                        >
                          Category List
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        sx={{ color: "#4A5565", fontSize: "0.875rem" }}
                      >
                        <strong style={{ color: "#101828" }}>
                          {categories.length}
                        </strong>{" "}
                        categories available
                      </Typography>
                    </Box>

                    {/* Structure Status Card */}
                    <Box
                      sx={{
                        flex: 1,
                        p: 2,
                        bgcolor: "#F9FAFB",
                        border: "1px solid #E5E7EB",
                        borderRadius: "14px",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                          >
                            <circle
                              cx="10"
                              cy="10"
                              r="9"
                              stroke="#FF6900"
                              strokeWidth="1.67"
                            />
                            <path
                              d="M10 5V10L13.33 11.67"
                              stroke="#FF6900"
                              strokeWidth="1.67"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Box>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: "1rem",
                            color: "#101828",
                          }}
                        >
                          Structure
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        sx={{ color: "#4A5565", fontSize: "0.875rem" }}
                      >
                        <strong style={{ color: "#101828" }}>
                          {categoriesOverview.filter((c) => c.structure).length}
                        </strong>{" "}
                        of {categories.length} configured
                      </Typography>
                    </Box>

                    {/* Groups Status Card */}
                    <Box
                      sx={{
                        flex: 1,
                        p: 2,
                        bgcolor: "#F9FAFB",
                        border: "1px solid #E5E7EB",
                        borderRadius: "14px",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                          >
                            <circle
                              cx="10"
                              cy="10"
                              r="9"
                              stroke="#99A1AF"
                              strokeWidth="1.67"
                            />
                            <path
                              d="M10 6.67V10"
                              stroke="#99A1AF"
                              strokeWidth="1.67"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <circle
                              cx="10"
                              cy="13.33"
                              r="0.83"
                              fill="#99A1AF"
                            />
                          </svg>
                        </Box>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: "1rem",
                            color: "#101828",
                          }}
                        >
                          Groups
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        sx={{ color: "#4A5565", fontSize: "0.875rem" }}
                      >
                        <strong style={{ color: "#101828" }}>
                          {categoriesOverview.filter((c) => c.hasGroups).length}
                        </strong>{" "}
                        of {categories.length} configured
                      </Typography>
                    </Box>
                  </Stack>

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
                  <Stack spacing={1.5}>
                    {categoriesOverview.map((item) => (
                      <Box
                        key={item.id}
                        onClick={() => {
                          setSelectedCategoryId(item.id);
                          setActiveTab("categories");
                        }}
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
                      >
                        {/* Trophy Icon + Category Name */}
                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="center"
                          sx={{ flex: 1, minWidth: 0 }}
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
                            {item.name}
                          </Typography>
                        </Stack>

                        {/* Status Badges */}
                        <Stack
                          direction="row"
                          spacing={1}
                          useFlexGap
                          flexWrap="wrap"
                          alignItems="center"
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

                          {/* Configure Button */}
                          <Button
                            variant="contained"
                            startIcon={
                              <SettingsOutlinedIcon
                                sx={{ fontSize: "16px !important" }}
                              />
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategoryId(item.id);
                              setActiveTab("categories");
                            }}
                            sx={{
                              bgcolor: "#FF6900",
                              color: "white",
                              fontWeight: 700,
                              fontSize: "0.875rem",
                              height: 36,
                              borderRadius: "10px",
                              px: 2,
                              textTransform: "none",
                              boxShadow: "none",
                              "&:hover": {
                                bgcolor: "#E55800",
                                boxShadow: "none",
                              },
                            }}
                          >
                            Edit Structure
                          </Button>
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
                  {/* Blue Info Alert */}
                  <Alert
                    severity="info"
                    sx={{
                      mb: 3,
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
                      Create teams from registered players. Team size depends on
                      format: Singles (1 player), Doubles (2 players), Teams (3+
                      players).
                    </Typography>
                  </Alert>

                  {/* Select Category */}
                  <Typography
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: "#101828",
                      fontSize: "1.25rem",
                    }}
                  >
                    Select Category
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ mb: 3 }}
                    useFlexGap
                    flexWrap="wrap"
                  >
                    <Chip
                      label="Advanced - Men • 1 teams • 0/3 assigned"
                      onClick={() => {}}
                      sx={{
                        bgcolor: "#8B5CF6",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        height: 40,
                        borderRadius: "10px",
                        px: 2,
                        "&:hover": {
                          bgcolor: "#7C3AED",
                        },
                      }}
                    />
                    <Chip
                      label="Beginner - Mixed • 0 teams • 0/2 assigned"
                      onClick={() => {}}
                      sx={{
                        bgcolor: "#F9FAFB",
                        color: "#4A5565",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        height: 40,
                        borderRadius: "10px",
                        px: 2,
                        border: "1px solid #E5E7EB",
                        "&:hover": {
                          bgcolor: "#F3F4F6",
                        },
                      }}
                    />
                  </Stack>

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
                          1 teams
                        </Typography>
                      </Stack>

                      {/* Team Card */}
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: "white",
                          border: "1px solid #E5E7EB",
                          borderRadius: "10px",
                        }}
                      >
                        {/* Team Header */}
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                          sx={{ mb: 1.5 }}
                        >
                          <Box>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: "1rem",
                                color: "#101828",
                                mb: 0.25,
                              }}
                            >
                              Thunder Strikers
                            </Typography>
                            <Typography
                              sx={{ fontSize: "0.75rem", color: "#6A7282" }}
                            >
                              2/2 members
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            sx={{
                              color: "#FB2C36",
                              fontWeight: 600,
                              fontSize: "0.875rem",
                              textTransform: "none",
                              minWidth: "auto",
                              p: 0,
                              "&:hover": {
                                bgcolor: "transparent",
                                textDecoration: "underline",
                              },
                            }}
                          >
                            Delete
                          </Button>
                        </Stack>

                        {/* Team Members */}
                        <Stack spacing={1}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Box
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                bgcolor: "#F3E8FF",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                              >
                                <path
                                  d="M6 6.5C7.38071 6.5 8.5 5.38071 8.5 4C8.5 2.61929 7.38071 1.5 6 1.5C4.61929 1.5 3.5 2.61929 3.5 4C3.5 5.38071 4.61929 6.5 6 6.5Z"
                                  stroke="#8B5CF6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M2 10.5C2.46667 8.75 3.93333 7.5 6 7.5C8.06667 7.5 9.53333 8.75 10 10.5"
                                  stroke="#8B5CF6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </Box>
                            <Typography
                              sx={{ fontSize: "0.875rem", color: "#364153" }}
                            >
                              John Smith
                            </Typography>
                          </Stack>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Box
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                bgcolor: "#F3E8FF",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                              >
                                <path
                                  d="M6 6.5C7.38071 6.5 8.5 5.38071 8.5 4C8.5 2.61929 7.38071 1.5 6 1.5C4.61929 1.5 3.5 2.61929 3.5 4C3.5 5.38071 4.61929 6.5 6 6.5Z"
                                  stroke="#8B5CF6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M2 10.5C2.46667 8.75 3.93333 7.5 6 7.5C8.06667 7.5 9.53333 8.75 10 10.5"
                                  stroke="#8B5CF6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </Box>
                            <Typography
                              sx={{ fontSize: "0.875rem", color: "#364153" }}
                            >
                              Mike Johnson
                            </Typography>
                          </Stack>
                        </Stack>
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
                            Select Players (0 selected)
                          </Typography>
                          <Stack
                            spacing={1}
                            sx={{ maxHeight: 180, overflowY: "auto" }}
                          >
                            {[
                              { name: "John Smith", email: "john@example.com" },
                              {
                                name: "Mike Johnson",
                                email: "mike@example.com",
                              },
                              {
                                name: "Sarah Williams",
                                email: "sarah@example.com",
                              },
                            ].map((player, idx) => (
                              <Box
                                key={idx}
                                sx={{
                                  p: 1,
                                  borderRadius: "4px",
                                  "&:hover": {
                                    bgcolor: "#F9FAFB",
                                  },
                                  cursor: "pointer",
                                }}
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
                            ))}
                          </Stack>
                        </Box>

                        {/* Create Team Button */}
                        <Button
                          fullWidth
                          disabled
                          sx={{
                            bgcolor: "#D1D5DC",
                            color: "white",
                            fontWeight: 600,
                            fontSize: "1rem",
                            textTransform: "none",
                            height: 40,
                            borderRadius: "10px",
                            "&:hover": {
                              bgcolor: "#D1D5DC",
                            },
                          }}
                        >
                          Create Team
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
                      <Stack spacing={1.5}>
                        {[
                          {
                            name: "John Smith",
                            email: "john@example.com",
                            wants: "Mike Johnson",
                          },
                          {
                            name: "Mike Johnson",
                            email: "mike@example.com",
                            wants: "John Smith",
                          },
                          {
                            name: "Sarah Williams",
                            email: "sarah@example.com",
                            wants: null,
                          },
                        ].map((player, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              p: 1.5,
                              bgcolor: "white",
                              border: "1px solid #E5E7EB",
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
                                {player.wants && (
                                  <Typography
                                    sx={{
                                      fontSize: "0.75rem",
                                      color: "#99A1AF",
                                      fontStyle: "italic",
                                      mt: 0.25,
                                    }}
                                  >
                                    Wants to play with {player.wants}
                                  </Typography>
                                )}
                              </Box>
                              {player.wants && (
                                <Chip
                                  label={`♥ ${player.wants}`}
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
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>

                  {/* Next Button */}
                  <Box
                    sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}
                  >
                    <Button
                      variant="contained"
                      onClick={() => setActiveTab("groups")}
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
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "drawing" ? (
              <Card>
                <CardContent sx={{ p: 3 }}>
                  {/* Blue Info Alert */}
                  <Alert
                    severity="info"
                    sx={{
                      mb: 3,
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
                      Select a category, then use "Random Draw" to automatically
                      assign teams to groups, or manually assign teams using the
                      buttons below each team.
                    </Typography>
                  </Alert>

                  {/* Category Selection */}
                  <Typography
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: "#101828",
                      fontSize: "1.25rem",
                    }}
                  >
                    Select Category for Drawing
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ mb: 3 }}
                    useFlexGap
                    flexWrap="wrap"
                  >
                    <Chip
                      label="Advanced - Men • 8 teams"
                      onClick={() => {}}
                      sx={{
                        bgcolor: "#8B5CF6",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        height: 40,
                        borderRadius: "10px",
                        px: 2,
                        "&:hover": {
                          bgcolor: "#7C3AED",
                        },
                      }}
                    />
                    <Chip
                      label="Beginner - Mixed • 0 teams"
                      onClick={() => {}}
                      sx={{
                        bgcolor: "#F9FAFB",
                        color: "#4A5565",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        height: 40,
                        borderRadius: "10px",
                        px: 2,
                        border: "1px solid #E5E7EB",
                        "&:hover": {
                          bgcolor: "#F3F4F6",
                        },
                      }}
                    />
                  </Stack>

                  {/* Random Draw Button */}
                  <Box
                    sx={{ display: "flex", justifyContent: "center", mb: 3 }}
                  >
                    <Button
                      variant="contained"
                      startIcon={<ShuffleOutlinedIcon />}
                      sx={{
                        background:
                          "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "1.25rem",
                        height: 68,
                        borderRadius: "16px",
                        px: 4,
                        textTransform: "none",
                        boxShadow:
                          "0px 20px 25px 0px rgba(0,0,0,0.1), 0px 8px 10px 0px rgba(0,0,0,0.1)",
                        "&:hover": {
                          background:
                            "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
                        },
                      }}
                    >
                      Random Draw
                    </Button>
                  </Box>

                  {/* Four Groups Grid */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, 1fr)",
                        lg: "repeat(4, 1fr)",
                      },
                      gap: 2,
                      mb: 3,
                    }}
                  >
                    {["A", "B", "C", "D"].map((group) => (
                      <Box
                        key={group}
                        sx={{
                          bgcolor: "white",
                          border: "2px solid #E5E7EB",
                          borderRadius: "14px",
                          overflow: "hidden",
                          boxShadow:
                            "0px 4px 6px -1px rgba(0,0,0,0.1), 0px 2px 4px -2px rgba(0,0,0,0.1)",
                        }}
                      >
                        {/* Group Header with Gradient */}
                        <Box
                          sx={{
                            background:
                              "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                            p: 2,
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: "1.5rem",
                              color: "white",
                              textAlign: "center",
                              mb: 0.5,
                            }}
                          >
                            Group {group}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.875rem",
                              color: "#F3E8FF",
                              textAlign: "center",
                            }}
                          >
                            0 teams
                          </Typography>
                        </Box>

                        {/* Empty State */}
                        <Box
                          sx={{
                            p: 3,
                            bgcolor: "#F9FAFB",
                            minHeight: 172,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                          }}
                        >
                          <PeopleAltOutlinedIcon
                            sx={{ fontSize: 48, color: "#99A1AF" }}
                          />
                          <Typography
                            sx={{
                              fontSize: "0.875rem",
                              fontWeight: 500,
                              color: "#99A1AF",
                            }}
                          >
                            No teams assigned
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  {/* Unassigned Teams Alert */}
                  <Alert
                    severity="warning"
                    sx={{
                      mb: 3,
                      bgcolor: "#FFF4ED",
                      border: "1px solid #FFD6A8",
                      borderRadius: "14px",
                      "& .MuiAlert-icon": {
                        color: "#F97316",
                      },
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
                          color: "#101828",
                          fontSize: "1rem",
                        }}
                      >
                        Unassigned Teams (8)
                      </Typography>
                    </Stack>
                    <Typography
                      sx={{ fontSize: "0.875rem", color: "#4A5565", mt: 0.5 }}
                    >
                      Assign these teams to groups before continuing.
                    </Typography>
                  </Alert>

                  {/* Teams Grid */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, 1fr)",
                        lg: "repeat(4, 1fr)",
                      },
                      gap: 2,
                      mb: 3,
                    }}
                  >
                    {[
                      {
                        name: "Thunder Strikers",
                        members: ["John Smith", "Mike Johnson"],
                      },
                      {
                        name: "Wave Masters",
                        members: ["Sarah Williams", "Alex Turner"],
                      },
                      {
                        name: "Beach Kings",
                        members: ["Ryan Cooper", "Jake Miller"],
                      },
                      {
                        name: "Sand Sharks",
                        members: ["Chris Evans", "Matt Davis"],
                      },
                      {
                        name: "Court Crushers",
                        members: ["Tom Harris", "Ben Wilson"],
                      },
                      {
                        name: "Net Ninjas",
                        members: ["Steve Brown", "Dan White"],
                      },
                      {
                        name: "Spike Squad",
                        members: ["Kevin Lee", "Mark Taylor"],
                      },
                      {
                        name: "Ace Avengers",
                        members: ["Paul Garcia", "Lee Martinez"],
                      },
                    ].map((team, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          bgcolor: "white",
                          border: "1px solid #FFD6A8",
                          borderRadius: "10px",
                          p: 2,
                          boxShadow:
                            "0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px 0px rgba(0,0,0,0.1)",
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "1rem",
                            color: "#101828",
                            mb: 1,
                          }}
                        >
                          {team.name}
                        </Typography>
                        {team.members.map((member, mIdx) => (
                          <Typography
                            key={mIdx}
                            sx={{
                              fontSize: "0.75rem",
                              color: "#4A5565",
                              mb: 0.25,
                            }}
                          >
                            • {member}
                          </Typography>
                        ))}

                        {/* Group Assignment Buttons Grid */}
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: 0.75,
                            mt: 1.5,
                          }}
                        >
                          {["A", "B", "C", "D"].map((group) => (
                            <Button
                              key={group}
                              size="small"
                              sx={{
                                bgcolor: "#8B5CF6",
                                color: "white",
                                fontWeight: 700,
                                fontSize: "0.875rem",
                                height: 36,
                                borderRadius: "4px",
                                textTransform: "none",
                                minWidth: "auto",
                                "&:hover": {
                                  bgcolor: "#7C3AED",
                                },
                              }}
                            >
                              Group {group}
                            </Button>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  {/* Navigation Buttons */}
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Button
                      variant="text"
                      onClick={() => setActiveTab("teams")}
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
                    <Button
                      variant="contained"
                      onClick={() => setActiveTab("groups")}
                      disabled
                      sx={{
                        bgcolor: "#D1D5DC",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "1rem",
                        height: 44,
                        borderRadius: "10px",
                        px: 3,
                        textTransform: "none",
                        boxShadow: "none",
                        "&:hover": {
                          bgcolor: "#D1D5DC",
                          boxShadow: "none",
                        },
                      }}
                    >
                      Confirm & Continue →
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "categories" ? (
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    1. Select a category from Category List. 2. Select a
                    structure. 3. Save and continue to Teams/Groups.
                  </Alert>
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
                  {selectedCategory ? (
                    <Box
                      sx={{
                        mb: 2,
                        p: 2,
                        borderRadius: "12px",
                        bgcolor: "#F3E8FF",
                        border: "1px solid #E9D5FF",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#7C3AED",
                          textTransform: "uppercase",
                          letterSpacing: 0.6,
                          mb: 0.5,
                        }}
                      >
                        Editing Category
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: 800, color: "#4C1D95" }}
                      >
                        {selectedCategory.name}
                      </Typography>
                    </Box>
                  ) : (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Select a category from Category List first.
                    </Alert>
                  )}

                  <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
                    Structure
                  </Typography>
                  <Stack
                    direction="row"
                    justifyContent="flex-end"
                    sx={{ mb: 1.5 }}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={applySelectedStructureToAllCategories}
                      disabled={
                        !selectedCategory ||
                        !selectedConfig ||
                        !selectedConfig.structureMode
                      }
                      sx={{ borderRadius: 999 }}
                    >
                      Apply structure to all categories
                    </Button>
                  </Stack>
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
                        direction="row"
                        justifyContent="flex-end"
                        sx={{ mb: 1.25 }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={applySelectedGroupInputsToAllCategories}
                          sx={{ borderRadius: 999 }}
                        >
                          Apply group inputs to all categories
                        </Button>
                      </Stack>
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
                        Next: Groups.
                      </Typography>
                    </>
                  ) : null}

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.25}
                    sx={{ mt: 2 }}
                  >
                    <Button
                      variant="contained"
                      onClick={saveSetup}
                      disabled={!canSaveSelectedCategorySetup}
                      sx={{ borderRadius: 999 }}
                    >
                      Save Category Setup
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        if (
                          selectedConfig?.structureMode === "groups_knockout" &&
                          hasGroupStructureConfig
                        ) {
                          generateGroupsAndBracketForSelectedCategory();
                        }
                        saveSetup();
                        setActiveTab("groups");
                      }}
                      sx={{ borderRadius: 999 }}
                    >
                      Next: Groups
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
                          p: 2,
                          borderRadius: "12px",
                          bgcolor: "#F3E8FF",
                          border: "1px solid #E9D5FF",
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#7C3AED",
                            textTransform: "uppercase",
                            letterSpacing: 0.6,
                            mb: 0.5,
                          }}
                        >
                          Editing Category
                        </Typography>
                        <Typography
                          variant="h5"
                          sx={{ fontWeight: 800, color: "#4C1D95" }}
                        >
                          {selectedCategory.name}
                        </Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: "#6B21A8" }}>
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
                        structureMode={selectedConfig?.structureMode ?? ""}
                        onGroupsChange={(nextGroups) => {
                          persistGroups({
                            ...groupsByCategory,
                            [selectedCategory.id]: nextGroups,
                          });
                          void syncTournamentGroupsForCategory(
                            selectedCategory.id,
                            nextGroups,
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
