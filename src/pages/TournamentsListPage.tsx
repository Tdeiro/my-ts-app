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

function statusChipProps(status: Tournament["status"]) {
  switch (status) {
    case "Draft":
      return { label: "Draft", variant: "outlined" as const };
    case "Open":
      return { label: "Open", color: "success" as const };
    case "Live":
      return { label: "Live", color: "primary" as const };
    case "Completed":
      return { label: "Completed", variant: "outlined" as const };
    default:
      return { label: status };
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
              Tournaments
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage all tournaments in one place.
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={() => navigate("/tournaments/new")}
            sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}
          >
            Create Tournament
          </Button>
        </Stack>

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
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                All Tournaments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filtered.length} result{filtered.length === 1 ? "" : "s"}
              </Typography>
            </Box>

            <Divider />

            {filtered.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Typography variant="body1" sx={{ fontWeight: 650, mb: 0.5 }}>
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
                >
                  Create Tournament
                </Button>
              </Box>
            ) : (
              <Stack divider={<Divider />} sx={{ p: 0 }}>
                {filtered.map((t) => (
                  <Box
                    key={t.id}
                    sx={{
                      p: 2.5,
                      display: "flex",
                      gap: 2,
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Left */}
                    <Box sx={{ minWidth: 260 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                          {t.name}
                        </Typography>
                        <Chip
                          size="small"
                          {...statusChipProps(t.status)}
                          sx={{ ml: 0.5 }}
                        />
                        {!t.isPublic ? (
                          <Chip
                            size="small"
                            label="Private"
                            variant="outlined"
                          />
                        ) : null}
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        {t.locationName}
                      </Typography>
                    </Box>

                    {/* Middle tags */}
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Chip size="small" label={t.sport} />
                      <Chip size="small" label={t.format} />
                      <Chip size="small" label={t.level} />
                    </Stack>

                    {/* Right meta + actions */}
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
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
                      >
                        View
                      </Button>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
