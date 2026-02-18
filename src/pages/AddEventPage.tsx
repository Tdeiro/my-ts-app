import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  Chip,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getToken } from "../auth/tokens";

type TournamentForm = {
  name: string;
  sport: "Tennis" | "Beach Tennis" | "Padel" | "Pickleball" | "Other";
  format: "Singles" | "Doubles" | "Mixed";
  level: "Beginner" | "Intermediate" | "Advanced" | "All levels";
  timezone: string;
  locationName: string;
  address: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  capacity: number;
  entryFee: number;
  currency: "AUD" | "USD" | "EUR" | "BRL";
  description: string;
  isPublic: boolean;
  allowWaitlist: boolean;
  requireApproval: boolean;
};

const initialForm: TournamentForm = {
  name: "Spring Open",
  sport: "Tennis",
  format: "Doubles",
  level: "All levels",
  timezone: "Australia/Sydney",
  locationName: "Sydney Tennis Centre",
  address: "Olympic Blvd, Sydney NSW",
  startDate: "2026-04-22",
  endDate: "2026-04-22",
  startTime: "09:00",
  endTime: "17:00",
  registrationDeadline: "2026-04-20",
  capacity: 64,
  entryFee: 25,
  currency: "AUD",
  description:
    "A friendly weekend tournament. Round-robin groups + knockout finals. Bring water and sunscreen.",
  isPublic: true,
  allowWaitlist: true,
  requireApproval: false,
};

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

