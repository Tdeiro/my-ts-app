import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import Logo from "../assets/onora.png";
import { setToken } from "../auth/tokens";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteTournamentId = searchParams.get("inviteTournamentId");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const signinUrl = inviteTournamentId
        ? `/login/signin?inviteTournamentId=${encodeURIComponent(inviteTournamentId)}`
        : "/login/signin";

      const res = await fetch(signinUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          data?.message?.[0] ||
          data?.error ||
          data?.detail ||
          "Invalid email or password.";
        setError(msg);
        return;
      }

      if (!data?.token) {
        setError("Login failed: backend did not return a token.");
        return;
      }

      setToken(data.token);
      const target = inviteTournamentId
        ? `/tournaments/invite?inviteTournamentId=${encodeURIComponent(inviteTournamentId)}`
        : "/dashboard";
      navigate(target);
    } catch {
      setError("Unable to reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "background.default",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Container maxWidth="sm">
        <Card>
          <CardContent sx={{ p: 4 }}>
            {/* Logo / App name */}
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Box
                component="img"
                src={Logo}
                alt="Onora logo"
                sx={{
                  height: 60,
                  display: "block",
                  mx: "auto",
                  mb: 1,
                }}
              />
              <Typography color="text.secondary">Sign in with Onora</Typography>
            </Box>

            {/* Form */}
            {error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : null}

            <Box
              component="form"
              noValidate
              onSubmit={handleSubmit}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                autoComplete="email"
              />

              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                autoComplete="current-password"
              />

              <Box sx={{ textAlign: "right" }}>
                <Button variant="text" size="small">
                  Forgot password?
                </Button>
              </Box>

              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                type="submit"
                disabled={loading || !email.trim() || !password}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              <Divider sx={{ my: 2 }}></Divider>
            </Box>

            {/* Footer */}
            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Don’t have an account?{" "}
                <Button
                  variant="text"
                  size="small"
                  onClick={() =>
                    navigate(
                      inviteTournamentId
                        ? `/signup?inviteTournamentId=${encodeURIComponent(inviteTournamentId)}`
                        : "/signup"
                    )
                  }
                >
                  Sign up
                </Button>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
