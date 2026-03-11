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
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";

type EventCategoryDto = {
  id: number | string;
  name?: string;
  level?: string;
  gender?: string;
  price?: number | string;
};

type EventDetailsDto = {
  id: number | string;
  name?: string;
  locationName?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  registrationDeadline?: string;
  entryFee?: number | string;
  currency?: string;
  tournamentStage?: string;
  status?: string;
  categories?: EventCategoryDto[];
};

function toDateLabel(value?: string): string {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function toFeeLabel(amount?: number | string, currency?: string): string {
  const parsed = Number(amount ?? 0);
  const safeAmount = Number.isFinite(parsed) ? parsed : 0;
  return `${safeAmount} ${String(currency ?? "AUD").toUpperCase()}`;
}

export default function TournamentViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [eventData, setEventData] = React.useState<EventDetailsDto | null>(null);

  React.useEffect(() => {
    const eventId = String(id ?? "").trim();
    if (!eventId) {
      setError("Tournament not found.");
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<EventDetailsDto>(`/events/${encodeURIComponent(eventId)}`);
        if (!active) return;
        setEventData(res.data ?? null);
      } catch (err: any) {
        if (!active) return;
        const message =
          err?.response?.data?.message?.[0] ||
          err?.response?.data?.error ||
          "Could not load tournament details.";
        setError(message);
        setEventData(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ p: 4, display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="main" sx={{ p: { xs: 2, md: 3 }, display: "flex", justifyContent: "center" }}>
      <Box sx={{ width: "100%", maxWidth: 900 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate("/tournaments")}
            sx={{ borderRadius: 2 }}
          >
            Back to Tournaments
          </Button>
          {id ? (
            <Button
              variant="contained"
              onClick={() =>
                navigate(`/tournaments/invite?inviteTournamentId=${encodeURIComponent(String(id))}`)
              }
              sx={{ borderRadius: 2 }}
            >
              Complete Registration
            </Button>
          ) : null}
        </Stack>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {eventData ? (
          <Card sx={{ borderRadius: 2.5 }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>
                      {String(eventData.name ?? "Tournament")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tournament details and categories
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={String(eventData.status ?? "OPEN")} />
                    <Chip color="primary" label={String(eventData.tournamentStage ?? "INVITE")} />
                  </Stack>
                </Stack>

                <Divider />

                <Stack spacing={1.25}>
                  <InfoRow
                    icon={<EventRoundedIcon fontSize="small" />}
                    label="Date"
                    value={`${toDateLabel(eventData.startDate)}${
                      eventData.endDate && eventData.endDate !== eventData.startDate
                        ? ` to ${toDateLabel(eventData.endDate)}`
                        : ""
                    }`}
                  />
                  <InfoRow
                    icon={<EventRoundedIcon fontSize="small" />}
                    label="Time"
                    value={`${eventData.startTime ?? "TBD"}${eventData.endTime ? ` - ${eventData.endTime}` : ""}`}
                  />
                  <InfoRow
                    icon={<PlaceRoundedIcon fontSize="small" />}
                    label="Location"
                    value={`${eventData.locationName ?? "Location TBD"}${
                      eventData.address ? ` (${eventData.address})` : ""
                    }`}
                  />
                  <InfoRow
                    icon={<AttachMoneyRoundedIcon fontSize="small" />}
                    label="Entry Fee"
                    value={toFeeLabel(eventData.entryFee, eventData.currency)}
                  />
                  <InfoRow
                    icon={<EventRoundedIcon fontSize="small" />}
                    label="Registration Deadline"
                    value={toDateLabel(eventData.registrationDeadline)}
                  />
                </Stack>

                <Divider />

                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <CategoryRoundedIcon color="action" fontSize="small" />
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Categories
                    </Typography>
                  </Stack>
                  {Array.isArray(eventData.categories) && eventData.categories.length > 0 ? (
                    <Stack spacing={1}>
                      {eventData.categories.map((category) => (
                        <Card key={String(category.id)} variant="outlined">
                          <CardContent sx={{ py: 1.25 }}>
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              justifyContent="space-between"
                              spacing={1}
                            >
                              <Box>
                                <Typography sx={{ fontWeight: 700 }}>
                                  {String(category.name ?? `Category ${category.id}`)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {String(category.level ?? "Open")} · {String(category.gender ?? "Mixed")}
                                </Typography>
                              </Box>
                              <Chip label={toFeeLabel(category.price, eventData.currency)} />
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No categories published yet.
                    </Typography>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ) : null}
      </Box>
    </Box>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ color: "text.secondary", display: "grid", placeItems: "center" }}>{icon}</Box>
      <Typography variant="body2" sx={{ minWidth: 190, color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600 }}>{value}</Typography>
    </Stack>
  );
}
