import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { getToken } from "../../features/auth/services/tokens";
import TournamentPhaseBuilder, {
  generateBracketSkeleton,
  generateGroupsSkeleton,
  type BuilderBracketMatch,
} from "../../Components/Shared/TournamentPhaseBuilder";
import type { GroupBucket } from "../../Utils/tournamentPlanner";
import type { ApiTournamentGroup, StructureMode, TeamDto } from "../../features/tournament-setup/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type EntryOption = {
  value: string;
  label: string;
};

type GroupsTabProps = {
  selectedCategoryId: string;
  selectedCategoryLevel: string;
  selectedCategoryDisplayName: string;
  structureMode: StructureMode | "";
  initialGroups: GroupBucket[];
  initialBracketMatches: BuilderBracketMatch[];
  initialGroupCount: number;
  teamsPerGroup: number;
  qualifiersPerGroup: number;
  entryLabel: string;
  teams: TeamDto[];
  onGroupsSaved: (payload: {
    groups: GroupBucket[];
    bracketMatches: BuilderBracketMatch[];
    groupCount: number;
  }) => void;
  onBackToStructure: () => void;
  onNextToSchedule: () => void;
};

export function GroupsTab({
  selectedCategoryId,
  selectedCategoryLevel,
  selectedCategoryDisplayName,
  structureMode,
  initialGroups,
  initialBracketMatches,
  initialGroupCount,
  teamsPerGroup,
  qualifiersPerGroup,
  entryLabel,
  teams,
  onGroupsSaved,
  onBackToStructure,
  onNextToSchedule,
}: GroupsTabProps) {
  const initialGroupsSignature = React.useMemo(
    () =>
      JSON.stringify(
        initialGroups.map((group) => ({
          id: group.id,
          name: group.name,
          participants: group.participants ?? [],
        })),
      ),
    [initialGroups],
  );
  const initialBracketSignature = React.useMemo(
    () =>
      JSON.stringify(
        initialBracketMatches.map((match) => ({
          id: match.id,
          name: match.name,
          round: match.round,
          roundIndex: match.roundIndex,
          home: match.home,
          away: match.away,
        })),
      ),
    [initialBracketMatches],
  );
  const [groups, setGroups] = React.useState<GroupBucket[]>(initialGroups);
  const [bracketMatches, setBracketMatches] = React.useState<
    BuilderBracketMatch[]
  >(initialBracketMatches);
  const [groupCount, setGroupCount] = React.useState(initialGroupCount);
  const [serverGroupIds, setServerGroupIds] = React.useState<number[]>(
    initialGroups
      .map((group) => Number(group.id))
      .filter((value) => Number.isFinite(value) && value > 0),
  );
  const [error, setError] = React.useState<string | null>(null);
  const autoBootstrapKeyRef = React.useRef<string | null>(null);
  const latestBracketMatchesRef = React.useRef(bracketMatches);
  const latestGroupCountRef = React.useRef(groupCount);
  const onGroupsSavedRef = React.useRef(onGroupsSaved);

  React.useEffect(() => {
    latestBracketMatchesRef.current = bracketMatches;
  }, [bracketMatches]);

  React.useEffect(() => {
    latestGroupCountRef.current = groupCount;
  }, [groupCount]);

  React.useEffect(() => {
    onGroupsSavedRef.current = onGroupsSaved;
  }, [onGroupsSaved]);

  React.useEffect(() => {
    setGroups(initialGroups);
    setBracketMatches(initialBracketMatches);
    setGroupCount(initialGroupCount);
    setServerGroupIds(
      initialGroups
        .map((group) => Number(group.id))
        .filter((value) => Number.isFinite(value) && value > 0),
    );
    setError(null);
    autoBootstrapKeyRef.current = null;
  }, [initialBracketSignature, initialGroupCount, initialGroupsSignature, selectedCategoryId]);

  React.useEffect(() => {
    const token = getToken();
    const parsedCategoryId = Number(selectedCategoryId);
    if (!token || !Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch(
          `${API_URL}/tournament-groups?categoryId=${encodeURIComponent(parsedCategoryId)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            body?.message?.[0] ||
              body?.error ||
              "Failed to load tournament groups.",
          );
        }

        const list = (Array.isArray(body) ? body : (body?.data ?? [])) as ApiTournamentGroup[];
        if (cancelled) return;

        const serverGroups = list.map((group, index) => ({
          id: String(group.id),
          name: String(group.name ?? `Group ${index + 1}`),
          participants: Array.from(
            new Set(
              (Array.isArray(group.teamIds) ? group.teamIds : [])
                .map((teamId) => String(teamId ?? "").trim())
                .filter(Boolean),
            ),
          ),
        }));

        setGroups(serverGroups);
        setServerGroupIds(
          serverGroups
            .map((group) => Number(group.id))
            .filter((value) => Number.isFinite(value) && value > 0),
        );
        if (serverGroups.length > 0) {
          setGroupCount(serverGroups.length);
        }
        setError(null);
        onGroupsSavedRef.current({
          groups: serverGroups,
          bracketMatches: latestBracketMatchesRef.current,
          groupCount: serverGroups.length > 0 ? serverGroups.length : latestGroupCountRef.current,
        });
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load tournament groups.",
        );
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId]);

  const availableEntries = React.useMemo<EntryOption[]>(
    () =>
      teams.map((team) => ({
        value: String(team.id),
        label: team.name || `Team #${team.id}`,
      })),
    [teams],
  );

  const resolveEntryLabel = React.useCallback(
    (value: string) => {
      const team = teams.find(
        (candidate) => String(candidate.id) === String(value),
      );
      return team?.name || (team ? `Team #${team.id}` : String(value ?? ""));
    },
    [teams],
  );

  const syncTournamentGroups = React.useCallback(
    async (nextGroups: GroupBucket[]) => {
      const token = getToken();
      const parsedCategoryId = Number(selectedCategoryId);
      if (!token || !Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
        return nextGroups;
      }

      try {
        const serverIds = new Set(serverGroupIds);
        const usedIds = new Set<number>();
        const updated = [...nextGroups];
        let serverGroupsByName: Map<string, number> | null = null;
        const teamMap = new Map<number, TeamDto>(
          teams
            .map((team) => [Number(team.id), team] as const)
            .filter(([teamId]) => Number.isFinite(teamId) && teamId > 0),
        );

        const loadServerGroupsByName = async () => {
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
                "Failed to load existing tournament groups.",
            );
          }
          const list = Array.isArray(body) ? body : (body?.data ?? []);
          serverGroupsByName = new Map(
            list
              .map((group: { id?: number | string; name?: string }) => [
                String(group.name ?? "").trim().toLowerCase(),
                Number(group.id),
              ] as const)
              .filter(
                ([nameKey, groupId]: readonly [string, number]) =>
                  Boolean(nameKey) && Number.isFinite(groupId) && groupId > 0,
              ),
          );
          return serverGroupsByName;
        };

        for (let index = 0; index < updated.length; index += 1) {
          const group = updated[index];
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
                    teamMap.has(teamId),
                ),
            ),
          );
          const payload = {
            categoryId: parsedCategoryId,
            name: group.name,
            teams: groupTeamIds
              .map((teamId) => teamMap.get(teamId))
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
              })),
            teamIds: groupTeamIds,
          };

          if (isPersisted) {
            usedIds.add(backendId);
            const res = await fetch(`${API_URL}/tournament-groups/${backendId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => null);
              throw new Error(
                body?.message?.[0] ||
                  body?.error ||
                  "Failed to update tournament group.",
              );
            }
            continue;
          }

          const existingByNameId = (await loadServerGroupsByName()).get(
            String(group.name ?? "").trim().toLowerCase(),
          );
          if (Number.isFinite(existingByNameId) && Number(existingByNameId) > 0) {
            const normalizedId = Number(existingByNameId);
            usedIds.add(normalizedId);
            updated[index] = { ...group, id: String(normalizedId) };
            const res = await fetch(
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
            if (!res.ok) {
              const body = await res.json().catch(() => null);
              throw new Error(
                body?.message?.[0] ||
                  body?.error ||
                  "Failed to reconcile tournament group.",
              );
            }
            continue;
          }

          const res = await fetch(`${API_URL}/tournament-groups`, {
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
              body?.message?.[0] ||
                body?.error ||
                "Failed to create tournament group.",
            );
          }
          const newId = Number(body?.id ?? body?.data?.id);
          if (Number.isFinite(newId) && newId > 0) {
            usedIds.add(newId);
            updated[index] = { ...group, id: String(newId) };
          }
        }

        await Promise.all(
          Array.from(serverIds)
            .filter((groupId) => !usedIds.has(groupId))
            .map(async (groupId) => {
              const res = await fetch(`${API_URL}/tournament-groups/${groupId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) {
                const body = await res.json().catch(() => null);
                throw new Error(
                  body?.message?.[0] ||
                    body?.error ||
                    "Failed to delete tournament group.",
                );
              }
            }),
        );

        setServerGroupIds(Array.from(usedIds));
        return updated;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to sync tournament groups.",
        );
        return nextGroups;
      }
    },
    [selectedCategoryId, serverGroupIds, teams],
  );

  React.useEffect(() => {
    const bootstrapKey = [
      selectedCategoryId,
      structureMode,
      initialGroupCount,
      teamsPerGroup,
      qualifiersPerGroup,
    ].join("::");
    const canAutoGenerateGroups =
      (structureMode === "groups_knockout" ||
        structureMode === "group_phase_only" ||
        structureMode === "swiss") &&
      initialGroups.length === 0 &&
      groups.length === 0 &&
      groupCount > 0 &&
      teamsPerGroup >= 2;

    if (!canAutoGenerateGroups) return;
    if (autoBootstrapKeyRef.current === bootstrapKey) return;
    autoBootstrapKeyRef.current = bootstrapKey;

    const seededGroups = generateGroupsSkeleton(
      groupCount,
      teamsPerGroup,
      [],
    ).map((group, index) => ({
      ...group,
      id: `g_${selectedCategoryId}_${index + 1}`,
      name: `Group ${String.fromCharCode(65 + index)}`,
    }));

    const nextBracketMatches =
      structureMode === "groups_knockout" && initialBracketMatches.length === 0
        ? generateBracketSkeleton(groupCount, qualifiersPerGroup)
        : initialBracketMatches;

    setGroups(seededGroups);
    setBracketMatches(nextBracketMatches);
    onGroupsSaved({
      groups: seededGroups,
      bracketMatches: nextBracketMatches,
      groupCount,
    });
    void syncTournamentGroups(seededGroups).then((savedGroups) => {
      setGroups(savedGroups);
      onGroupsSaved({
        groups: savedGroups,
        bracketMatches: nextBracketMatches,
        groupCount,
      });
    });
  }, [
    groupCount,
    initialBracketMatches,
    initialGroups,
    groups.length,
    onGroupsSaved,
    qualifiersPerGroup,
    selectedCategoryId,
    structureMode,
    syncTournamentGroups,
    teamsPerGroup,
  ]);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ mb: 2 }}>
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
              <EmojiEventsRoundedIcon sx={{ fontSize: 24, color: "#F54900" }} />
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
          <Typography sx={{ fontSize: "0.85rem", color: "#4A5565", mt: 0.75 }}>
            Groups are saved to the server. Bracket layout is a local admin preview until knockout matches are created.
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "#6B7280", mt: 0.75 }}>
            {structureMode ? `Structure: ${structureMode}` : "Structure not selected yet"}
          </Typography>
        </Box>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <TournamentPhaseBuilder
          groups={groups}
          bracketMatches={bracketMatches}
          groupCount={groupCount}
          teamsPerGroup={teamsPerGroup}
          qualifiersPerGroup={qualifiersPerGroup}
          entryLabel={entryLabel}
          availableEntries={availableEntries}
          resolveEntryLabel={resolveEntryLabel}
          structureMode={structureMode}
          onGroupsChange={(nextGroups) => {
            const normalizedGroups = nextGroups.map((group, index) => ({
              ...group,
              name: group.name || `Group ${index + 1}`,
            }));
            const isOnlyEmptySlotExpansion = normalizedGroups.every((nextGroup) => {
              const prevGroup = groups.find((g) => g.id === nextGroup.id);
              if (!prevGroup) return false;
              if (nextGroup.participants.length < prevGroup.participants.length) return false;
              for (let i = 0; i < prevGroup.participants.length; i += 1) {
                const prevValue = String(prevGroup.participants[i] ?? "").trim();
                const nextValue = String(nextGroup.participants[i] ?? "").trim();
                if (prevValue !== nextValue) return false;
              }
              return nextGroup.participants
                .slice(prevGroup.participants.length)
                .every((value) => !String(value ?? "").trim());
            });

            setGroups(normalizedGroups);

            if (isOnlyEmptySlotExpansion) {
              onGroupsSaved({
                groups: normalizedGroups,
                bracketMatches: latestBracketMatchesRef.current,
                groupCount: latestGroupCountRef.current,
              });
              return;
            }

            void syncTournamentGroups(normalizedGroups).then((savedGroups) => {
              setGroups(savedGroups);
              onGroupsSaved({
                groups: savedGroups,
                bracketMatches: latestBracketMatchesRef.current,
                groupCount: latestGroupCountRef.current,
              });
            });
          }}
          onGroupCountChange={(count) => {
            setGroupCount(count);
            onGroupsSaved({
              groups,
              bracketMatches,
              groupCount: count,
            });
          }}
          onBracketChange={(nextMatches) => {
            setBracketMatches(nextMatches);
            onGroupsSaved({
              groups,
              bracketMatches: nextMatches,
              groupCount,
            });
          }}
        />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            pt: 1,
          }}
        >
          <Button variant="outlined" onClick={onBackToStructure} sx={{ borderRadius: "10px" }}>
            Back: Structure
          </Button>
          <Button variant="contained" onClick={onNextToSchedule} sx={{ borderRadius: "10px" }}>
            Next: Schedule
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
