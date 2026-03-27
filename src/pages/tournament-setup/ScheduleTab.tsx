import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import { getToken } from "../../auth/tokens";
import type { GroupBucket } from "../../Utils/tournamentPlanner";
import {
  formatMinutesToTime,
  getTeamDisplayName,
  normalizeMatchIdentity,
  parseTimeToMinutes,
  toApiTime,
  fromApiTime,
} from "./helpers";
import type {
  ApiMatchDto,
  CategoryScheduleItem,
  CategorySetupConfig,
  ScheduleDraftInput,
  TeamDto,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const GROUP_STAGE_ROUND = "GROUP_STAGE";
const DEFAULT_GENERATION_BUFFER_MINUTES = 30;
const ALLOWED_MATCH_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "POSTPONED",
  "ABANDONED",
] as const;

type ScheduleTabProps = {
  selectedCategoryId: string;
  selectedCategoryLevel: string;
  selectedCategoryDisplayName: string;
  selectedConfig?: CategorySetupConfig;
  eventStartDate?: string;
  groups: GroupBucket[];
  teams: TeamDto[];
  onBackToGroups: () => void;
  onScheduleSaved: (scheduleItems: CategoryScheduleItem[]) => void;
};

type DraftErrors = {
  homeTeamId?: string;
  awayTeamId?: string;
  matchDate?: string;
  startTime?: string;
  venue?: string;
};

type ItemErrors = Record<string, DraftErrors>;

function createDraft(
  eventStartDate?: string,
  cfg?: CategorySetupConfig,
): ScheduleDraftInput {
  return {
    groupId: "",
    round: GROUP_STAGE_ROUND,
    homeTeamId: "",
    awayTeamId: "",
    matchDate:
      String(cfg?.scheduleDate ?? "").trim() ||
      (eventStartDate ? String(eventStartDate).slice(0, 10) : ""),
    startTime: String(cfg?.scheduleStartTime ?? ""),
    venue:
      String(cfg?.scheduleVenue ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)[0] ?? "",
    status: "SCHEDULED",
  };
}

