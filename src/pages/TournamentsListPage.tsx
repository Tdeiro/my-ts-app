import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

type Tournament = {
  id: string;
  name: string;
  sport: "Tennis" | "Beach Tennis" | "Padel" | "Pickleball" | "Other";
  format: "Singles" | "Doubles" | "Mixed";
  level: "Beginner" | "Intermediate" | "Advanced" | "All levels";
  locationName: string;
  startDate: string; // yyyy-mm-dd
  entryFee: number;
  currency: "AUD" | "USD" | "EUR" | "BRL";
  status: "Draft" | "Open" | "Live" | "Completed";
  isPublic: boolean;
};

const DUMMY_TOURNAMENTS: Tournament[] = [
  {
    id: "t1",
    name: "Spring Open",
    sport: "Tennis",
    format: "Doubles",
    level: "All levels",
    locationName: "Sydney Tennis Centre",
    startDate: "2026-04-22",
    entryFee: 25,
    currency: "AUD",
    status: "Open",
    isPublic: true,
  },
  {
    id: "t2",
    name: "Beach Bash",
    sport: "Beach Tennis",
    format: "Mixed",
    level: "Intermediate",
    locationName: "Manly Beach Courts",
    startDate: "2026-04-28",
    entryFee: 30,
    currency: "AUD",
    status: "Draft",
    isPublic: false,
  },
  {
    id: "t3",
    name: "City Nights Singles",
    sport: "Tennis",
    format: "Singles",
    level: "Advanced",
    locationName: "Pyrmont Courts",
    startDate: "2026-05-03",
    entryFee: 15,
    currency: "AUD",
    status: "Live",
    isPublic: true,
  },
  {
    id: "t4",
    name: "Winter Padel Cup",
    sport: "Padel",
    format: "Doubles",
    level: "Beginner",
    locationName: "Alexandria Padel Club",
    startDate: "2026-06-10",
    entryFee: 20,
    currency: "AUD",
    status: "Completed",
    isPublic: true,
  },
];

function statusChipSx(status: Tournament["status"]) {
  // Clean + consistent: mostly neutral + purple emphasis
  switch (status) {
    case "Draft":
      return {
        label: "Draft",
        sx: {
          borderColor: "rgba(15,23,42,0.14)",
          color: "text.secondary",
          bgcolor: "transparent",
        },
        variant: "outlined" as const,
      };
    case "Open":
      return {
        label: "Open",
        sx: {
          bgcolor: "rgba(139,92,246,0.10)",
          color: "primary.main",
          borderColor: "rgba(139,92,246,0.22)",
        },
        variant: "outlined" as const,
      };
    case "Live":
      return {
        label: "Live",
        sx: {
          bgcolor: "rgba(139,92,246,0.14)",
          color: "primary.main",
          borderColor: "rgba(139,92,246,0.28)",
        },
        variant: "outlined" as const,
      };
    case "Completed":
      return {
        label: "Completed",
        sx: {
          bgcolor: "rgba(15,23,42,0.05)",
          color: "text.secondary",
          borderColor: "rgba(15,23,42,0.10)",
        },
        variant: "outlined" as const,
      };
    default:
      return { label: status, variant: "outlined" as const, sx: {} };
  }
}

