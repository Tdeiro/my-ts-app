import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Button, Divider, TextField } from "@mui/material";
import { setToken } from "../features/auth/services/tokens";
import AuthPage from "../features/auth/components/AuthPage";
import AuthFooterLink from "../features/auth/components/AuthFooterLink";
import AuthAlertStack from "../features/auth/components/AuthAlertStack";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

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
        ? `${API_URL}/login/signin?inviteTournamentId=${encodeURIComponent(inviteTournamentId)}`
        : `${API_URL}/login/signin`;

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
    <AuthPage
      subtitle="Sign in with Onora"
      footer={
        <AuthFooterLink
          prompt="Don’t have an account?"
          actionLabel="Sign up"
          onAction={() =>
            navigate(
              inviteTournamentId
                ? `/signup?inviteTournamentId=${encodeURIComponent(inviteTournamentId)}`
                : "/signup"
            )
          }
        />
      }
    >
      <AuthAlertStack error={error} />

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
    </AuthPage>
  );
}
