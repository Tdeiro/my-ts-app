import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { getLoggedInUserId, getToken } from "../auth/tokens";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type ClassLevel = "Beginner" | "Intermediate" | "Advanced";
type ClassStatus = "Active" | "Cancelled";
type WeekDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

type ClassForm = {
  title: string;
  coach: string;
  monthDate: string;
  startTime: string;
  endTime: string;
  level: ClassLevel;
  students: number;
  capacity: number;
  status: ClassStatus;
  location: string;
};

type ApiClass = {
  id: number | string;
  userId?: number | string;
  user_id?: number | string;
  title?: string;
  coach?: string;
  weekDay?: string;
  monthDate?: string;
  startTime?: string;
  endTime?: string;
  level?: string;
  students?: number | string;
  capacity?: number | string;
  status?: string;
  location?: string;
};

const initialForm: ClassForm = {
  title: "",
  coach: "",
  monthDate: "",
  startTime: "09:00",
  endTime: "10:00",
  level: "Beginner",
  students: 0,
  capacity: 20,
  status: "Active",
  location: "",
};

const WEEK_DAYS: WeekDay[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="body1"
      sx={{ fontWeight: 900, fontSize: "0.95rem", mb: 1 }}
    >
      {children}
    </Typography>
  );
}

function SoftCard({ children }: { children: React.ReactNode }) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: "none",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        overflow: "hidden",
      }}
    >
      {children}
    </Card>
  );
}

function chipSx(kind: "primary" | "muted" = "muted") {
  if (kind === "primary") {
    return {
      borderRadius: 999,
      borderColor: "rgba(139,92,246,0.22)",
      bgcolor: "rgba(139,92,246,0.06)",
      color: "primary.main",
      fontWeight: 650,
    };
  }
  return {
    borderRadius: 999,
    borderColor: "rgba(15,23,42,0.12)",
    bgcolor: "rgba(15,23,42,0.03)",
    color: "text.secondary",
    fontWeight: 650,
  };
}

function normalizeLevel(level?: string): ClassLevel {
  if (level === "Intermediate" || level === "Advanced") return level;
  return "Beginner";
}

function normalizeStatus(status?: string): ClassStatus {
  return status?.toUpperCase() === "CANCELLED" ? "Cancelled" : "Active";
}

function toInputDate(value?: string) {
  if (!value) return "";
  if (value.includes("T")) return value.split("T")[0];
  return value.slice(0, 10);
}

function toInputTime(value?: string) {
  if (!value) return "";
  const match = value.match(/^(\d{2}:\d{2})/);
  return match?.[1] ?? "";
}

function getWeekDay(monthDate: string): WeekDay {
  if (!monthDate) return "Monday";
  const [y, m, d] = monthDate.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return WEEK_DAYS[day === 0 ? 6 : day - 1];
}

function mapClassToForm(item: ApiClass): ClassForm {
  return {
    title: item.title?.trim() || "",
    coach: item.coach?.trim() || "",
    monthDate: toInputDate(item.monthDate),
    startTime: toInputTime(item.startTime) || "09:00",
    endTime: toInputTime(item.endTime) || "10:00",
    level: normalizeLevel(item.level),
    students: Math.max(0, Number(item.students ?? 0) || 0),
    capacity: Math.max(0, Number(item.capacity ?? 20) || 20),
    status: normalizeStatus(item.status),
    location: item.location || "",
  };
}

