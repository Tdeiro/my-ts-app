// src/pages/AddTournamentPage.tsx
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
} from "@mui/material";
import { useNavigate } from "react-router-dom";

type TournamentForm = {
  name: string;
  sport: "Tennis" | "Beach Tennis" | "Padel" | "Pickleball" | "Other";
  format: "Singles" | "Doubles" | "Mixed";
  level: "Beginner" | "Intermediate" | "Advanced" | "All levels";
  timezone: string;
  locationName: string;
  address: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  startTime: string; // hh:mm
  endTime: string; // hh:mm
  registrationDeadline: string; // yyyy-mm-dd
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
    setSaving(true);
    try {
      // MVP stub — replace with your API call later
      await new Promise((r) => setTimeout(r, 600));
      console.log("Create tournament payload:", form);

      navigate("/dashboard");
    } finally {
      setSaving(false);
    }
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
        {/* Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h2" sx={{ mb: 0.5 }}>
              Add Tournament
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Set up key details now — you can refine brackets, seeding and
              scheduling later.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.25} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={saving || !form.name.trim()}
            >
              {saving ? "Saving…" : "Create Tournament"}
            </Button>
          </Stack>
        </Stack>

        {/* Content layout: form + right column */}
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          alignItems="flex-start"
        >
          {/* LEFT: Form */}
          <Card sx={{ flex: 1, width: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              {/* Basics */}
              <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
                Basics
              </Typography>
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
              <Typography
                variant="body1"
                sx={{ fontWeight: 700, mt: 4, mb: 1 }}
              >
                Location
              </Typography>
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
              <Typography
                variant="body1"
                sx={{ fontWeight: 700, mt: 4, mb: 1 }}
              >
                Date & Time
              </Typography>
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
              <Typography
                variant="body1"
                sx={{ fontWeight: 700, mt: 4, mb: 1 }}
              >
                Capacity & Fees
              </Typography>
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
              <Typography
                variant="body1"
                sx={{ fontWeight: 700, mt: 4, mb: 1 }}
              >
                Description
              </Typography>
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
          </Card>

          {/* RIGHT COLUMN: Preview + Settings */}
          <Stack
            spacing={2}
            sx={{ width: "100%", maxWidth: 360, flexShrink: 0 }}
          >
            {/* Preview */}
            <Card sx={{ width: "100%" }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
                  Preview
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Typography variant="h3" sx={{ mb: 1 }}>
                  {form.name || "Untitled Tournament"}
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mb: 2 }}
                  flexWrap="wrap"
                >
                  <Chip size="small" label={form.sport} />
                  <Chip size="small" label={form.format} />
                  <Chip size="small" label={form.level} />
                  <Chip
                    size="small"
                    label={form.isPublic ? "Public" : "Private"}
                    variant="outlined"
                  />
                </Stack>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {form.locationName}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {form.address}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  When
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5 }}
                >
                  {form.startDate} → {form.endDate} • {form.startTime}–
                  {form.endTime}
                </Typography>

                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  Registration
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5 }}
                >
                  Deadline: {form.registrationDeadline}
                </Typography>

                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  Capacity
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5 }}
                >
                  {form.capacity} players • Waitlist{" "}
                  {form.allowWaitlist ? "enabled" : "disabled"}
                </Typography>

                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  Entry Fee
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {form.entryFee} {form.currency}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Typography variant="body2" color="text.secondary">
                  {form.description}
                </Typography>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card sx={{ width: "100%" }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
                  Settings
                </Typography>
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
              </CardContent>
            </Card>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