export function ScheduleTab({
  selectedCategoryId,
  selectedCategoryLevel,
  selectedCategoryDisplayName,
  selectedConfig,
  eventStartDate,
  groups,
  teams,
  onBackToGroups,
  onScheduleSaved,
}: ScheduleTabProps) {
  const scheduleItemsSignature = React.useMemo(
    () =>
      JSON.stringify(
        (selectedConfig?.scheduleItems ?? []).map((item) => ({
          id: String(item.id),
          backendMatchId: Number(item.backendMatchId ?? 0),
          groupId: Number(item.groupId ?? 0),
          round: String(item.round ?? ""),
          homeTeamId: Number(item.homeTeamId ?? 0),
          awayTeamId: Number(item.awayTeamId ?? 0),
          matchDate: String(item.matchDate ?? ""),
          startTime: String(item.startTime ?? ""),
          venue: String(item.venue ?? ""),
          status: String(item.status ?? ""),
        })),
      ),
    [selectedConfig?.scheduleItems],
  );
  const draftDefaultsKey = React.useMemo(
    () =>
      [
        selectedCategoryId,
        eventStartDate ? String(eventStartDate).slice(0, 10) : "",
        String(selectedConfig?.scheduleDate ?? ""),
        String(selectedConfig?.scheduleStartTime ?? ""),
        String(selectedConfig?.scheduleVenue ?? ""),
      ].join("::"),
    [
      eventStartDate,
      selectedCategoryId,
      selectedConfig?.scheduleDate,
      selectedConfig?.scheduleStartTime,
      selectedConfig?.scheduleVenue,
    ],
  );
  const [scheduleItems, setScheduleItems] = React.useState<CategoryScheduleItem[]>(
    selectedConfig?.scheduleItems ?? [],
  );
  const [draft, setDraft] = React.useState<ScheduleDraftInput>(
    createDraft(eventStartDate, selectedConfig),
  );
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draftErrors, setDraftErrors] = React.useState<DraftErrors>({});
  const [itemErrors, setItemErrors] = React.useState<ItemErrors>({});
  const onScheduleSavedRef = React.useRef(onScheduleSaved);

  React.useEffect(() => {
    onScheduleSavedRef.current = onScheduleSaved;
  }, [onScheduleSaved]);

  React.useEffect(() => {
    setScheduleItems(selectedConfig?.scheduleItems ?? []);
  }, [scheduleItemsSignature]);

  React.useEffect(() => {
    setDraft(createDraft(eventStartDate, selectedConfig));
    setEditingItemId(null);
    setDraftErrors({});
    setItemErrors({});
  }, [draftDefaultsKey]);

  React.useEffect(() => {
    setError(null);
  }, [selectedCategoryId]);

  const teamNameById = React.useMemo(
    () =>
      new Map(
        teams.map((team) => [Number(team.id), getTeamDisplayName(team)] as const),
      ),
    [teams],
  );

  const loadMatches = React.useCallback(async () => {
    const token = getToken();
    const parsedCategoryId = Number(selectedCategoryId);
    if (!token || !Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
      return;
    }

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

      const mappedItems = rawItems.reduce<CategoryScheduleItem[]>(
        (acc, item, idx) => {
          const row = item as Record<string, unknown>;
          const backendMatchId = Number(item.id ?? row.matchId ?? row.match_id);
          const homeTeamId = Number(
            item.homeTeamId ??
              row.home_team_id ??
              ((row.homeTeam as { id?: number } | undefined)?.id ?? undefined) ??
              ((row.home_team as { id?: number } | undefined)?.id ?? undefined),
          );
          const awayTeamId = Number(
            item.awayTeamId ??
              row.away_team_id ??
              ((row.awayTeam as { id?: number } | undefined)?.id ?? undefined) ??
              ((row.away_team as { id?: number } | undefined)?.id ?? undefined),
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
          const groupId = Number(item.groupId ?? row.group_id ?? (row.group as { id?: number } | undefined)?.id);
          const homeName =
            String(
              item.homeTeamName ??
                ((row.homeTeam as { name?: string } | undefined)?.name ?? "") ??
                ((row.home_team as { name?: string } | undefined)?.name ?? ""),
            ).trim() ||
            teamNameById.get(homeTeamId) ||
            `Team #${homeTeamId}`;
          const awayName =
            String(
              item.awayTeamName ??
                ((row.awayTeam as { name?: string } | undefined)?.name ?? "") ??
                ((row.away_team as { name?: string } | undefined)?.name ?? ""),
            ).trim() ||
            teamNameById.get(awayTeamId) ||
            `Team #${awayTeamId}`;
          acc.push({
            id: `sched_${selectedCategoryId}_${backendMatchId}_${idx + 1}`,
            backendMatchId,
            groupId: Number.isFinite(groupId) && groupId > 0 ? groupId : undefined,
            round: String(item.round ?? row.stage ?? GROUP_STAGE_ROUND),
            homeTeamId,
            awayTeamId,
            matchDate: String(item.matchDate ?? row.match_date ?? ""),
            startTime: fromApiTime(
              String(item.startTime ?? row.start_time ?? ""),
            ),
            endTime: "",
            venue: String(item.venue ?? row.court ?? row.field ?? ""),
            status: String(item.status ?? row.matchStatus ?? "SCHEDULED"),
            matchLabel: `${homeName} vs ${awayName}`,
          });
          return acc;
        },
        [],
      );

      setScheduleItems((current) => {
        const localOnlyItems = current.filter(
          (row) =>
            !Number.isFinite(Number(row.backendMatchId)) ||
            Number(row.backendMatchId) <= 0,
        );
        const merged = [...localOnlyItems, ...mappedItems];
        const deduped = Array.from(
          new Map(
            merged.map((row) => [
              Number.isFinite(Number(row.backendMatchId)) && Number(row.backendMatchId) > 0
                ? `backend:${Number(row.backendMatchId)}`
                : `local:${normalizeMatchIdentity(row) ?? row.id}`,
              row,
            ]),
          ).values(),
        );
        onScheduleSavedRef.current(deduped);
        return deduped;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches.");
    }
  }, [selectedCategoryId, teamNameById]);

  React.useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const createMatchViaApi = React.useCallback(
    async (
      item: Omit<CategoryScheduleItem, "id"> & { id?: string },
    ): Promise<CategoryScheduleItem | null> => {
      const token = getToken();
      const parsedCategoryId = Number(selectedCategoryId);
      if (!token || !Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
        return null;
      }
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
        round: String(item.round ?? GROUP_STAGE_ROUND),
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
        throw new Error(
          body?.message?.[0] || body?.error || "Failed to create match.",
        );
      }
      const backendMatchId = Number(body?.id ?? body?.data?.id);
      return {
        ...item,
        id:
          item.id ??
          `sched_${selectedCategoryId}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        backendMatchId:
          Number.isFinite(backendMatchId) && backendMatchId > 0
            ? backendMatchId
            : undefined,
      };
    },
    [selectedCategoryId],
  );

  const validateDraft = React.useCallback(
    (options?: { requireTeams?: boolean }) => {
      const nextErrors: DraftErrors = {};
      const requireTeams = options?.requireTeams ?? false;
      const homeTeamId = Number(draft.homeTeamId);
      const awayTeamId = Number(draft.awayTeamId);

      if (requireTeams) {
        if (!Number.isFinite(homeTeamId) || homeTeamId <= 0) {
          nextErrors.homeTeamId = "Select a valid home team.";
        }
        if (!Number.isFinite(awayTeamId) || awayTeamId <= 0) {
          nextErrors.awayTeamId = "Select a valid away team.";
        }
        if (
          Number.isFinite(homeTeamId) &&
          homeTeamId > 0 &&
          Number.isFinite(awayTeamId) &&
          awayTeamId > 0 &&
          homeTeamId === awayTeamId
        ) {
          nextErrors.awayTeamId = "Home and away team must be different.";
        }
      }

      if (!String(draft.matchDate ?? "").trim()) {
        nextErrors.matchDate = "Match date is required.";
      }
      if (!String(draft.startTime ?? "").trim()) {
        nextErrors.startTime = "Start time is required.";
      }
      if (!String(draft.venue ?? "").trim()) {
        nextErrors.venue = "Court / field is required.";
      }

      setDraftErrors(nextErrors);
      return nextErrors;
    },
    [draft],
  );

  const validateScheduleItem = React.useCallback((item: CategoryScheduleItem) => {
    const nextErrors: DraftErrors = {};
    const homeTeamId = Number(item.homeTeamId);
    const awayTeamId = Number(item.awayTeamId);

    if (!Number.isFinite(homeTeamId) || homeTeamId <= 0) {
      nextErrors.homeTeamId = "Select a valid home team.";
    }
    if (!Number.isFinite(awayTeamId) || awayTeamId <= 0) {
      nextErrors.awayTeamId = "Select a valid away team.";
    }
    if (
      Number.isFinite(homeTeamId) &&
      homeTeamId > 0 &&
      Number.isFinite(awayTeamId) &&
      awayTeamId > 0 &&
      homeTeamId === awayTeamId
    ) {
      nextErrors.awayTeamId = "Home and away team must be different.";
    }
    if (!String(item.matchDate ?? "").trim()) {
      nextErrors.matchDate = "Match date is required.";
    }
    if (!String(item.startTime ?? "").trim()) {
      nextErrors.startTime = "Start time is required.";
    }
    if (!String(item.venue ?? "").trim()) {
      nextErrors.venue = "Court / field is required.";
    }

    setItemErrors((current) => ({
      ...current,
      [item.id]: nextErrors,
    }));
    return nextErrors;
  }, []);

  const updateMatchViaApi = React.useCallback(async (item: CategoryScheduleItem) => {
    const token = getToken();
    const matchId = Number(item.backendMatchId);
    const parsedCategoryId = Number(selectedCategoryId);
    if (
      !token ||
      !Number.isFinite(matchId) ||
      matchId <= 0 ||
      !Number.isFinite(parsedCategoryId) ||
      parsedCategoryId <= 0
    ) {
      return false;
    }
    const payload = {
      ...(Number.isFinite(Number(item.groupId)) && Number(item.groupId) > 0
        ? { groupId: Number(item.groupId) }
        : { categoryId: parsedCategoryId }),
      round: String(item.round ?? GROUP_STAGE_ROUND),
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
      throw new Error(
        body?.message?.[0] || body?.error || "Failed to update match.",
      );
    }
    return true;
  }, [selectedCategoryId]);

  const deleteMatchViaApi = React.useCallback(async (backendMatchId?: number) => {
    const token = getToken();
    const parsedId = Number(backendMatchId);
    if (!token || !Number.isFinite(parsedId) || parsedId <= 0) return;
    const res = await fetch(`${API_URL}/matches/${parsedId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(
        body?.message?.[0] || body?.error || "Failed to delete match.",
      );
    }
  }, []);

  const buildScheduleItems = React.useCallback((): CategoryScheduleItem[] => {
    if (!selectedConfig) return [];
    const startMinutes = parseTimeToMinutes(draft.startTime);
    const endMinutes = parseTimeToMinutes(selectedConfig.scheduleEndTime);
    const matchDuration = 60;
    const configuredBuffer = Number(selectedConfig.scheduleBufferMinutes);
    const buffer =
      Number.isFinite(configuredBuffer) && configuredBuffer >= 0
        ? configuredBuffer
        : DEFAULT_GENERATION_BUFFER_MINUTES;
    const slotSpan = matchDuration + Math.max(0, buffer);
    const venue = String(draft.venue ?? "").trim();
    const scheduledDate = String(draft.matchDate ?? "").trim();
    const scheduledStartTime = String(draft.startTime ?? "").trim();
    const generatedMatches: Array<{
      label: string;
      groupId?: number;
      round: string;
      homeTeamId?: number;
      awayTeamId?: number;
    }> = [];

    groups.forEach((group) => {
      const groupTeamIds = (group.participants ?? [])
        .map((participant) => Number(String(participant).trim()))
        .filter((teamId) => Number.isFinite(teamId) && teamId > 0);
      for (let i = 0; i < groupTeamIds.length; i += 1) {
        for (let j = i + 1; j < groupTeamIds.length; j += 1) {
          const homeTeamId = groupTeamIds[i];
          const awayTeamId = groupTeamIds[j];
          generatedMatches.push({
            label: `${teamNameById.get(homeTeamId) ?? `Team #${homeTeamId}`} vs ${
              teamNameById.get(awayTeamId) ?? `Team #${awayTeamId}`
            }`,
            groupId: Number(group.id),
            round: GROUP_STAGE_ROUND,
            homeTeamId,
            awayTeamId,
          });
        }
      }
    });

    return generatedMatches.map((item, index) => {
      const hasWindow =
        startMinutes != null &&
        endMinutes != null &&
        Number.isFinite(startMinutes) &&
        Number.isFinite(endMinutes);
      const itemStart = hasWindow ? startMinutes + index * slotSpan : 0;
      const itemEnd = hasWindow
        ? Math.min(endMinutes!, itemStart + matchDuration)
        : matchDuration;
      return {
        id: `sched_${selectedCategoryId}_${index + 1}`,
        matchLabel: item.label,
        startTime: hasWindow ? formatMinutesToTime(itemStart) : scheduledStartTime,
        endTime: hasWindow ? formatMinutesToTime(itemEnd) : "",
        venue,
        groupId: item.groupId,
        round: item.round,
        homeTeamId: item.homeTeamId,
        awayTeamId: item.awayTeamId,
        matchDate: scheduledDate,
        status: "SCHEDULED",
      };
    });
  }, [draft.matchDate, draft.startTime, draft.venue, groups, selectedCategoryId, selectedConfig, teamNameById]);

  const handleCreateManualMatch = React.useCallback(async () => {
    if (!selectedConfig) return;
    const validationErrors = validateDraft({ requireTeams: true });
    if (Object.keys(validationErrors).length > 0) {
      setError("Please correct the highlighted fields.");
      return;
    }
    const homeTeamId = Number(draft.homeTeamId);
    const awayTeamId = Number(draft.awayTeamId);
    const identity = normalizeMatchIdentity({
      groupId: Number.isFinite(Number(draft.groupId)) ? Number(draft.groupId) : undefined,
      round: GROUP_STAGE_ROUND,
      homeTeamId,
      awayTeamId,
    });
    if (
      identity &&
      scheduleItems
        .map((item) => normalizeMatchIdentity(item))
        .filter(Boolean)
        .includes(identity)
    ) {
      setError("This match already exists in the schedule.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setDraftErrors({});
    try {
      const created = await createMatchViaApi({
        matchLabel: `${teamNameById.get(homeTeamId) ?? `Team #${homeTeamId}`} vs ${
          teamNameById.get(awayTeamId) ?? `Team #${awayTeamId}`
        }`,
        startTime: draft.startTime,
        endTime: "",
        venue: draft.venue.trim(),
          groupId:
          Number.isFinite(Number(draft.groupId)) && Number(draft.groupId) > 0
            ? Number(draft.groupId)
            : undefined,
        round: GROUP_STAGE_ROUND,
        homeTeamId,
        awayTeamId,
        matchDate: draft.matchDate,
        status: draft.status || "SCHEDULED",
      });
      if (!created) {
        setError("Could not create match with current details.");
        return;
      }
      setScheduleItems((current) => {
        const next = [...current, created];
        onScheduleSavedRef.current(next);
        return next;
      });
      setDraft((current) => ({ ...current, homeTeamId: "", awayTeamId: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create match.");
    } finally {
      setSubmitting(false);
    }
  }, [createMatchViaApi, draft, onScheduleSaved, scheduleItems, selectedConfig, teamNameById, validateDraft]);

  const groupedScheduleItems = React.useMemo(() => {
    const groupNameById = new Map(
      groups
        .map((group) => [Number(group.id), group.name] as const)
        .filter(([groupId]) => Number.isFinite(groupId) && groupId > 0),
    );
    const grouped = new Map<string, CategoryScheduleItem[]>();
    scheduleItems.forEach((item) => {
      const groupId = Number(item.groupId);
      const key =
        Number.isFinite(groupId) && groupId > 0
          ? groupNameById.get(groupId) ?? `Group ${groupId}`
          : "No Group";
      const current = grouped.get(key) ?? [];
      grouped.set(key, [...current, item]);
    });
    return Array.from(grouped.entries()).sort((a, b) => {
      if (a[0] === "No Group") return 1;
      if (b[0] === "No Group") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [groups, scheduleItems]);

  const draftScheduleItems = React.useMemo(
    () =>
      scheduleItems.filter(
        (item) =>
          !Number.isFinite(Number(item.backendMatchId)) ||
          Number(item.backendMatchId) <= 0,
      ),
    [scheduleItems],
  );
  const publishedScheduleItems = React.useMemo(
    () =>
      scheduleItems.filter(
        (item) =>
          Number.isFinite(Number(item.backendMatchId)) &&
          Number(item.backendMatchId) > 0,
      ),
    [scheduleItems],
  );
  const hasPublishedMatches = publishedScheduleItems.length > 0;

  const handleCreateRandomMatches = React.useCallback(async () => {
    if (!selectedConfig) return;
    const validationErrors = validateDraft();
    if (Object.keys(validationErrors).length > 0) {
      setError("Please correct the highlighted scheduling fields.");
      return;
    }
    const startMinutes = parseTimeToMinutes(draft.startTime);
    const endMinutes = parseTimeToMinutes(selectedConfig.scheduleEndTime);
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
    setSubmitting(true);
    setError(null);
    setDraftErrors({});
    try {
      const generatedItems = buildScheduleItems().filter(
        (item) =>
          Number.isFinite(Number(item.homeTeamId)) &&
          Number(item.homeTeamId) > 0 &&
          Number.isFinite(Number(item.awayTeamId)) &&
          Number(item.awayTeamId) > 0,
      );
      const existingKeys = new Set(
        (hasPublishedMatches ? publishedScheduleItems : [])
          .map((item) => normalizeMatchIdentity(item))
          .filter((key): key is string => Boolean(key)),
      );
      const dedupedItems = generatedItems.filter((item) => {
        const key = normalizeMatchIdentity(item);
        if (!key || existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });
      setScheduleItems((current) => {
        const preservedPublished = hasPublishedMatches
          ? current.filter(
              (item) =>
                Number.isFinite(Number(item.backendMatchId)) &&
                Number(item.backendMatchId) > 0,
            )
          : [];
        const next = [...preservedPublished, ...dedupedItems];
        onScheduleSavedRef.current(next);
        return next;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate matches.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [buildScheduleItems, draft.startTime, hasPublishedMatches, publishedScheduleItems, selectedConfig, validateDraft]);

  const selectableTeamsForDraft = React.useMemo(() => {
    const selectedGroup = groups.find(
      (group) => String(group.id) === String(draft.groupId),
    );
    const groupTeamIds = new Set(
      (selectedGroup?.participants ?? [])
        .map((participant) => Number(String(participant).trim()))
        .filter((teamId) => Number.isFinite(teamId) && teamId > 0),
    );
    return selectedGroup ? teams.filter((team) => groupTeamIds.has(Number(team.id))) : teams;
  }, [draft.groupId, groups, teams]);

  const handlePublishDraftMatches = React.useCallback(async () => {
    if (draftScheduleItems.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const createdById = new Map<string, CategoryScheduleItem>();

      for (const item of draftScheduleItems) {
        const created = await createMatchViaApi({
          ...item,
          round: item.round ?? GROUP_STAGE_ROUND,
        });
        if (!created) {
          throw new Error("Failed to publish one or more generated matches.");
        }
        createdById.set(item.id, created);
      }

      setScheduleItems((current) => {
        const next = current.map((item) => createdById.get(item.id) ?? item);
        onScheduleSavedRef.current(next);
        return next;
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to publish generated matches.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [createMatchViaApi, draftScheduleItems]);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            gap: 2,
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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
              <CalendarMonthOutlinedIcon sx={{ fontSize: 24, color: "#F54900" }} />
            </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#6A7282", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {selectedCategoryLevel}
            </Typography>
            <Typography sx={{ fontSize: "1.45rem", fontWeight: 700, color: "#101828", lineHeight: 1.2 }}>
              {selectedCategoryDisplayName}
            </Typography>
          </Box>
        </Box>
        </Box>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

            <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1, mb: 1.25, flexDirection: { xs: "column", md: "row" } }}>
                  <Typography sx={{ fontWeight: 700, color: "#101828", fontSize: "0.95rem" }}>
                  Schedule Group Matches
                </Typography>
                <Button variant="outlined" onClick={onBackToGroups} sx={{ borderRadius: "10px" }}>
                  Back: Groups & Brackets
                </Button>
              </Box>

              <Stack spacing={1.25}>
                <Alert severity="info" sx={{ mb: 0 }}>
                  Generated matches assume a single court/field and add a{" "}
                  {DEFAULT_GENERATION_BUFFER_MINUTES}-minute gap between matches unless a schedule buffer is already configured.
                </Alert>
                {hasPublishedMatches ? (
                  <Alert severity="warning" sx={{ mb: 0 }}>
                    Published matches already exist. Generation will only add missing fixtures and will not modify published matches.
                  </Alert>
                ) : draftScheduleItems.length > 0 ? (
                  <Alert severity="warning" sx={{ mb: 0 }}>
                    Regenerating will replace the current draft matches. Published matches are never changed by generation.
                  </Alert>
                ) : null}
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <Button
                    variant="outlined"
                    onClick={() => void handleCreateRandomMatches()}
                    disabled={submitting}
                    sx={{ borderRadius: "10px", textTransform: "none" }}
                  >
                    {hasPublishedMatches
                      ? "Generate Missing Fixtures"
                      : draftScheduleItems.length > 0
                        ? "Regenerate Draft Group Matches"
                        : "Generate Draft Group Matches"}
                  </Button>
                </Stack>
                {draftScheduleItems.length > 0 ? (
                  <Alert severity="warning" sx={{ mb: 0 }}>
                    Generated matches stay local as draft until you publish them. Publish draft matches before leaving Schedule if you want them saved to the backend. Manual matches are saved immediately.
                  </Alert>
                ) : null}

                <Stack spacing={1}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                    <TextField label="Group (optional)" select fullWidth value={draft.groupId} onChange={(e) => setDraft((current) => ({ ...current, groupId: e.target.value }))}>
                      <MenuItem value="">No Group</MenuItem>
                      {groups.map((group) => (
                        <MenuItem key={group.id} value={String(group.id)}>
                          {group.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField label="Round" fullWidth value="GROUP_STAGE" InputProps={{ readOnly: true }} />
                  </Stack>

                  <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                    <TextField label="Home Team" select fullWidth value={draft.homeTeamId} error={Boolean(draftErrors.homeTeamId)} helperText={draftErrors.homeTeamId} disabled={draft.groupId !== "" && selectableTeamsForDraft.length === 0} onChange={(e) => {
                      const value = e.target.value;
                      setDraft((current) => ({ ...current, homeTeamId: value }));
                      setDraftErrors((current) => ({ ...current, homeTeamId: undefined }));
                    }}>
                      <MenuItem value="">Select home team</MenuItem>
                      {selectableTeamsForDraft.map((team) => (
                        <MenuItem key={`home-${team.id}`} value={String(team.id)}>
                          {getTeamDisplayName(team)}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField label="Away Team" select fullWidth value={draft.awayTeamId} error={Boolean(draftErrors.awayTeamId)} helperText={draftErrors.awayTeamId} disabled={draft.groupId !== "" && selectableTeamsForDraft.length === 0} onChange={(e) => {
                      const value = e.target.value;
                      setDraft((current) => ({ ...current, awayTeamId: value }));
                      setDraftErrors((current) => ({ ...current, awayTeamId: undefined }));
                    }}>
                      <MenuItem value="">Select away team</MenuItem>
                      {selectableTeamsForDraft.map((team) => (
                        <MenuItem key={`away-${team.id}`} value={String(team.id)}>
                          {getTeamDisplayName(team)}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                    <TextField label="Match date" type="date" fullWidth value={draft.matchDate} error={Boolean(draftErrors.matchDate)} helperText={draftErrors.matchDate} onChange={(e) => {
                      const value = e.target.value;
                      setDraft((current) => ({ ...current, matchDate: value }));
                      setDraftErrors((current) => ({ ...current, matchDate: undefined }));
                    }} InputLabelProps={{ shrink: true }} />
                    <TextField label="Start time" type="time" fullWidth value={draft.startTime} error={Boolean(draftErrors.startTime)} helperText={draftErrors.startTime} onChange={(e) => {
                      const value = e.target.value;
                      setDraft((current) => ({ ...current, startTime: value }));
                      setDraftErrors((current) => ({ ...current, startTime: undefined }));
                    }} InputLabelProps={{ shrink: true }} />
                    <TextField label="Court / Field" fullWidth value={draft.venue} error={Boolean(draftErrors.venue)} helperText={draftErrors.venue} onChange={(e) => {
                      const value = e.target.value;
                      setDraft((current) => ({ ...current, venue: value }));
                      setDraftErrors((current) => ({ ...current, venue: undefined }));
                    }} />
                    <TextField label="Status" select fullWidth value={draft.status} onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value }))}>
                      {ALLOWED_MATCH_STATUSES.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button variant="contained" onClick={() => void handleCreateManualMatch()} disabled={submitting} sx={{ borderRadius: "10px" }}>
                      Add Match
                    </Button>
                  </Box>
                </Stack>
              </Stack>
            </Box>

            {scheduleItems.length > 0 ? (
              <Box
                sx={{
                  mt: 1,
                  p: 1.75,
                  borderRadius: "24px",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,247,237,0.55) 60%, rgba(248,250,252,0.96) 100%)",
                  boxShadow: "0 16px 38px rgba(15, 23, 42, 0.06)",
                }}
              >
                <Typography sx={{ fontWeight: 800, color: "#101828", fontSize: "1rem", mb: 1.1, letterSpacing: "-0.02em" }}>
                  Schedule Overview
                </Typography>
                <Stack spacing={1.5}>
                  {groupedScheduleItems.map(([groupName, matches]) => (
                    <Box key={groupName}>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.8rem",
                          color: "#6A7282",
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                          mb: 0.85,
                        }}
                      >
                        {groupName}
                      </Typography>
                      <Stack spacing={1}>
                        {matches.map((item, index) => {
                          const isEditing = editingItemId === item.id;
                          const selectedGroup = groups.find(
                            (group) => String(group.id) === String(item.groupId ?? ""),
                          );
                          const groupTeamIds = new Set(
                            (selectedGroup?.participants ?? [])
                              .map((participant) => Number(String(participant).trim()))
                              .filter((teamId) => Number.isFinite(teamId) && teamId > 0),
                          );
                          const selectableTeams =
                            selectedGroup != null
                              ? teams.filter((team) => groupTeamIds.has(Number(team.id)))
                              : teams;

                          return (
                            <Box
                              key={item.id}
                              sx={{
                                p: 1.35,
                                borderRadius: "22px",
                                border: !Number.isFinite(Number(item.backendMatchId)) || Number(item.backendMatchId) <= 0
                                  ? "1px solid rgba(249, 115, 22, 0.26)"
                                  : "1px solid rgba(148, 163, 184, 0.16)",
                                background: !Number.isFinite(Number(item.backendMatchId)) || Number(item.backendMatchId) <= 0
                                  ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,247,237,0.9) 100%)"
                                  : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.92) 100%)",
                                boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
                              }}
                            >
                              {!isEditing ? (
                                <Stack spacing={1}>
                                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography
                                        sx={{
                                          fontWeight: 800,
                                          color: "#111827",
                                          fontSize: { xs: "1.02rem", md: "1.08rem" },
                                          letterSpacing: "-0.02em",
                                        }}
                                      >
                                        {item.matchLabel}
                                      </Typography>
                                      <Typography sx={{ color: "#667085", fontSize: "0.88rem", mt: 0.35 }}>
                                        {item.matchDate} at {item.startTime} · {item.venue}
                                      </Typography>
                                    </Box>
                                    <Stack direction={{ xs: "row", md: "row" }} spacing={0.75} alignItems={{ md: "center" }} flexWrap="wrap" useFlexGap>
                                      {!Number.isFinite(Number(item.backendMatchId)) ||
                                      Number(item.backendMatchId) <= 0 ? (
                                        <Chip
                                          size="small"
                                          label="Draft"
                                          sx={{
                                            bgcolor: "rgba(255,237,213,0.9)",
                                            color: "#B45309",
                                            fontWeight: 800,
                                            border: "1px solid rgba(249,115,22,0.18)",
                                          }}
                                        />
                                      ) : null}
                                      <Chip
                                        size="small"
                                        variant="outlined"
                                        label={String(item.status ?? "SCHEDULED").replaceAll("_", " ")}
                                        sx={{
                                          bgcolor: "rgba(255,255,255,0.78)",
                                          fontWeight: 700,
                                          borderColor: "rgba(148, 163, 184, 0.24)",
                                        }}
                                      />
                                      <Chip
                                        size="small"
                                        variant="outlined"
                                        label={`Match ${index + 1}`}
                                        sx={{
                                          bgcolor: "rgba(255,255,255,0.78)",
                                          fontWeight: 700,
                                          borderColor: "rgba(168, 85, 247, 0.16)",
                                        }}
                                      />
                                    </Stack>
                                  </Stack>
                                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => setEditingItemId(item.id)}
                                      sx={{ borderRadius: "14px", textTransform: "none", fontWeight: 700 }}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="small"
                                      color="error"
                                      variant="outlined"
                                      sx={{ borderRadius: "14px", textTransform: "none", fontWeight: 700 }}
                                      onClick={() => {
                                        void (async () => {
                                          try {
                                            setSubmitting(true);
                                            await deleteMatchViaApi(item.backendMatchId);
                                            setScheduleItems((current) => {
                                              const next = current.filter((row) => row.id !== item.id);
                                              onScheduleSavedRef.current(next);
                                              return next;
                                            });
                                          } catch (err) {
                                            setError(err instanceof Error ? err.message : "Failed to delete match.");
                                          } finally {
                                            setSubmitting(false);
                                          }
                                        })();
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </Stack>
                                </Stack>
                              ) : (
                                  <Stack
                                    spacing={1}
                                    sx={{
                                      p: 1,
                                      borderRadius: "18px",
                                      bgcolor: "rgba(255,255,255,0.74)",
                                      border: "1px solid rgba(148, 163, 184, 0.14)",
                                    }}
                                  >
                                    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                                      <TextField
                                        label="Home Team"
                                      select
                                      fullWidth
                                      value={String(item.homeTeamId ?? "")}
                                      error={Boolean(itemErrors[item.id]?.homeTeamId)}
                                      helperText={itemErrors[item.id]?.homeTeamId}
                                      disabled={selectedGroup != null && selectableTeams.length === 0}
                                      onChange={(e) => {
                                        setScheduleItems((current) =>
                                          current.map((row) =>
                                            row.id === item.id ? { ...row, homeTeamId: Number(e.target.value) } : row,
                                          ),
                                        );
                                        setItemErrors((current) => ({
                                          ...current,
                                          [item.id]: {
                                            ...current[item.id],
                                            homeTeamId: undefined,
                                          },
                                        }));
                                      }}
                                    >
                                      <MenuItem value="">Select home team</MenuItem>
                                      {selectableTeams.map((team) => (
                                        <MenuItem key={`edit-home-${team.id}`} value={String(team.id)}>
                                          {getTeamDisplayName(team)}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                    <TextField
                                      label="Away Team"
                                      select
                                      fullWidth
                                      value={String(item.awayTeamId ?? "")}
                                      error={Boolean(itemErrors[item.id]?.awayTeamId)}
                                      helperText={itemErrors[item.id]?.awayTeamId}
                                      disabled={selectedGroup != null && selectableTeams.length === 0}
                                      onChange={(e) => {
                                        setScheduleItems((current) =>
                                          current.map((row) =>
                                            row.id === item.id ? { ...row, awayTeamId: Number(e.target.value) } : row,
                                          ),
                                        );
                                        setItemErrors((current) => ({
                                          ...current,
                                          [item.id]: {
                                            ...current[item.id],
                                            awayTeamId: undefined,
                                          },
                                        }));
                                      }}
                                    >
                                      <MenuItem value="">Select away team</MenuItem>
                                      {selectableTeams.map((team) => (
                                        <MenuItem key={`edit-away-${team.id}`} value={String(team.id)}>
                                          {getTeamDisplayName(team)}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                  </Stack>
                                  <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                                    <TextField label="Match date" type="date" fullWidth value={String(item.matchDate ?? "")} error={Boolean(itemErrors[item.id]?.matchDate)} helperText={itemErrors[item.id]?.matchDate} onChange={(e) => {
                                      setScheduleItems((current) => current.map((row) => row.id === item.id ? { ...row, matchDate: e.target.value } : row));
                                      setItemErrors((current) => ({
                                        ...current,
                                        [item.id]: {
                                          ...current[item.id],
                                          matchDate: undefined,
                                        },
                                      }));
                                    }} InputLabelProps={{ shrink: true }} />
                                    <TextField label="Start time" type="time" fullWidth value={item.startTime} error={Boolean(itemErrors[item.id]?.startTime)} helperText={itemErrors[item.id]?.startTime} onChange={(e) => {
                                      setScheduleItems((current) => current.map((row) => row.id === item.id ? { ...row, startTime: e.target.value } : row));
                                      setItemErrors((current) => ({
                                        ...current,
                                        [item.id]: {
                                          ...current[item.id],
                                          startTime: undefined,
                                        },
                                      }));
                                    }} InputLabelProps={{ shrink: true }} />
                                    <TextField label="Court / Field" fullWidth value={item.venue} error={Boolean(itemErrors[item.id]?.venue)} helperText={itemErrors[item.id]?.venue} onChange={(e) => {
                                      setScheduleItems((current) => current.map((row) => row.id === item.id ? { ...row, venue: e.target.value } : row));
                                      setItemErrors((current) => ({
                                        ...current,
                                        [item.id]: {
                                          ...current[item.id],
                                          venue: undefined,
                                        },
                                      }));
                                    }} />
                                    <TextField label="Status" select fullWidth value={String(item.status ?? "SCHEDULED")} onChange={(e) => setScheduleItems((current) => current.map((row) => row.id === item.id ? { ...row, status: e.target.value } : row))}>
                                      {ALLOWED_MATCH_STATUSES.map((status) => (
                                        <MenuItem key={status} value={status}>
                                          {status}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                  </Stack>
                                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => setEditingItemId(null)}
                                      sx={{ borderRadius: "14px", textTransform: "none", fontWeight: 700 }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      sx={{ borderRadius: "14px", textTransform: "none", fontWeight: 700 }}
                                      onClick={() => {
                                        void (async () => {
                                          const currentItem = scheduleItems.find((row) => row.id === item.id);
                                          if (!currentItem) return;
                                          const validationErrors = validateScheduleItem(currentItem);
                                          if (Object.keys(validationErrors).length > 0) {
                                            setError("Please correct the highlighted fields.");
                                            return;
                                          }
                                          const duplicateKey = normalizeMatchIdentity(currentItem);
                                          const hasDuplicate =
                                            Boolean(duplicateKey) &&
                                            scheduleItems
                                              .filter((row) => row.id !== item.id)
                                              .map((row) => normalizeMatchIdentity(row))
                                              .filter(Boolean)
                                              .includes(duplicateKey!);
                                          if (hasDuplicate) {
                                            setError("Another match with the same teams/group/round already exists.");
                                            return;
                                          }
                                          try {
                                            setSubmitting(true);
                                            setError(null);
                                            setItemErrors((current) => ({
                                              ...current,
                                              [item.id]: {},
                                            }));
                                            const nextRow = {
                                              ...currentItem,
                                              round: GROUP_STAGE_ROUND,
                                              matchLabel: `${teamNameById.get(Number(currentItem.homeTeamId)) ?? `Team #${currentItem.homeTeamId ?? "?"}`} vs ${teamNameById.get(Number(currentItem.awayTeamId)) ?? `Team #${currentItem.awayTeamId ?? "?"}`}`,
                                            };
                                            let savedRow: CategoryScheduleItem = nextRow;
                                            if (Number.isFinite(Number(currentItem.backendMatchId)) && Number(currentItem.backendMatchId) > 0) {
                                              await updateMatchViaApi(nextRow);
                                            } else {
                                              const created = await createMatchViaApi(nextRow);
                                              if (created) {
                                                savedRow = {
                                                  ...created,
                                                  round: created.round ?? GROUP_STAGE_ROUND,
                                                };
                                              }
                                            }
                                            setScheduleItems((current) => {
                                              const next = current.map((row) => row.id === item.id ? savedRow : row);
                                              onScheduleSavedRef.current(next);
                                              return next;
                                            });
                                            setItemErrors((current) => ({
                                              ...current,
                                              [item.id]: {},
                                            }));
                                            setEditingItemId(null);
                                          } catch (err) {
                                            setError(err instanceof Error ? err.message : "Failed to update match.");
                                          } finally {
                                            setSubmitting(false);
                                          }
                                        })();
                                      }}
                                    >
                                      Save
                                    </Button>
                                  </Stack>
                                </Stack>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
                {draftScheduleItems.length > 0 ? (
                  <Box
                    sx={{
                      mt: 1.75,
                      pt: 1.5,
                      borderTop: "1px solid rgba(148, 163, 184, 0.18)",
                      display: "flex",
                      flexDirection: { xs: "column", md: "row" },
                      justifyContent: "space-between",
                      alignItems: { xs: "stretch", md: "center" },
                      gap: 1,
                    }}
                  >
                    <Typography sx={{ color: "#6B7280", fontSize: "0.92rem", fontWeight: 600 }}>
                      {draftScheduleItems.length} draft match{draftScheduleItems.length === 1 ? "" : "es"} pending publication.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => void handlePublishDraftMatches()}
                      disabled={submitting}
                      sx={{ borderRadius: "16px", textTransform: "none", fontWeight: 800, minHeight: 46 }}
                    >
                      {`Publish Draft Matches (${draftScheduleItems.length})`}
                    </Button>
                  </Box>
                ) : null}
              </Box>
            ) : null}
      </CardContent>
    </Card>
  );
}