export default function CreateClassPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [form, setForm] = React.useState<ClassForm>(initialForm);
  const [saving, setSaving] = React.useState(false);
  const [loadingClass, setLoadingClass] = React.useState(isEditMode);
  const [error, setError] = React.useState<string | null>(null);

  const setField =
    <K extends keyof ClassForm>(key: K) =>
    (
      e:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | { target: { value: unknown } },
    ) => {
      setForm((prev) => ({
        ...prev,
        [key]: (e.target.value as ClassForm[K]) ?? prev[key],
      }));
    };

  React.useEffect(() => {
    if (!isEditMode || !id) return;

    let cancelled = false;
    const loadClass = async () => {
      setLoadingClass(true);
      setError(null);

      const token = getToken();
      const currentUserId = getLoggedInUserId();
      if (!token) {
        navigate("/login");
        return;
      }
      if (currentUserId === null) {
        setError("Invalid session. Please sign in again.");
        setLoadingClass(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            errData?.message?.[0] ||
              errData?.error ||
              `Failed to load class (${res.status})`,
          );
        }

        const data = await res.json().catch(() => null);
        const raw: ApiClass[] = Array.isArray(data) ? data : (data?.data ?? []);
        const hasOwnerField = raw.some(
          (item) => item.userId != null || item.user_id != null,
        );
        const scoped = hasOwnerField
          ? raw.filter((item) => {
              const owner = Number(item.userId ?? item.user_id);
              return Number.isFinite(owner) && owner === currentUserId;
            })
          : raw;

        const selected = scoped.find((item) => String(item.id) === String(id));

        if (!selected) throw new Error("Class not found.");

        if (!cancelled) {
          setForm(mapClassToForm(selected));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load class data",
          );
        }
      } finally {
        if (!cancelled) setLoadingClass(false);
      }
    };

    loadClass();
    return () => {
      cancelled = true;
    };
  }, [id, isEditMode, navigate]);

  const handleSubmit = async () => {
    setError(null);
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    setSaving(true);
    try {
      const weekDay = getWeekDay(form.monthDate);

      const editPayload = {
        title: form.title.trim(),
        coach: form.coach.trim(),
        weekDay,
        monthDate: form.monthDate,
        startTime: `${form.startTime}:00`,
        endTime: `${form.endTime}:00`,
        level: form.level,
        students: form.students,
        status: form.status,
        capacity: form.capacity,
        location: form.location.trim(),
      };

      const createPayload = {
        ...editPayload,
      };

      const res = await fetch(
        isEditMode && id ? `${API_URL}/classes/${id}` : `${API_URL}/classes`,
        {
          method: isEditMode ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(isEditMode ? editPayload : createPayload),
        },
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 401) {
          navigate("/login");
          return;
        }
        throw new Error(
          data?.message?.[0] ||
            data?.message ||
            (isEditMode ? "Failed to update class" : "Failed to create class"),
        );
      }

      navigate("/classes");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditMode
            ? "Failed to update class"
            : "Failed to create class",
      );
    } finally {
      setSaving(false);
    }
  };

  const whenText = `${form.monthDate || "-"} • ${form.startTime || "-"}-${form.endTime || "-"}`;

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
                {isEditMode ? "Edit Class" : "Create Class"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isEditMode
                  ? "Update class details and save your changes."
                  : "Create a class with the schedule and roster details."}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.25} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
                sx={{
                  borderRadius: 999,
                  borderColor: "rgba(139,92,246,0.25)",
                  color: "primary.main",
                }}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={
                  saving ||
                  loadingClass ||
                  !form.title.trim() ||
                  !form.monthDate
                }
                sx={{ borderRadius: 999 }}
              >
                {saving
                  ? "Saving..."
                  : isEditMode
                    ? "Save Changes"
                    : "Create Class"}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {loadingClass ? (
          <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
            <CircularProgress size={30} sx={{ mb: 1.5 }} />
            <Typography variant="body2" color="text.secondary">
              Loading class data...
            </Typography>
          </Paper>
        ) : (
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            alignItems="flex-start"
          >
            <Box sx={{ width: "100%", flex: 1, minWidth: 0 }}>
              <SoftCard>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <SectionTitle>Basics</SectionTitle>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={2}>
                    <TextField
                      label="Class Title"
                      value={form.title}
                      onChange={setField("title")}
                      fullWidth
                    />

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField
                        label="Coach"
                        value={form.coach}
                        onChange={setField("coach")}
                        fullWidth
                      />

                      <FormControl fullWidth>
                        <InputLabel>Level</InputLabel>
                        <Select
                          label="Level"
                          value={form.level}
                          onChange={setField("level")}
                        >
                          <MenuItem value="Beginner">Beginner</MenuItem>
                          <MenuItem value="Intermediate">Intermediate</MenuItem>
                          <MenuItem value="Advanced">Advanced</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                  </Stack>

                  <SectionTitle>Date & Time</SectionTitle>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={2}>
                    <TextField
                      label="Date"
                      type="date"
                      value={form.monthDate}
                      onChange={setField("monthDate")}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField
                        label="Start Time"
                        type="time"
                        value={form.startTime}
                        onChange={setField("startTime")}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />
                      <TextField
                        label="End Time"
                        type="time"
                        value={form.endTime}
                        onChange={setField("endTime")}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />
                    </Stack>
                  </Stack>

                  <SectionTitle>Roster</SectionTitle>
                  <Divider sx={{ mb: 2 }} />

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Students"
                      type="number"
                      value={form.students}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          students: Math.max(0, Number(e.target.value || 0)),
                        }))
                      }
                      fullWidth
                    />

                    <TextField
                      label="Capacity"
                      type="number"
                      value={form.capacity}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          capacity: Math.max(0, Number(e.target.value || 0)),
                        }))
                      }
                      fullWidth
                    />
                  </Stack>

                  <SectionTitle>Status & Location</SectionTitle>
                  <Divider sx={{ mb: 2 }} />

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        label="Status"
                        value={form.status}
                        onChange={setField("status")}
                      >
                        <MenuItem value="Active">Active</MenuItem>
                        <MenuItem value="Cancelled">Cancelled</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      label="Location"
                      value={form.location}
                      onChange={setField("location")}
                      fullWidth
                    />
                  </Stack>
                </CardContent>
              </SoftCard>
            </Box>

            <Stack
              spacing={2}
              sx={{
                width: { xs: "100%", lg: 360 },
                maxWidth: 360,
                flexShrink: 0,
                ml: { lg: "auto" },
              }}
            >
              <SoftCard>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <SectionTitle>Preview</SectionTitle>
                  <Divider sx={{ mb: 2 }} />

                  <Typography variant="h3" sx={{ mb: 1, fontWeight: 900 }}>
                    {form.title || "Untitled Class"}
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ mb: 2 }}
                    flexWrap="wrap"
                    rowGap={1}
                  >
                    <Chip
                      size="small"
                      label={form.level}
                      variant="outlined"
                      sx={chipSx("primary")}
                    />
                    <Chip
                      size="small"
                      label={getWeekDay(form.monthDate)}
                      variant="outlined"
                      sx={chipSx("muted")}
                    />
                    <Chip
                      size="small"
                      label={form.status}
                      variant="outlined"
                      sx={chipSx("muted")}
                    />
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    Coach: {form.coach || "-"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Location: {form.location || "-"}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Students: {form.students} / {form.capacity}
                  </Typography>

                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    Schedule
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {whenText}
                  </Typography>
                </CardContent>
              </SoftCard>
            </Stack>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
