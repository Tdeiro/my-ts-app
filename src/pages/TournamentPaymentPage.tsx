import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import MockDataFlag from "../Components/Shared/MockDataFlag";
import { UI_FEATURE_FLAGS } from "../config/featureFlags";
import { mockPaymentMeta } from "../mocks/ui";

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
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Tournament Checkout
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Confirm your categories and complete payment.
                </Typography>
              </Box>
              {showMocks ? <MockDataFlag label="Checkout is mocked" /> : null}
            </Stack>
            {showMocks ? (
              <Alert severity="info" sx={{ py: 0.75 }}>
                {mockPaymentMeta.note}
              </Alert>
            ) : null}

            <Box>
              <Typography variant="body2" color="text.secondary">
                Tournament
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {state.tournamentName || "Tournament"} (#{state.eventId})
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                Selected categories
              </Typography>
              {state.selectedCategoryNames?.length ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {state.selectedCategoryNames.map((name, index) => (
                    <Chip key={`${name}-${index}`} label={name} size="small" />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No categories received.
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                p: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Total amount
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {formatMoney(state.totalAmount, state.currency)}
              </Typography>
            </Box>

            {showMocks ? (
              <>
                <Divider />
                <Stack spacing={1}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Supported methods
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {mockPaymentMeta.supportedMethods.map((method) => (
                      <Chip key={method} size="small" variant="outlined" label={method} />
                    ))}
                  </Stack>
                </Stack>

                <Stack spacing={1}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Security
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {mockPaymentMeta.trustBadges.map((item) => (
                      <Chip key={item} size="small" color="success" variant="outlined" label={item} />
                    ))}
                  </Stack>
                </Stack>
              </>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button variant="contained" disabled>
                Pay Now (Coming Soon)
              </Button>
              <Button variant="outlined" onClick={() => navigate("/dashboard")}>
                Finish
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
