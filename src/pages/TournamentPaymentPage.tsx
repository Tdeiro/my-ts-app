import {
  Alert,
  Box,
  Button,
  TextField,
  Chip,
  Container,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
import { useLocation, useNavigate } from "react-router-dom";
import MockDataFlag from "../Components/Shared/MockDataFlag";
import { UI_FEATURE_FLAGS } from "../config/featureFlags";

type PaymentState = {
  eventId?: number;
  tournamentName?: string;
  currency?: string;
  totalAmount?: number;
  selectedCategoryNames?: string[];
};

function formatMoney(value: number | undefined, currency: string | undefined): string {
  const amount = Number(value ?? 0);
  const code = (currency || "AUD").toUpperCase();
  if (!Number.isFinite(amount)) return `0 ${code}`;
  return `${amount} ${code}`;
}

export default function TournamentPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as PaymentState | null) ?? null;
  const showMocks = UI_FEATURE_FLAGS.enableMockData;

  if (!state?.eventId) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Payment details not found. Please confirm your registration first.
        </Alert>
        <Button variant="contained" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: "#F9FAFB", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{
            color: "#4A5565",
            fontWeight: 600,
            fontSize: "0.875rem",
            textTransform: "none",
            mb: 3,
            "&:hover": { bgcolor: "transparent", textDecoration: "underline" },
          }}
        >
          Back to Registration
        </Button>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#0A0A0A", mb: 1 }}>
            Complete Tournament Registration
          </Typography>
          <Typography sx={{ color: "#4A5565", fontSize: "1rem" }}>
            Confirm payment details for {state.tournamentName || "Tournament"}.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={3}>
              <Box
                sx={{
                  bgcolor: "white",
                  p: 3,
                  borderRadius: "12px",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0px 4px 6px -1px rgba(0,0,0,0.08), 0px 2px 4px -2px rgba(0,0,0,0.08)",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                  <CreditCardIcon sx={{ color: "#8B5CF6", fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: "1.25rem", color: "#0A0A0A" }}>
                    Payment Information
                  </Typography>
                </Stack>

                <Stack spacing={2.5}>
                  <Box>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#364153", mb: 0.5 }}>
                      Card Number
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="1234 5678 9012 3456"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Chip label="Card" size="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", height: 50, fontSize: "1rem" } }}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#364153", mb: 0.5 }}>
                        Expiry Date
                      </Typography>
                      <TextField fullWidth placeholder="MM / YY" sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", height: 50 } }} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#364153", mb: 0.5 }}>
                        CVV
                      </Typography>
                      <TextField fullWidth placeholder="123" sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", height: 50 } }} />
                    </Grid>
                  </Grid>

                  <Box>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#364153", mb: 0.5 }}>
                      Cardholder Name
                    </Typography>
                    <TextField fullWidth placeholder="John Doe" sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", height: 50 } }} />
                  </Box>
                </Stack>
              </Box>

              <Box
                sx={{
                  bgcolor: "white",
                  p: 3,
                  borderRadius: "12px",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0px 4px 6px -1px rgba(0,0,0,0.08), 0px 2px 4px -2px rgba(0,0,0,0.08)",
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: "1.25rem", color: "#0A0A0A", mb: 3 }}>
                  Billing Address
                </Typography>

                <Stack spacing={2.5}>
                  <Box>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#364153", mb: 0.5 }}>
                      Country
                    </Typography>
                    <TextField select fullWidth defaultValue="" sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", height: 50 } }}>
                      <MenuItem value="">Select country</MenuItem>
                      <MenuItem value="AU">Australia</MenuItem>
                      <MenuItem value="US">United States</MenuItem>
                      <MenuItem value="BR">Brazil</MenuItem>
                    </TextField>
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#364153", mb: 0.5 }}>
                      Address Line 1
                    </Typography>
                    <TextField fullWidth placeholder="Street address" sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", height: 50 } }} />
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Box
              sx={{
                bgcolor: "#FAF5FF",
                p: 3,
                borderRadius: "12px",
                border: "1px solid #D8B4FE",
                boxShadow: "0px 10px 15px -3px rgba(139,92,246,0.15), 0px 4px 6px -4px rgba(139,92,246,0.15)",
                position: { lg: "sticky" },
                top: { lg: 24 },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EmojiEventsIcon sx={{ color: "#7C3AED", fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: "1.2rem", color: "#5B21B6" }}>
                    Registration Summary
                  </Typography>
                </Stack>
                {showMocks ? <MockDataFlag label="Checkout mocked" /> : null}
              </Stack>

              <Typography sx={{ fontWeight: 700, color: "#111827", mb: 0.5 }}>
                {state.tournamentName || "Tournament"}
              </Typography>
              <Typography sx={{ fontSize: "0.875rem", color: "#6B7280", mb: 2 }}>
                Event #{state.eventId}
              </Typography>

              <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#5B21B6", mb: 1 }}>
                Selected categories:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                {state.selectedCategoryNames?.length ? (
                  state.selectedCategoryNames.map((name, index) => (
                    <Chip key={`${name}-${index}`} label={name} size="small" />
                  ))
                ) : (
                  <Typography sx={{ fontSize: "0.875rem", color: "#6B7280" }}>
                    No categories selected.
                  </Typography>
                )}
              </Stack>

              <Box sx={{ p: 1.5, bgcolor: "#ECFDF3", border: "1px solid #BBF7D0", borderRadius: 2, mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircleIcon sx={{ color: "#16A34A", fontSize: 18 }} />
                  <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#166534" }}>
                    Secure tournament checkout
                  </Typography>
                </Stack>
              </Box>

              <Stack spacing={0.75} sx={{ mb: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: "#4B5563" }}>Subtotal</Typography>
                  <Typography sx={{ color: "#374151" }}>{formatMoney(state.totalAmount, state.currency)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: "#4B5563" }}>Tax</Typography>
                  <Typography sx={{ color: "#374151" }}>0 {(state.currency || "AUD").toUpperCase()}</Typography>
                </Stack>
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 800, color: "#5B21B6", fontSize: "1.75rem" }}>
                  {formatMoney(state.totalAmount, state.currency)}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <LockIcon sx={{ fontSize: 15, color: "#6B7280" }} />
                  <Typography sx={{ fontSize: "0.75rem", color: "#6B7280" }}>Secure</Typography>
                </Stack>
              </Stack>

              <Button fullWidth variant="contained" sx={{ mb: 1.25 }} disabled>
                Complete Payment (Coming Soon)
              </Button>
              <Button fullWidth variant="outlined" onClick={() => navigate("/dashboard")}>
                Finish
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Alert severity="info" sx={{ mt: 3 }}>
          Payment confirmation API is not connected yet. This page is ready for backend integration.
        </Alert>
      </Container>
    </Box>
  );
}
