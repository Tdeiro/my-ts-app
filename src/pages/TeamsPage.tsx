import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { getToken } from "../auth/tokens";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type TeamMemberInput = {
  userId: string;
  role: string;
};

type TeamForm = {
  categoryId: string;
  name: string;
  autoNameFromMembers: boolean;
  members: TeamMemberInput[];
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

const emptyForm: TeamForm = {
  categoryId: "",
  name: "",
  autoNameFromMembers: true,
  members: [{ userId: "", role: "Player" }],
};

function normalizeMembers(members: TeamMemberInput[]) {
  return members
    .map((m) => ({
      userId: Number(m.userId),
      role: m.role.trim() || "Player",
    }))
    .filter((m) => Number.isFinite(m.userId) && m.userId > 0);
}

export default function TeamsPage() {
  const [filterCategoryId, setFilterCategoryId] = React.useState("");
  const [teams, setTeams] = React.useState<TeamDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<TeamForm>(emptyForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [editingTeamId, setEditingTeamId] = React.useState<number | null>(null);

  const loadTeams = React.useCallback(async (categoryId: string) => {
    const token = getToken();
    if (!token) {
      setError("You are not logged in.");
      return;
    }
    const parsedCategoryId = Number(categoryId);
    if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
      setError("Enter a valid category id to load teams.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/teams?categoryId=${encodeURIComponent(parsedCategoryId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.message?.[0] || data?.error || `Failed to load teams (${res.status})`,
        );
      }
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setTeams(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams.");
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetForm = () => {
    setForm((prev) => ({ ...emptyForm, categoryId: prev.categoryId || filterCategoryId }));
    setEditingTeamId(null);
  };

  const handleSave = async () => {
    const token = getToken();
    if (!token) {
      setError("You are not logged in.");
      return;
    }

    const parsedCategoryId = Number(form.categoryId);
    if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
      setError("Category id is required.");
      return;
    }

    const members = normalizeMembers(form.members);
    if (members.length === 0) {
      setError("At least one valid member is required.");
      return;
    }

    const payload = {
      categoryId: parsedCategoryId,
      name: form.name.trim() || undefined,
      autoNameFromMembers: form.autoNameFromMembers,
      members,
    };

    setSubmitting(true);
    setError(null);
    setStatusMessage(null);

    try {
      const url =
        editingTeamId == null ? `${API_URL}/teams` : `${API_URL}/teams/${editingTeamId}`;
      const method = editingTeamId == null ? "POST" : "PUT";

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
            (editingTeamId == null ? "Failed to create team." : "Failed to update team."),
        );
      }

      setStatusMessage(editingTeamId == null ? "Team created." : "Team updated.");
      await loadTeams(String(parsedCategoryId));
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save team.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const token = getToken();
    if (!token) {
      setError("You are not logged in.");
      return;
    }
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_URL}/teams/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message?.[0] || body?.error || "Failed to delete team.");
      }
      setStatusMessage("Team deleted.");
      if (filterCategoryId) await loadTeams(filterCategoryId);
      if (editingTeamId === id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team.");
    }
  };

  const startEdit = (team: TeamDto) => {
    setEditingTeamId(team.id);
    setForm({
      categoryId: String(team.categoryId ?? filterCategoryId ?? ""),
      name: team.name ?? "",
      autoNameFromMembers: Boolean(team.autoNameFromMembers),
      members:
        team.members && team.members.length > 0
          ? team.members.map((m) => ({
              userId: String(m.userId ?? ""),
              role: String(m.role ?? "Player"),
            }))
          : [{ userId: "", role: "Player" }],
    });
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
          <Typography variant="h2" sx={{ mb: 0.5, fontWeight: 900 }}>
            Teams
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage teams by tournament category.
          </Typography>
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

        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="flex-start">
          <Card sx={{ width: "100%", maxWidth: 420 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>
                {editingTeamId == null ? "New Team" : `Edit Team #${editingTeamId}`}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={1.25}>
                <TextField
                  label="Category Id"
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, categoryId: e.target.value }))
                  }
                  type="number"
                  fullWidth
                />

                <TextField
                  label="Team Name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Falcons"
                  fullWidth
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={form.autoNameFromMembers}
                      onChange={(_, checked) =>
                        setForm((prev) => ({ ...prev, autoNameFromMembers: checked }))
                      }
                    />
                  }
                  label="Auto-name from members"
                />

                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Members
                </Typography>

                {form.members.map((member, idx) => (
                  <Stack key={`member-${idx}`} direction="row" spacing={1}>
                    <TextField
                      label="User Id"
                      type="number"
                      value={member.userId}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          members: prev.members.map((m, i) =>
                            i === idx ? { ...m, userId: e.target.value } : m,
                          ),
                        }))
                      }
                      fullWidth
                    />
                    <TextField
                      label="Role"
                      value={member.role}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          members: prev.members.map((m, i) =>
                            i === idx ? { ...m, role: e.target.value } : m,
                          ),
                        }))
                      }
                      fullWidth
                    />
                    <IconButton
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          members:
                            prev.members.length <= 1
                              ? prev.members
                              : prev.members.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}

                <Button
                  variant="text"
                  startIcon={<AddRoundedIcon />}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      members: [...prev.members, { userId: "", role: "Player" }],
                    }))
                  }
                >
                  Add Member
                </Button>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    onClick={resetForm}
                    disabled={submitting}
                    sx={{ borderRadius: 999 }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={submitting}
                    sx={{ borderRadius: 999 }}
                  >
                    {submitting
                      ? "Saving..."
                      : editingTeamId == null
                        ? "Create Team"
                        : "Save Changes"}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ width: "100%", flex: 1 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.25}
                alignItems={{ sm: "center" }}
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography sx={{ fontWeight: 900 }}>Teams List</Typography>
                <Stack direction="row" spacing={1}>
                  <TextField
                    label="Category Id"
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                    type="number"
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    onClick={() => loadTeams(filterCategoryId)}
                    disabled={loading}
                    sx={{ borderRadius: 999 }}
                  >
                    {loading ? "Loading..." : "Load"}
                  </Button>
                </Stack>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              {teams.length === 0 ? (
                <Typography color="text.secondary">
                  No teams loaded. Enter a category id and click Load.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {teams.map((team) => (
                    <Box
                      key={team.id}
                      sx={{
                        border: "1px solid rgba(15,23,42,0.10)",
                        borderRadius: 2,
                        p: 1.5,
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        justifyContent="space-between"
                        alignItems={{ sm: "center" }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 800 }}>
                            {team.name || `Team #${team.id}`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Category: {team.categoryId} • Members:{" "}
                            {team.members?.length ?? 0}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditRoundedIcon fontSize="small" />}
                            onClick={() => startEdit(team)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            startIcon={<DeleteOutlineRoundedIcon fontSize="small" />}
                            onClick={() => void handleDelete(team.id)}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </Stack>

                      {team.members && team.members.length > 0 ? (
                        <Stack sx={{ mt: 1 }} spacing={0.5}>
                          {team.members.map((member, idx) => (
                            <Typography
                              key={`team-${team.id}-member-${idx}`}
                              variant="body2"
                              color="text.secondary"
                            >
                              #{member.userId} {member.userFullName ? `• ${member.userFullName}` : ""}{" "}
                              {member.role ? `• ${member.role}` : ""}
                            </Typography>
                          ))}
                        </Stack>
                      ) : null}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
}
