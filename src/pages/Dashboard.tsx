import * as React from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Chip,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import { useNavigate } from "react-router";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { getToken } from "../auth/tokens";
import SelectActionCard from "../Components/Shared/SelectActionCard";
import WeeklyScheduleCard from "../Components/Shared/WeeklyScheduleCard";

type DashboardState = {
  loading: boolean;
  error: string | null;
  apiStatus: number | null;
  apiBody: any;
};

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();

  const token = getToken(); // pp_token
  const user = token ? parseJwt(token) : null;

  const [state, setState] = React.useState<DashboardState>({
    loading: false,
    error: null,
    apiStatus: null,
    apiBody: null,
  });

  const handleRedirect = () => navigate("/tournaments/new");

  React.useEffect(() => {
    // No token? Don’t call backend.
    if (!token) {
      setState((s) => ({
        ...s,
        error: "No token found. Please sign in again.",
        apiStatus: null,
        apiBody: null,
      }));
      return;
    }

    let cancelled = false;

    const run = async () => {
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const res = await fetch("/dashboard", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const text = await res.text();
        let body: any = text;
        try {
          body = JSON.parse(text);
        } catch {}

        if (cancelled) return;

        setState((s) => ({
          ...s,
          loading: false,
          apiStatus: res.status,
          apiBody: body,
          error: res.ok
            ? null
            : body?.message?.[0] || body?.error || "Request failed",
        }));

        // Helpful debug without spamming re-renders
        // eslint-disable-next-line no-console
        console.log("Dashboard API:", { status: res.status, body });
      } catch (e: any) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e?.message || "Failed to reach backend",
        }));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        minWidth: 0,
        p: { xs: 2, md: 3 },
        // match AppShell’s “premium” background vibe
        background:
          "linear-gradient(180deg, rgba(139,92,246,0.06) 0%, rgba(255,255,255,0) 35%)",
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          maxWidth: 1100,
          mx: "auto",
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
          mb: 2.5,
          flexWrap: "wrap",
        }}
      >
        <Stack spacing={0.75}>
          <Typography variant="h2" sx={{ fontSize: 22, fontWeight: 800 }}>
            Dashboard
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
          >
            <Typography variant="body2" color="text.secondary">
              {user?.fullName ? `Welcome, ${user.fullName}` : "Welcome back"}
            </Typography>

            {user?.role ? (
              <Chip
                size="small"
                label={String(user.role)}
                sx={{
                  bgcolor: "rgba(139, 92, 246, 0.10)",
                  color: "primary.main",
                  fontWeight: 700,
                }}
              />
            ) : null}

            {state.apiStatus ? (
              <Chip
                size="small"
                label={`API: ${state.apiStatus}`}
                sx={{
                  bgcolor:
                    state.apiStatus >= 200 && state.apiStatus < 300
                      ? "rgba(34, 197, 94, 0.10)"
                      : "rgba(239, 68, 68, 0.10)",
                  color:
                    state.apiStatus >= 200 && state.apiStatus < 300
                      ? "success.main"
                      : "error.main",
                  fontWeight: 700,
                }}
              />
            ) : null}
          </Stack>
        </Stack>

        <Button
          variant="contained"
          size="large"
          startIcon={<AddRoundedIcon />}
          onClick={handleRedirect}
          sx={{
            minWidth: 200,
            borderRadius: 2,
            // make primary CTA feel “Onora”
            background:
              "linear-gradient(90deg, #8B5CF6 0%, #A855F7 55%, #7C3AED 100%)",
            "&:hover": {
              background:
                "linear-gradient(90deg, #7C3AED 0%, #9333EA 55%, #6D28D9 100%)",
            },
          }}
        >
          Create Event
        </Button>
      </Box>

      {/* Auth/API feedback */}
      <Box sx={{ maxWidth: 1100, mx: "auto", mb: 2 }}>
        {!token ? (
          <Alert severity="warning">
            You’re not authenticated. Go to <b>Sign in</b> and try again.
          </Alert>
        ) : state.error ? (
          <Alert severity="error">{state.error}</Alert>
        ) : state.loading ? (
          <Alert severity="info">Loading dashboard…</Alert>
        ) : null}
      </Box>

      {/* Debug card (optional but handy while wiring backend) */}
      {token ? (
        <Box sx={{ maxWidth: 1100, mx: "auto", mb: 3 }}>
          <Card
            sx={{
              borderRadius: 2,
              borderColor: "rgba(139, 92, 246, 0.14)",
              bgcolor: "rgba(250, 247, 255, 0.70)",
            }}
          >
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
                Session
                <Box
                  component="span"
                  sx={{
                    ml: 1,
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "secondary.main", // ties to logo dot
                    opacity: 0.9,
                    verticalAlign: "middle",
                  }}
                />
              </Typography>

              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  <b>Email:</b> {user?.email ?? "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <b>User ID:</b> {user?.id ?? "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <b>Token stored:</b> {token ? "Yes (pp_token)" : "No"}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      ) : null}

      {/* Content cards */}
      <Box
        sx={{
          maxWidth: 1100,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <SelectActionCard />
        <WeeklyScheduleCard />
      </Box>
    </Box>
  );
}
