import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
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
type SetupTab = "overview" | "categories" | "groups";
type CategorySetupConfig = {
  formats: TournamentFormat[];
  structureMode: StructureMode | "";
  groupCount?: number;
  teamsPerGroup?: number;
  qualifiedPerGroup?: number;
  bracketMatches?: BuilderBracketMatch[];
};

const FORMAT_OPTIONS: Array<{
  id: TournamentFormat;
  title: string;
  subtitle: string;
}> = [
  { id: "Singles", title: "Singles", subtitle: "1 vs 1 matches" },
  { id: "Doubles", title: "Doubles", subtitle: "2 vs 2 matches" },
  { id: "Teams", title: "Teams", subtitle: "Team fixtures" },
];

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

function inferDisciplineFromCategory(raw: ApiTournamentCategory): TournamentCategory["discipline"] {
  const name = String(raw.name ?? "").toLowerCase();
  const gender = String(raw.gender ?? "").toLowerCase();
  if (name.includes("team")) return "Teams";
  if (name.includes("mixed") || gender.includes("mixed")) return "Mixed Doubles";
  if (gender.includes("women") || gender.includes("female")) return "Doubles Female";
  if (gender.includes("men") || gender.includes("male")) return "Doubles Male";
  return "Singles";
}

function normalizeTournamentFormat(value: string): TournamentFormat | null {
  if (value === "Teams" || value === "Doubles" || value === "Singles") return value;
  return null;
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
  const navigate = useNavigate();
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
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("");
  const [categoryConfigs, setCategoryConfigs] = React.useState<
    Record<string, CategorySetupConfig>
  >({});
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [formatAppliedToAll, setFormatAppliedToAll] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<SetupTab>("overview");
  const [groupsByCategory, setGroupsByCategory] = React.useState<
    Record<string, GroupBucket[]>
  >({});
  const [serverGroupIdsByCategory, setServerGroupIdsByCategory] = React.useState<
    Record<string, number[]>
  >({});
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
            const updateRes = await fetch(`${API_URL}/tournament-groups/${backendId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                categoryId: parsedCategoryId,
                name: group.name,
              }),
            });
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

        const deleteOps = Array.from(serverIds).filter((idToDelete) => !usedIds.has(idToDelete));
        await Promise.all(
          deleteOps.map(async (idToDelete) => {
            const deleteRes = await fetch(`${API_URL}/tournament-groups/${idToDelete}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
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
        groupStructureSignatureRef.current[categoryId] = groupStructureSignature(updated);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to sync tournament groups",
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
        const hasOwnerField = raw.some((e) => e.userId != null || e.user_id != null);
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
        const rawCategories: ApiTournamentCategory[] = Array.isArray(categoriesData)
          ? categoriesData
          : (categoriesData?.data ?? []);
        const savedCategories = saved?.categories ?? [];
        const backendMappedCategories: TournamentCategory[] = rawCategories.map((cat, idx) => {
          const fallbackName = `Category ${idx + 1}`;
          const categoryName = String(cat.name ?? "").trim() || fallbackName;
          const persisted =
            savedCategories.find((sc) => sc.id === String(cat.id)) ??
            savedCategories.find(
              (sc) => sc.name.trim().toLowerCase() === categoryName.toLowerCase(),
            );
          return {
            id: String(cat.id),
            name: categoryName,
            discipline: persisted?.discipline ?? inferDisciplineFromCategory(cat),
            groups: Math.max(1, Number(persisted?.groups ?? 2)),
          };
        });

        if (saved) {
          const savedConfigs = saved.categoryConfigs ?? {};
          const computedConfigs: Record<string, CategorySetupConfig> = {};
          const sourceCategories =
            backendMappedCategories.length > 0 ? backendMappedCategories : saved.categories;
          sourceCategories.forEach((cat) => {
            const current = savedConfigs[String(cat.id)];
            const normalizedFormat = normalizeTournamentFormat(
              String(current?.formats?.[0] ?? ""),
            );
            computedConfigs[String(cat.id)] = {
              formats: normalizedFormat ? [normalizedFormat] : [],
              structureMode: (current?.structureMode as StructureMode) ?? "",
              groupCount:
                typeof current?.groupCount === "number" ? current.groupCount : undefined,
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
              formats: [],
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
              return { categoryKey: String(cat.id), groups: [] as ApiTournamentGroup[] };
            }
            const res = await fetch(
              `${API_URL}/tournament-groups?categoryId=${encodeURIComponent(catId)}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!res.ok) return { categoryKey: String(cat.id), groups: [] as ApiTournamentGroup[] };
            const body = await res.json().catch(() => null);
            const list: ApiTournamentGroup[] = Array.isArray(body) ? body : (body?.data ?? []);
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
            formats: [],
            structureMode: "",
            bracketMatches: [],
          };
        }
      });
      return next;
    });
  }, [categories]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;
  const selectedConfig = selectedCategory
    ? (categoryConfigs[selectedCategory.id] ?? { formats: [], structureMode: "" })
    : undefined;
  const requiresGroupStructure = selectedConfig?.structureMode === "groups_knockout";
  const hasGroupStructureConfig = Boolean(
    selectedConfig &&
      (selectedConfig.groupCount ?? 0) > 0 &&
      (selectedConfig.teamsPerGroup ?? 0) >= 4 &&
      (selectedConfig.qualifiedPerGroup ?? 0) > 0 &&
      (selectedConfig.qualifiedPerGroup ?? 0) <= (selectedConfig.teamsPerGroup ?? 0),
  );
  const canSaveSelectedCategorySetup = Boolean(
    selectedCategory &&
      selectedConfig &&
      selectedConfig.formats.length > 0 &&
      selectedConfig.structureMode &&
      (!requiresGroupStructure || hasGroupStructureConfig),
  );
  const selectedFormat = selectedConfig?.formats?.[0];
  const selectedEntryLabel = entryLabelFromFormat(selectedFormat);
  const categoriesOverview = React.useMemo(
    () =>
      categories.map((cat) => {
        const cfg = categoryConfigs[cat.id];
        const groups = groupsByCategory[cat.id] ?? [];
        const hasGroups =
          groups.length > 0 &&
          groups.some((g) => g.participants.some((p) => String(p).trim().length > 0));
        const hasBracket = (cfg?.bracketMatches?.length ?? 0) > 0;
        return {
          id: cat.id,
          name: cat.name,
          format: cfg?.formats?.[0] ?? "",
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

  const applySelectedFormatToAllCategories = () => {
    if (!selectedCategory || !selectedConfig) return;
    const selectedFormat = selectedConfig.formats[0];
    if (!selectedFormat) return;
    setCategoryConfigs((prev) => {
      const next = { ...prev };
      categories.forEach((cat) => {
        next[cat.id] = {
          ...(next[cat.id] ?? {
            structureMode: "",
          }),
          formats: [selectedFormat],
          structureMode: (next[cat.id]?.structureMode ?? "") as StructureMode | "",
        };
      });
      return next;
    });
    setFormatAppliedToAll(true);
    setStatusMessage(`Applied ${selectedFormat} format to all categories.`);
  };

  const generateGroupsAndBracketForSelectedCategory = () => {
    if (!selectedCategory || !selectedConfig) return;
    const groupCount = Number(selectedConfig.groupCount ?? 0);
    const teamsPerGroup = Number(selectedConfig.teamsPerGroup ?? 0);
    const qualifiedPerGroup = Number(selectedConfig.qualifiedPerGroup ?? 0);
    if (groupCount <= 0 || teamsPerGroup < 4 || qualifiedPerGroup <= 0 || qualifiedPerGroup > teamsPerGroup) {
      setError("Invalid structure. Use: groups > 0, teams/group >= 4, qualified between 1 and teams/group.");
      return;
    }

    const existingTeams =
      groupsByCategory[selectedCategory.id]?.flatMap((g) =>
        (g.participants ?? []).map((p: string) => p.trim()).filter(Boolean),
      ) ?? [];
    const uniqueTeams = Array.from(new Set(existingTeams));

    const generatedGroups = generateGroupsSkeleton(groupCount, teamsPerGroup, uniqueTeams).map(
      (group, idx) => ({
        ...group,
        id: `g_${selectedCategory.id}_${idx + 1}`,
        name: `Group ${groupLetter(idx)}`,
      }),
    );
    const bracketMatches = generateBracketSkeleton(groupCount, qualifiedPerGroup);

    persistGroups({ ...groupsByCategory, [selectedCategory.id]: generatedGroups });
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
        <Paper
          sx={{
            mb: 2,
            p: { xs: 2, sm: 2.5 },
            borderRadius: 2,
            background:
              "linear-gradient(180deg, rgba(139,92,246,0.10) 0%, rgba(255,255,255,0) 70%)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h2" sx={{ mb: 0.5, fontWeight: 900 }}>
                Tournament Setup
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure format and future bracket flow for this tournament.
              </Typography>
            </Box>

            <Button
              variant="outlined"
              onClick={() => navigate("/tournaments")}
              sx={{ borderRadius: 999, alignSelf: { xs: "flex-start", sm: "auto" } }}
            >
              Back to Tournaments
            </Button>
          </Stack>
          <Tabs
            value={activeTab}
            onChange={(_, value: SetupTab) => {
              setError(null);
              setActiveTab(value);
            }}
            sx={{ mt: 2 }}
          >
            <Tab value="overview" label="Overview" />
            <Tab value="categories" label="Categories" />
            <Tab value="groups" label="Groups" />
          </Tabs>
        </Paper>

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
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {event.name || "Untitled Tournament"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {event.locationName || "Venue TBD"} • {event.startDate || "Date TBD"}
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Use tabs to configure this tournament without leaving this page.
                  </Alert>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    Progress
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Category selected: {selectedCategory ? "Yes" : "No"} • Format selected:{" "}
                    {selectedConfig?.formats?.length ? "Yes" : "No"} • Structure selected:{" "}
                    {selectedConfig?.structureMode ? "Yes" : "No"}
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
                    Category Setup Status
                  </Typography>
                  <Stack spacing={0.75}>
                    {categoriesOverview.map((item) => (
                      <Stack
                        key={item.id}
                        role="button"
                        onClick={() => {
                          setSelectedCategoryId(item.id);
                          setFormatAppliedToAll(false);
                          setActiveTab("groups");
                        }}
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ sm: "center" }}
                        sx={{
                          p: 1,
                          borderRadius: 1.25,
                          border: "1px solid rgba(15,23,42,0.10)",
                          bgcolor: "rgba(15,23,42,0.02)",
                          cursor: "pointer",
                          transition: "all 120ms ease",
                          "&:hover": {
                            borderColor: "rgba(139,92,246,0.35)",
                            bgcolor: "rgba(139,92,246,0.08)",
                          },
                        }}
                      >
                        <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                          <Chip
                            size="small"
                            label={item.format ? `Format: ${item.format}` : "Format: Pending"}
                            color={item.format ? "primary" : "default"}
                            variant={item.format ? "filled" : "outlined"}
                          />
                          <Chip
                            size="small"
                            label={item.structure ? "Structure: Set" : "Structure: Pending"}
                            color={item.structure ? "primary" : "default"}
                            variant={item.structure ? "filled" : "outlined"}
                          />
                          <Chip
                            size="small"
                            label={item.hasGroups ? "Groups: Created" : "Groups: Pending"}
                            color={item.hasGroups ? "success" : "default"}
                            variant={item.hasGroups ? "filled" : "outlined"}
                          />
                          <Chip
                            size="small"
                            label={item.hasBracket ? "Bracket: Created" : "Bracket: Pending"}
                            color={item.hasBracket ? "success" : "default"}
                            variant={item.hasBracket ? "filled" : "outlined"}
                          />
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "categories" ? (
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    1. Select a category. 2. Select a format. 3. Select a structure. Save is enabled only after all 3.
                  </Alert>
                  <Typography variant="body1" sx={{ fontWeight: 900, mb: 1 }}>
                    Tournament Categories
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Select a category and configure its format and structure.
                  </Typography>

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                    {categories.length > 0 ? (
                      categories.map((cat) => {
                        const selected = formatAppliedToAll || selectedCategoryId === cat.id;
                        return (
                          <Chip
                            key={cat.id}
                            label={cat.name}
                            clickable
                            onClick={() => {
                              setSelectedCategoryId(cat.id);
                              setFormatAppliedToAll(false);
                            }}
                            variant={selected ? "filled" : "outlined"}
                            sx={{
                              borderRadius: 999,
                              borderColor: selected
                                ? "rgba(139,92,246,0.45)"
                                : "rgba(15,23,42,0.16)",
                              bgcolor: selected
                                ? "rgba(139,92,246,0.16)"
                                : "transparent",
                              color: selected ? "primary.main" : "text.primary",
                              fontWeight: 700,
                            }}
                          />
                        );
                      })
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No categories found for this tournament yet.
                      </Typography>
                    )}
                  </Stack>

                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
                    Tournament Format
                  </Typography>
                  <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={applySelectedFormatToAllCategories}
                      disabled={
                        !selectedCategory ||
                        !selectedConfig ||
                        selectedConfig.formats.length === 0
                      }
                      sx={{ borderRadius: 999 }}
                    >
                      Apply format to all categories
                    </Button>
                  </Stack>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} sx={{ mb: 2 }}>
                    {FORMAT_OPTIONS.map((opt) => {
                      const isSelected = Boolean(selectedConfig?.formats.includes(opt.id));
                      return (
                        <Card
                          key={opt.id}
                          onClick={() => {
                            if (!selectedCategory || !selectedConfig) return;
                            const previousFormat = selectedConfig.formats[0];
                            setCategoryConfigs((prev) => ({
                              ...prev,
                              [selectedCategory.id]: {
                                ...selectedConfig,
                                formats: [opt.id],
                                bracketMatches:
                                  previousFormat && previousFormat !== opt.id
                                    ? []
                                    : selectedConfig.bracketMatches,
                              },
                            }));
                            if (previousFormat && previousFormat !== opt.id) {
                              persistGroups({
                                ...groupsByCategory,
                                [selectedCategory.id]: [],
                              });
                              setStatusMessage(
                                `Format changed to ${opt.id}. Groups and bracket were reset for this category.`,
                              );
                            }
                            setFormatAppliedToAll(false);
                          }}
                          sx={{
                            cursor: selectedCategory ? "pointer" : "not-allowed",
                            flex: 1,
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
                            <Typography sx={{ fontWeight: 800 }}>{opt.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {opt.subtitle}
                            </Typography>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>

                  <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
                    Structure
                  </Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} useFlexGap flexWrap="wrap">
                    {STRUCTURE_OPTIONS.map((opt) => {
                      const isSelected = selectedConfig?.structureMode === opt.id;
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
                            cursor: selectedCategory ? "pointer" : "not-allowed",
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
                            <Typography sx={{ fontWeight: 800 }}>{opt.title}</Typography>
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
                      <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
                        Group Phase Inputs
                      </Typography>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
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
                                groupCount: Math.max(1, Number(e.target.value || 0)),
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
                                teamsPerGroup: Math.max(4, Number(e.target.value || 0)),
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
                                qualifiedPerGroup: Math.max(1, Number(e.target.value || 0)),
                              },
                            }));
                          }}
                          fullWidth
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                        Groups and bracket will be auto-generated when you click Next: Groups.
                      </Typography>
                    </>
                  ) : null}

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mt: 2 }}>
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
                    <Alert severity="info">Select a category in the Categories tab first.</Alert>
                  ) : (
                    <Stack spacing={1.25}>
                      <Alert severity="info">
                        Editing category: <strong>{selectedCategory.name}</strong>
                        {selectedConfig?.formats?.[0]
                          ? ` • ${selectedConfig.formats[0]}`
                          : ""}
                        {selectedConfig?.structureMode
                          ? ` • ${selectedConfig.structureMode}`
                          : ""}
                      </Alert>
                      <TournamentPhaseBuilder
                        groups={groupsByCategory[selectedCategory.id] ?? []}
                        bracketMatches={selectedConfig?.bracketMatches ?? []}
                        groupCount={selectedConfig?.groupCount ?? Math.max(1, selectedCategory.groups || 2)}
                        teamsPerGroup={selectedConfig?.teamsPerGroup ?? 4}
                        qualifiersPerGroup={selectedConfig?.qualifiedPerGroup ?? 1}
                        entryLabel={selectedEntryLabel}
                        structureMode={selectedConfig?.structureMode ?? ""}
                        onGroupsChange={(nextGroups) => {
                          persistGroups({ ...groupsByCategory, [selectedCategory.id]: nextGroups });
                          void syncTournamentGroupsForCategory(selectedCategory.id, nextGroups);
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
