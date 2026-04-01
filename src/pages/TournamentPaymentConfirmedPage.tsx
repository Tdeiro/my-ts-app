import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { useLocation, useNavigate } from "react-router-dom";

type ConfirmationState = {
  eventId?: number;
  tournamentName?: string;
  currency?: string;
  totalAmount?: number;
  selectedCategoryNames?: string[];
  alreadyRegistered?: boolean;
};

function formatMoney(value: number | undefined, currency: string | undefined): string {
  const amount = Number(value ?? 0);
  const code = (currency || "AUD").toUpperCase();
  if (!Number.isFinite(amount)) return `0 ${code}`;
  return `${amount} ${code}`;
}

export default function TournamentPaymentConfirmedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ConfirmationState | null) ?? null;

  if (!state?.eventId) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Confirmation details not found.
        </Alert>
        <Button variant="contained" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: "#F9FAFB", minHeight: "100vh", py: 6 }}>
      <Container maxWidth="md">
        <Card
          sx={{
            borderRadius: 3,
            border: "1px solid #D1FAE5",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(16, 185, 129, 0.12)",
          }}
        >
          <Box sx={{ p: { xs: 3, md: 4 }, background: "linear-gradient(135deg, #ECFDF3 0%, #F0FDF4 100%)" }}>
            <Stack spacing={2.5} alignItems="center" textAlign="center">
              <CheckCircleRoundedIcon sx={{ fontSize: 72, color: "#059669" }} />
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#065F46" }}>
                Registration Confirmed
              </Typography>
              <Typography sx={{ color: "#065F46", maxWidth: 520 }}>
                {state.alreadyRegistered
                  ? `You are already registered for ${state.tournamentName || "this tournament"}.`
                  : `You are now officially registered for ${state.tournamentName || "this tournament"}.`}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <EmojiEventsRoundedIcon sx={{ color: "#7C3AED" }} />
                <Typography sx={{ fontWeight: 800, color: "#111827" }}>
                  Event #{state.eventId}
                </Typography>
              </Stack>

              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#6B7280", mb: 1 }}>
                  Categories
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {(state.selectedCategoryNames || []).length ? (
                    state.selectedCategoryNames?.map((name, index) => (
                      <Chip key={`${name}-${index}`} label={name} size="small" />
                    ))
                  ) : (
                    <Typography sx={{ fontSize: 14, color: "#6B7280" }}>
                      No categories listed.
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Box sx={{ p: 2, borderRadius: 2, border: "1px solid #E5E7EB", bgcolor: "#FAFAFA" }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>
                  Total
                </Typography>
                <Typography sx={{ fontSize: 30, fontWeight: 900, color: "#111827" }}>
                  {formatMoney(state.totalAmount, state.currency)}
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button fullWidth variant="contained" onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() =>
                    navigate(
                      `/tournaments/invite?inviteTournamentId=${encodeURIComponent(state.eventId || "")}&mode=view`,
                    )
                  }
                >
                  View Event Info
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}