function pillChipSx(kind: "primary" | "muted" | "orange" = "muted") {
  if (kind === "primary") {
    return {
      borderRadius: 999,
      borderColor: "rgba(139,92,246,0.22)",
      bgcolor: "rgba(139,92,246,0.06)",
      color: "primary.main",
      fontWeight: 650,
    };
  }
  if (kind === "orange") {
    return {
      borderRadius: 999,
      borderColor: "rgba(255,107,92,0.35)",
      bgcolor: "rgba(255,107,92,0.06)",
      color: "rgba(255,107,92,0.95)",
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

export default function AddTournamentPage() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState<TournamentForm>(initialForm);
  const [saving, setSaving] = React.useState(false);

  const setField =
    <K extends keyof TournamentForm>(key: K) =>
    (
      e:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | { target: { value: unknown } },
    ) => {
      setForm((prev) => ({
        ...prev,
        [key]: (e.target.value as TournamentForm[K]) ?? prev[key],
      }));
    };

  const setSwitch =
    (key: keyof TournamentForm) =>
    (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      setForm((prev) => ({ ...prev, [key]: checked as unknown }));
    };

  const handleCancel = () => navigate(-1);

  const handleSubmit = async () => {
    const token = getToken();

    if (!token) {
      navigate("/login");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        eventType: "TOURNAMENT",
        sport: form.sport.toUpperCase(),
        format: form.format,
        level: form.level,
        timezone: form.timezone,
        locationName: form.locationName,
        address: form.address,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: `${form.startTime}:00`,
        endTime: `${form.endTime}:00`,
        registrationDeadline: form.registrationDeadline,
        capacity: form.capacity,
        entryFee: form.entryFee,
        currency: form.currency,
        description: form.description,
        isPublic: form.isPublic,
        allowWaitlist: form.allowWaitlist,
        requireApproval: form.requireApproval,
      };

      const res = await fetch("/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Create event failed:", data);
        if (res.status === 401) {
          navigate("/login");
          return;
        }
        throw new Error(data?.message || "Failed to create event");
      }

      console.log("Created event:", data);

      // ✅ Success → go to tournaments list
      navigate("/tournaments");
    } catch (err) {
      console.error(err);
      alert("Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  const whenText = `${form.startDate || "—"} → ${form.endDate || "—"} • ${
    form.startTime || "—"
  }–${form.endTime || "—"}`;

  const feeText = `${Number(form.entryFee || 0)} ${form.currency}`;

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
        {/* Header wash */}
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
                Add Tournament
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Set the essentials now — you can refine brackets, seeding and
                scheduling later.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.25} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={handleCancel}
                sx={{
                  borderRadius: 999,
                  borderColor: "rgba(139,92,246,0.25)",
                  color: "primary.main",
                  "&:hover": {
                    borderColor: "primary.main",
                    backgroundColor: "rgba(139,92,246,0.08)",
                    boxShadow: "0 0 0 3px rgba(255,107,92,0.10)",
                  },
                }}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={saving || !form.name.trim()}
                sx={{ borderRadius: 999 }}
              >
                {saving ? "Saving…" : "Create Tournament"}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Content layout: form + right column */}
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          alignItems="flex-start"
        >
          {/* LEFT: Form */}
          <SoftCard>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              {/* Basics */}
              <SectionTitle>Basics</SectionTitle>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <TextField
                  label="Tournament Name"
                  value={form.name}
                  onChange={setField("name")}
                  fullWidth
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Sport</InputLabel>
                    <Select
                      label="Sport"
                      value={form.sport}
                      onChange={setField("sport")}
                    >
                      <MenuItem value="Tennis">Tennis</MenuItem>
                      <MenuItem value="Beach Tennis">Beach Tennis</MenuItem>
                      <MenuItem value="Padel">Padel</MenuItem>
                      <MenuItem value="Pickleball">Pickleball</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Format</InputLabel>
                    <Select
                      label="Format"
                      value={form.format}
                      onChange={setField("format")}
                    >
                      <MenuItem value="Singles">Singles</MenuItem>
                      <MenuItem value="Doubles">Doubles</MenuItem>
                      <MenuItem value="Mixed">Mixed</MenuItem>
                    </Select>
                  </FormControl>

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
                      <MenuItem value="All levels">All levels</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                <FormControl fullWidth>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    label="Timezone"
                    value={form.timezone}
                    onChange={setField("timezone")}
                  >
                    <MenuItem value="Australia/Sydney">
                      Australia/Sydney
                    </MenuItem>
                    <MenuItem value="Australia/Melbourne">
                      Australia/Melbourne
                    </MenuItem>
                    <MenuItem value="Australia/Brisbane">
                      Australia/Brisbane
                    </MenuItem>
                    <MenuItem value="UTC">UTC</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              {/* Location */}
              <SectionTitle>Location</SectionTitle>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <TextField
                  label="Venue / Club Name"
                  value={form.locationName}
                  onChange={setField("locationName")}
                  fullWidth
                />
                <TextField
                  label="Address"
                  value={form.address}
                  onChange={setField("address")}
                  fullWidth
                />
              </Stack>

              {/* Date & time */}
              <SectionTitle>Date & Time</SectionTitle>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={form.startDate}
                    onChange={setField("startDate")}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    value={form.endDate}
                    onChange={setField("endDate")}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Stack>

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

                <TextField
                  label="Registration Deadline"
                  type="date"
                  value={form.registrationDeadline}
                  onChange={setField("registrationDeadline")}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>

              {/* Capacity & fees */}
              <SectionTitle>Capacity & Fees</SectionTitle>
              <Divider sx={{ mb: 2 }} />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
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
                <TextField
                  label="Entry Fee"
                  type="number"
                  value={form.entryFee}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      entryFee: Math.max(0, Number(e.target.value || 0)),
                    }))
                  }
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    label="Currency"
                    value={form.currency}
                    onChange={setField("currency")}
                  >
                    <MenuItem value="AUD">AUD</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                    <MenuItem value="BRL">BRL</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              {/* Description */}
              <SectionTitle>Description</SectionTitle>
              <Divider sx={{ mb: 2 }} />

              <TextField
                label="Details"
                value={form.description}
                onChange={setField("description")}
                multiline
                minRows={4}
                fullWidth
              />
            </CardContent>
          </SoftCard>

          {/* RIGHT COLUMN: Preview + Settings */}
          <Stack
            spacing={2}
            sx={{ width: "100%", maxWidth: 360, flexShrink: 0 }}
          >
            {/* Preview */}
            <SoftCard>
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <SectionTitle>Preview</SectionTitle>
                <Divider sx={{ mb: 2 }} />

                <Typography variant="h3" sx={{ mb: 1, fontWeight: 900 }}>
                  {form.name || "Untitled Tournament"}
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
                    label={form.sport}
                    variant="outlined"
                    sx={pillChipSx("primary")}
                  />
                  <Chip
                    size="small"
                    label={form.format}
                    variant="outlined"
                    sx={pillChipSx("muted")}
                  />
                  <Chip
                    size="small"
                    label={form.level}
                    variant="outlined"
                    sx={pillChipSx("muted")}
                  />
                  <Chip
                    size="small"
                    label={form.isPublic ? "Public" : "Private"}
                    variant="outlined"
                    sx={
                      form.isPublic
                        ? pillChipSx("primary")
                        : pillChipSx("orange")
                    }
                  />
                </Stack>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0.5 }}
                >
                  {form.locationName || "Venue not set"}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {form.address || "Address not set"}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1.25}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      When
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {whenText}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      Registration
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Deadline: {form.registrationDeadline || "—"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      Capacity
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {form.capacity} players • Waitlist{" "}
                      {form.allowWaitlist ? "enabled" : "disabled"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      Entry Fee
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feeText}
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary">
                  {form.description || "Add a short description for players…"}
                </Typography>
              </CardContent>
            </SoftCard>

            {/* Settings */}
            <SoftCard>
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <SectionTitle>Settings</SectionTitle>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.isPublic}
                        onChange={setSwitch("isPublic")}
                      />
                    }
                    label="Public tournament (visible to everyone)"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.allowWaitlist}
                        onChange={setSwitch("allowWaitlist")}
                      />
                    }
                    label="Allow waitlist when full"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.requireApproval}
                        onChange={setSwitch("requireApproval")}
                      />
                    }
                    label="Require approval to join"
                  />
                </Stack>

                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid rgba(255,107,92,0.18)",
                    background: "rgba(255,107,92,0.06)",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 800, mb: 0.25 }}
                  >
                    Tip
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Keep it public while testing, then switch to private for
                    invite-only.
                  </Typography>
                </Box>
              </CardContent>
            </SoftCard>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