export default function TournamentsListPage() {
  const navigate = useNavigate();

  const [query, setQuery] = React.useState("");
  const [sportFilter, setSportFilter] = React.useState<
    "All" | Tournament["sport"]
  >("All");
  const [statusFilter, setStatusFilter] = React.useState<
    "All" | Tournament["status"]
  >("All");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return DUMMY_TOURNAMENTS.filter((t) => {
      const matchesQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.locationName.toLowerCase().includes(q);

      const matchesSport = sportFilter === "All" || t.sport === sportFilter;
      const matchesStatus = statusFilter === "All" || t.status === statusFilter;

      return matchesQuery && matchesSport && matchesStatus;
    }).sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  }, [query, sportFilter, statusFilter]);

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
        {/* Header (soft gradient wash) */}
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
                Tournaments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View and manage all tournaments in one place.
              </Typography>
            </Box>

            <Button
              variant="contained"
              onClick={() => navigate("/tournaments/new")}
              sx={{
                alignSelf: { xs: "flex-start", sm: "auto" },
                borderRadius: 999,
                px: 2,
              }}
            >
              Create Tournament
            </Button>
          </Stack>
        </Paper>

        {/* Filters */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <TextField
                label="Search by name or venue"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root:focus-within": {
                    boxShadow: "0 0 0 3px rgba(255, 107, 92, 0.12)", // subtle orange
                  },
                }}
              />

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Sport</InputLabel>
                <Select
                  label="Sport"
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value as any)}
                >
                  <MenuItem value="All">All</MenuItem>
                  <MenuItem value="Tennis">Tennis</MenuItem>
                  <MenuItem value="Beach Tennis">Beach Tennis</MenuItem>
                  <MenuItem value="Padel">Padel</MenuItem>
                  <MenuItem value="Pickleball">Pickleball</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <MenuItem value="All">All</MenuItem>
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Open">Open</MenuItem>
                  <MenuItem value="Live">Live</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 2.5, pb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 900 }}>
                All Tournaments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filtered.length} result{filtered.length === 1 ? "" : "s"}
              </Typography>
            </Box>

            <Divider />

            {filtered.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Typography variant="body1" sx={{ fontWeight: 900, mb: 0.5 }}>
                  No tournaments found
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Try changing your filters or create a new tournament.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate("/tournaments/new")}
                  sx={{ borderRadius: 999 }}
                >
                  Create Tournament
                </Button>
              </Box>
            ) : (
              <Stack sx={{ p: 2.5 }} spacing={1.25}>
                {filtered.map((t) => {
                  const status = statusChipSx(t.status);

                  return (
                    <Box
                      key={t.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "rgba(15, 23, 42, 0.08)",
                        bgcolor: "background.paper",
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        transition:
                          "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          borderColor: "rgba(139,92,246,0.22)",
                          boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
                        },
                      }}
                    >
                      {/* Left */}
                      <Box sx={{ minWidth: 280, minHeight: 44 }}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                        >
                          <Typography variant="body1" sx={{ fontWeight: 900 }}>
                            {t.name}
                          </Typography>

                          <Chip
                            size="small"
                            label={status.label}
                            variant={status.variant}
                            sx={status.sx}
                          />

                          {!t.isPublic ? (
                            <Chip
                              size="small"
                              label="Private"
                              variant="outlined"
                              sx={{
                                borderColor: "rgba(255, 107, 92, 0.30)", // subtle orange
                                color: "rgba(255, 107, 92, 0.95)",
                              }}
                            />
                          ) : null}
                        </Stack>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.25 }}
                        >
                          {t.locationName}
                        </Typography>
                      </Box>

                      {/* Middle tags */}
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ flexWrap: "wrap" }}
                      >
                        {[t.sport, t.format, t.level].map((tag) => (
                          <Chip
                            key={tag}
                            size="small"
                            label={tag}
                            variant="outlined"
                            sx={{
                              borderColor: "rgba(139,92,246,0.18)",
                              bgcolor: "rgba(139,92,246,0.05)",
                            }}
                          />
                        ))}
                      </Stack>

                      {/* Right meta + actions */}
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.25}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {t.startDate} • {t.entryFee} {t.currency}
                        </Typography>

                        <Button
                          variant="outlined"
                          onClick={() =>
                            alert(`Open details for ${t.id} (MVP stub)`)
                          }
                          sx={{
                            borderRadius: 999,
                            px: 1.75,
                            borderColor: "rgba(139,92,246,0.35)",
                            color: "primary.main",
                            "&:hover": {
                              borderColor: "primary.main",
                              backgroundColor: "rgba(139,92,246,0.08)",
                              boxShadow: "0 0 0 3px rgba(255, 107, 92, 0.12)", // tiny orange hint
                            },
                          }}
                        >
                          View
                        </Button>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
