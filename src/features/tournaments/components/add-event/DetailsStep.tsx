import * as React from "react";
import {
  Box,
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
} from "@mui/material";
import type { TournamentForm } from "../../types/addEventTypes";
import { SectionTitle, SoftCard } from "./AddEventCards";

export type DetailsStepProps = {
  form: TournamentForm;
  setField: <K extends keyof TournamentForm>(
    key: K,
  ) => (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | { target: { value: unknown } },
  ) => void;
  setForm: React.Dispatch<React.SetStateAction<TournamentForm>>;
  setSwitch: (
    key: keyof TournamentForm,
  ) => (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  todayIsoDate: string;
};

export default function DetailsStep({
  form,
  setField,
  setForm,
  setSwitch,
  todayIsoDate,
}: DetailsStepProps) {
  // Step 1: capture core tournament details (name, dates, settings).
  return (
    <Stack
      direction={{ xs: "column", lg: "row" }}
      spacing={2}
      alignItems="flex-start"
    >
      <Box sx={{ width: "100%", flex: 1 }}>
        <SoftCard>
          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            <SectionTitle>Basics</SectionTitle>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2}>
              <TextField
                label="Tournament Name"
                value={form.name}
                onChange={setField("name")}
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel>Sport</InputLabel>
                <Select
                  label="Sport"
                  value={form.sport}
                  onChange={setField("sport")}
                >
                  <MenuItem value="">
                    <em>Select sport</em>
                  </MenuItem>
                  <MenuItem value="Tennis">Tennis</MenuItem>
                  <MenuItem value="Beach Tennis">Beach Tennis</MenuItem>
                  <MenuItem value="Padel">Padel</MenuItem>
                  <MenuItem value="Pickleball">Pickleball</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  label="Timezone"
                  value={form.timezone}
                  onChange={setField("timezone")}
                >
                  <MenuItem value="">
                    <em>Select timezone</em>
                  </MenuItem>
                  <MenuItem value="Australia/Sydney">Australia/Sydney</MenuItem>
                  <MenuItem value="Australia/Melbourne">Australia/Melbourne</MenuItem>
                  <MenuItem value="Australia/Brisbane">Australia/Brisbane</MenuItem>
                  <MenuItem value="UTC">UTC</MenuItem>
                </Select>
              </FormControl>
            </Stack>

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
                  inputProps={{ min: todayIsoDate }}
                  error={Boolean(form.startDate) && form.startDate < todayIsoDate}
                  helperText={
                    form.startDate && form.startDate < todayIsoDate
                      ? "Start date cannot be before today."
                      : " "
                  }
                  fullWidth
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={form.endDate}
                  onChange={setField("endDate")}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: form.startDate || todayIsoDate }}
                  error={
                    Boolean(form.endDate) &&
                    Boolean(form.startDate) &&
                    form.endDate < form.startDate
                  }
                  helperText={
                    form.endDate &&
                    form.startDate &&
                    form.endDate < form.startDate
                      ? "End date must be on or after start date."
                      : " "
                  }
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
                inputProps={{
                  min: todayIsoDate,
                  max: form.startDate || undefined,
                }}
                fullWidth
              />
            </Stack>

            <SectionTitle>Capacity</SectionTitle>
            <Divider sx={{ mb: 2 }} />

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
      </Box>

      <Stack spacing={2} sx={{ width: "100%", maxWidth: 360, flexShrink: 0 }}>
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
          </CardContent>
        </SoftCard>
      </Stack>
    </Stack>
  );
}
