import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { setToken } from "../auth/tokens";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import type { FormErrors, SignupForm } from "../Utils/FormTypes";
import { validateInput } from "../Utils/FormValidationUtil";
import Logo from "../assets/onora.png";

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteTournamentId = searchParams.get("inviteTournamentId");

  const [form, setForm] = React.useState<SignupForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const setField =
    (field: keyof SignupForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      setForm((prev) => ({ ...prev, [field]: value }));

      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setApiError(null);
    setApiSuccess(null);

    const nextErrors = validateInput(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        phone: form.phone.trim(),
        password: form.password,
        billingInfo: false,
      };

      const signupUrl = inviteTournamentId
        ? `/login/signup?inviteTournamentId=${encodeURIComponent(inviteTournamentId)}`
        : "/login/signup";

      const res = await fetch(signupUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      console.log("Response status:", res.status);
      console.log("Response data:", data);
      if (!res.ok) {
        const msg =
          data?.message?.[0] ||
          data?.error ||
          data?.detail ||
          "Signup failed. Please try again.";
        setApiError(msg);
        return;
      }

      // backend returns: { token: "..." }
      if (!data?.token) {
        setApiError("Signup succeeded but no token was returned.");
        return;
      }

      setToken(data.token);
      setApiSuccess("Account created! Token saved.");

      const target = inviteTournamentId
        ? `/tournaments/invite?inviteTournamentId=${encodeURIComponent(inviteTournamentId)}`
        : "/dashboard";
      navigate(target);
    } catch (err) {
      console.error(err);
      setApiError("Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
        py: { xs: 4, sm: 6 },
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
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
              <Typography variant="h5" fontWeight={600}>
                Create an account
              </Typography>
              <Typography color="text.secondary">
                Get started with Onora
              </Typography>
            </Box>

            {/* API Alerts */}
            {apiError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {apiError}
              </Alert>
            ) : null}
            {apiSuccess ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                {apiSuccess}
              </Alert>
            ) : null}

            <Box
              component="form"
              noValidate
              onSubmit={handleSubmit}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                required
                label="First Name"
                value={form.firstName}
                onChange={setField("firstName")}
                error={!!errors.firstName}
                helperText={errors.firstName || " "}
                autoComplete="given-name"
              />
              <TextField
                required
                label="Last Name"
                value={form.lastName}
                onChange={setField("lastName")}
                error={!!errors.lastName}
                helperText={errors.lastName || " "}
                autoComplete="family-name"
              />
              <TextField
                required
                label="Email address"
                type="email"
                value={form.email}
                onChange={setField("email")}
                error={!!errors.email}
                helperText={errors.email || " "}
                autoComplete="email"
              />

              <TextField
                required
                label="Phone"
                value={form.phone}
                onChange={setField("phone")}
                error={!!errors.phone}
                helperText={errors.phone || " "}
                autoComplete="tel"
              />

              <TextField
                required
                label="Password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={setField("password")}
                error={!!errors.password}
                helperText={errors.password || " "}
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                required
                label="Confirm password"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={setField("confirmPassword")}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword || " "}
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        edge="end"
                      >
                        {showConfirmPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating account..." : "Sign up"}
              </Button>

              <Divider sx={{ my: 1 }}>or</Divider>
            </Box>

            {/* Footer */}
            <Stack spacing={1} sx={{ mt: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{""}
                <Button
                  variant="text"
                  size="small"
                  onClick={() =>
                    navigate(
                      inviteTournamentId
                        ? `/login?inviteTournamentId=${encodeURIComponent(inviteTournamentId)}`
                        : "/login"
                    )
                  }
                >
                  Sign in
                </Button>
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
