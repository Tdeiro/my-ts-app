import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { getToken } from "../../auth/tokens";
import type {
  ApiEventSubscription,
  RegisteredPlayer,
  TeamDto,
  TeamEditorState,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function createEmptyTeamEditorState(): TeamEditorState {
  return {
    name: "",
    memberUserIds: [],
    autoNameFromMembers: true,
    editingTeamId: null,
  };
}

type TeamsTabProps = {
  eventId: string;
  selectedCategoryId: string;
  selectedCategoryLevel: string;
  selectedCategoryDisplayName: string;
  initialTeams: TeamDto[];
  onTeamsChange: (teams: TeamDto[]) => void;
  onBackToCategoryList: () => void;
  onNextToStructure: () => void;
};

export function TeamsTab({
  eventId,
  selectedCategoryId,
  selectedCategoryLevel,
  selectedCategoryDisplayName,
  initialTeams,
  onTeamsChange,
  onBackToCategoryList,
  onNextToStructure,
}: TeamsTabProps) {
  const [teams, setTeams] = React.useState<TeamDto[]>(initialTeams);
  const [teamEditor, setTeamEditor] = React.useState<TeamEditorState>(
    createEmptyTeamEditorState(),
  );
  const [registeredPlayers, setRegisteredPlayers] = React.useState<
    RegisteredPlayer[]
  >([]);
  const [registeredPlayersLoading, setRegisteredPlayersLoading] =
    React.useState(false);
  const [registeredPlayersError, setRegisteredPlayersError] = React.useState<
    string | null
  >(null);
  const [teamsLoading, setTeamsLoading] = React.useState(false);
  const [teamsSubmitting, setTeamsSubmitting] = React.useState(false);
  const [showContinueWarning, setShowContinueWarning] = React.useState(false);
  const [teamError, setTeamError] = React.useState<string | null>(null);
  const onTeamsChangeRef = React.useRef(onTeamsChange);

  React.useEffect(() => {
    onTeamsChangeRef.current = onTeamsChange;
  }, [onTeamsChange]);

  const loadTeams = React.useCallback(async () => {
    const token = getToken();
    const parsedCategoryId = Number(selectedCategoryId);
    if (!token || !Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
      setTeams([]);
      onTeamsChangeRef.current([]);
      return [];
    }

    setTeamsLoading(true);
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
      const nextTeams = (Array.isArray(data) ? data : (data?.data ?? [])) as TeamDto[];
      setTeams(nextTeams);
      onTeamsChangeRef.current(nextTeams);
      return nextTeams;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load teams.";
      setTeamError(message);
      setTeams([]);
      onTeamsChangeRef.current([]);
      return [];
    } finally {
      setTeamsLoading(false);
    }
  }, [selectedCategoryId]);

  React.useEffect(() => {
    setTeams(initialTeams);
  }, [initialTeams]);

  React.useEffect(() => {
    setTeamEditor(createEmptyTeamEditorState());
    setShowContinueWarning(false);
    setTeamError(null);
  }, [selectedCategoryId]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const token = getToken();
      if (!token || !eventId) {
        if (!cancelled) {
          setRegisteredPlayers([]);
          setRegisteredPlayersError("Could not load registered players.");
        }
        return;
      }

      setRegisteredPlayersLoading(true);
      setRegisteredPlayersError(null);
      try {
        const res = await fetch(`${API_URL}/events/${eventId}/subscriptions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body: ApiEventSubscription[] | null = await res
          .json()
          .catch(() => null);
        if (!res.ok) {
          throw new Error(
            (body as any)?.message?.[0] ||
              (body as any)?.error ||
              "Could not load registered players.",
          );
        }

        const players: RegisteredPlayer[] = (Array.isArray(body) ? body : [])
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

        if (!cancelled) {
          setRegisteredPlayers(players);
        }
      } catch (err) {
        if (!cancelled) {
          setRegisteredPlayersError(
            err instanceof Error
              ? err.message
              : "Could not load registered players.",
          );
          setRegisteredPlayers([]);
        }
      } finally {
        if (!cancelled) {
          setRegisteredPlayersLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  React.useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  const relevantPlayers = React.useMemo(
    () =>
      registeredPlayers.filter((player) =>
        player.categoryIds.includes(selectedCategoryId),
      ),
    [registeredPlayers, selectedCategoryId],
  );

  const assignedUserIds = React.useMemo(
    () =>
      new Set(
        teams
          .filter((team) => team.id !== teamEditor.editingTeamId)
          .flatMap((team) =>
            (team.members ?? []).map((member) => String(member.userId)),
          ),
      ),
    [teamEditor.editingTeamId, teams],
  );

  const selectablePlayers = React.useMemo(
    () =>
      relevantPlayers.filter(
        (player) =>
          !assignedUserIds.has(player.id) ||
          teamEditor.memberUserIds.includes(player.id),
      ),
    [assignedUserIds, relevantPlayers, teamEditor.memberUserIds],
  );

  const unassignedPlayersCount = React.useMemo(() => {
    const assignedInTeams = new Set(
      teams.flatMap((team) =>
        (team.members ?? []).map((member) => String(member.userId)),
      ),
    );
    return relevantPlayers.filter((player) => !assignedInTeams.has(player.id))
      .length;
  }, [relevantPlayers, teams]);

  const updateTeamEditor = React.useCallback(
    (updater: (current: TeamEditorState) => TeamEditorState) => {
      setTeamEditor((current) => updater(current));
    },
    [],
  );

  const handleEditTeam = React.useCallback((team: TeamDto) => {
    setTeamEditor({
      name: team.name ?? "",
      memberUserIds: (team.members ?? []).map((member) => String(member.userId)),
      autoNameFromMembers: Boolean(team.autoNameFromMembers),
      editingTeamId: team.id,
    });
  }, []);

  const handleSaveTeam = React.useCallback(async () => {
    const token = getToken();
    const parsedCategoryId = Number(selectedCategoryId);
    if (!token) {
      setTeamError("You are not logged in.");
      return;
    }
    if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
      setTeamError("Invalid category id for team.");
      return;
    }

    const members = teamEditor.memberUserIds
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => ({ userId: value, role: "Player" }));

    if (members.length === 0) {
      setTeamError("Select at least one player to create a team.");
      return;
    }

    setTeamsSubmitting(true);
    setTeamError(null);
    try {
      const payload = {
        categoryId: parsedCategoryId,
        categoryIds: [parsedCategoryId],
        name: teamEditor.name.trim() || undefined,
        autoNameFromMembers: teamEditor.autoNameFromMembers,
        members,
      };
      const endpoint =
        teamEditor.editingTeamId == null
          ? `${API_URL}/teams`
          : `${API_URL}/teams/${teamEditor.editingTeamId}`;
      const method = teamEditor.editingTeamId == null ? "POST" : "PUT";
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
          body?.message?.[0] ||
            body?.error ||
            (teamEditor.editingTeamId == null
              ? "Failed to create team."
              : "Failed to update team."),
        );
      }
      setTeamEditor(createEmptyTeamEditorState());
      setShowContinueWarning(false);
      await loadTeams();
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Failed to save team.");
    } finally {
      setTeamsSubmitting(false);
    }
  }, [loadTeams, selectedCategoryId, teamEditor]);

  const handleDeleteTeam = React.useCallback(
    async (teamId: number) => {
      const token = getToken();
      const parsedCategoryId = Number(selectedCategoryId);
      if (!token) {
        setTeamError("You are not logged in.");
        return;
      }
      if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
        setTeamError("Select a valid category before deleting a team.");
        return;
      }
      setTeamError(null);
      try {
        const matchesRes = await fetch(
          `${API_URL}/matches?categoryId=${encodeURIComponent(parsedCategoryId)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const matchesBody = await matchesRes.json().catch(() => null);
        if (!matchesRes.ok) {
          throw new Error(
            matchesBody?.message?.[0] ||
              matchesBody?.error ||
              "Failed to verify whether this team is scheduled in matches.",
          );
        }

        const matches = (Array.isArray(matchesBody)
          ? matchesBody
          : (matchesBody?.data ?? [])) as Array<{
          homeTeamId?: number | string;
          awayTeamId?: number | string;
          home_team_id?: number | string;
          away_team_id?: number | string;
          homeTeam?: { id?: number | string };
          awayTeam?: { id?: number | string };
        }>;

        const isScheduled = matches.some((match) => {
          const homeTeamId = Number(
            match.homeTeamId ?? match.home_team_id ?? match.homeTeam?.id,
          );
          const awayTeamId = Number(
            match.awayTeamId ?? match.away_team_id ?? match.awayTeam?.id,
          );
          return homeTeamId === teamId || awayTeamId === teamId;
        });

        if (isScheduled) {
          throw new Error(
            "Cannot delete this team because it is already used in scheduled matches. Remove the related matches first.",
          );
        }

        const res = await fetch(`${API_URL}/teams/${teamId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const message =
            body?.message?.[0] || body?.error || "Failed to delete team.";
          throw new Error(
            message === "Database constraint violation"
              ? "Cannot delete this team because it is still referenced by matches or scoring data. Remove those references first."
              : message,
          );
        }
        if (teamEditor.editingTeamId === teamId) {
          setTeamEditor(createEmptyTeamEditorState());
        }
        await loadTeams();
      } catch (err) {
        setTeamError(
          err instanceof Error ? err.message : "Failed to delete team.",
        );
      }
    },
    [loadTeams, selectedCategoryId, teamEditor.editingTeamId],
  );

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
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
            1. Create teams from registered players for this category.
          </Typography>
          <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
            2. Assigned players are removed from selection.
          </Typography>
          <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
            3. Continue to Structure after team setup.
          </Typography>
        </Box>

        {teamError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {teamError}
          </Alert>
        ) : null}

        {registeredPlayersError ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {registeredPlayersError}
          </Alert>
        ) : null}

        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
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
                {teams.length} teams
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
              {teamsLoading ? (
                <Typography sx={{ fontSize: "0.875rem", color: "#6A7282" }}>
                  Loading teams...
                </Typography>
              ) : teams.length === 0 ? (
                <Typography sx={{ fontSize: "0.875rem", color: "#6A7282" }}>
                  No teams created yet for this category.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {teams.map((team) => (
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
                            onClick={() => handleEditTeam(team)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => void handleDeleteTeam(team.id)}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </Stack>
                      <Typography sx={{ fontSize: "0.75rem", color: "#6A7282" }}>
                        Members: {team.members?.length ?? 0}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
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
                onClick={() => setTeamEditor(createEmptyTeamEditorState())}
              >
                Cancel
              </Button>
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
                {teamEditor.editingTeamId == null ? "New Team" : "Edit Team"}
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
                    updateTeamEditor((current) => ({
                      ...current,
                      name: e.target.value,
                    }))
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
                  Select Players ({teamEditor.memberUserIds.length} selected)
                </Typography>
                <Stack spacing={1} sx={{ maxHeight: 180, overflowY: "auto" }}>
                  {registeredPlayersLoading ? (
                    <Typography sx={{ fontSize: "0.875rem", color: "#6A7282", p: 1 }}>
                      Loading players...
                    </Typography>
                  ) : selectablePlayers.length === 0 ? (
                    <Typography sx={{ fontSize: "0.875rem", color: "#6A7282", p: 1 }}>
                      No available players for this category. Assigned players are in teams already.
                    </Typography>
                  ) : (
                    selectablePlayers.map((player) => (
                      <Box
                        key={`picker-teams-${player.id}`}
                        sx={{
                          p: 1,
                          borderRadius: "4px",
                          "&:hover": { bgcolor: "#F9FAFB" },
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          updateTeamEditor((current) => {
                            const exists = current.memberUserIds.includes(player.id);
                            return {
                              ...current,
                              memberUserIds: exists
                                ? current.memberUserIds.filter((id) => id !== player.id)
                                : [...current.memberUserIds, player.id],
                            };
                          })
                        }
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              border: "2px solid #D1D5DC",
                              borderRadius: "4px",
                              bgcolor: teamEditor.memberUserIds.includes(player.id)
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

              <Button
                fullWidth
                disabled={
                  teamsSubmitting ||
                  teamEditor.memberUserIds.length === 0 ||
                  !selectedCategoryId
                }
                onClick={() => void handleSaveTeam()}
                sx={{
                  bgcolor:
                    teamsSubmitting || teamEditor.memberUserIds.length === 0
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
                      teamsSubmitting || teamEditor.memberUserIds.length === 0
                        ? "#D1D5DC"
                        : "#7C3AED",
                  },
                }}
              >
                {teamsSubmitting
                  ? "Saving..."
                  : teamEditor.editingTeamId == null
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
              Hint: `♥ Name` shows this player's desired partner for team creation.
            </Typography>
            <Stack spacing={1.5} sx={{ maxHeight: 280, overflowY: "auto", pr: 0.5 }}>
              {registeredPlayersLoading ? (
                <Typography sx={{ fontSize: "0.875rem", color: "#6A7282", p: 1 }}>
                  Loading players...
                </Typography>
              ) : relevantPlayers.length === 0 ? (
                <Typography sx={{ fontSize: "0.875rem", color: "#6A7282", p: 1 }}>
                  No registered players available yet.
                </Typography>
              ) : (
                relevantPlayers.map((player) => (
                  <Box
                    key={`all-teams-${player.id}`}
                    sx={{
                      p: 1.5,
                      bgcolor: assignedUserIds.has(player.id) ? "#ECFDF3" : "white",
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
                        <Typography sx={{ fontSize: "0.75rem", color: "#6A7282" }}>
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
                            Wants to play with {player.preferredPartner}
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
            onClick={onBackToCategoryList}
            sx={{ borderRadius: "10px" }}
          >
            Back: Category List
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (unassignedPlayersCount > 0) {
                setShowContinueWarning(true);
                return;
              }
              setShowContinueWarning(false);
              onNextToStructure();
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
            Next: Structure →
          </Button>
        </Box>
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
                {unassignedPlayersCount} player(s) are still without a team in this category.
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: "flex-end", flexWrap: "wrap" }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setShowContinueWarning(false)}
                >
                  Review Players
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  onClick={() => {
                    setShowContinueWarning(false);
                    onNextToStructure();
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
  );
}
