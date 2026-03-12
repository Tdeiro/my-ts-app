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
import type {
  RegisteredPlayer,
  TeamDto,
  TeamEditorState,
} from "./types";

type TeamsTabProps = {
  selectedCategoryId: string;
  selectedCategoryLevel: string;
  selectedCategoryDisplayName: string;
  selectedCategoryTeams: TeamDto[];
  teamEditor: TeamEditorState;
  relevantPlayers: RegisteredPlayer[];
  selectablePlayers: RegisteredPlayer[];
  assignedUserIds: Set<string>;
  registeredPlayersLoading: boolean;
  registeredPlayersError: string | null;
  teamsTabSubmitting: boolean;
  unassignedPlayersCount: number;
  showContinueWarning: boolean;
  onTeamEditorChange: (
    updater: (current: TeamEditorState) => TeamEditorState,
  ) => void;
  onEditTeam: (team: TeamDto) => void;
  onDeleteTeam: (teamId: number) => void;
  onSaveTeam: () => void;
  onBackToCategoryList: () => void;
  onNextToStructure: () => void;
  onDismissContinueWarning: () => void;
  onContinueAnyway: () => void;
};

export function TeamsTab({
  selectedCategoryId,
  selectedCategoryLevel,
  selectedCategoryDisplayName,
  selectedCategoryTeams,
  teamEditor,
  relevantPlayers,
  selectablePlayers,
  assignedUserIds,
  registeredPlayersLoading,
  registeredPlayersError,
  teamsTabSubmitting,
  unassignedPlayersCount,
  showContinueWarning,
  onTeamEditorChange,
  onEditTeam,
  onDeleteTeam,
  onSaveTeam,
  onBackToCategoryList,
  onNextToStructure,
  onDismissContinueWarning,
  onContinueAnyway,
}: TeamsTabProps) {
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
                <Typography sx={{ fontSize: "0.875rem", color: "#6A7282" }}>
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
                            onClick={() => onEditTeam(team)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => onDeleteTeam(team.id)}
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
                onClick={() => onTeamEditorChange(() => ({
                  name: "",
                  memberUserIds: [],
                  autoNameFromMembers: true,
                  editingTeamId: null,
                }))}
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
                    onTeamEditorChange((current) => ({
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
                          onTeamEditorChange((current) => {
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
                  teamsTabSubmitting ||
                  teamEditor.memberUserIds.length === 0 ||
                  !selectedCategoryId
                }
                onClick={onSaveTeam}
                sx={{
                  bgcolor:
                    teamsTabSubmitting || teamEditor.memberUserIds.length === 0
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
                      teamsTabSubmitting || teamEditor.memberUserIds.length === 0
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
            onClick={onNextToStructure}
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
                <Button size="small" variant="outlined" onClick={onDismissContinueWarning}>
                  Review Players
                </Button>
                <Button size="small" variant="contained" color="warning" onClick={onContinueAnyway}>
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
