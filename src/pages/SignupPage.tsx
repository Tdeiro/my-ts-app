import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { setToken } from "../features/auth/services/tokens";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import type { FormErrors, SignupForm } from "../Utils/FormTypes";
import { validateInput } from "../Utils/FormValidationUtil";
import AuthPage from "../features/auth/components/AuthPage";
import AuthFooterLink from "../features/auth/components/AuthFooterLink";
import AuthAlertStack from "../features/auth/components/AuthAlertStack";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

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
        ? `${API_URL}/login/signup?inviteTournamentId=${encodeURIComponent(inviteTournamentId)}`
        : `${API_URL}/login/signup`;

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
    <AuthPage
      title="Create an account"
      subtitle="Get started with Onora"
      footer={
        <AuthFooterLink
          prompt="Already have an account?"
          actionLabel="Sign in"
          onAction={() =>
            navigate(
              inviteTournamentId
                ? `/login?inviteTournamentId=${encodeURIComponent(inviteTournamentId)}`
                : "/login"
            )
          }
        />
      }
    >
      <AuthAlertStack error={apiError} success={apiSuccess} />

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
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
    </AuthPage>
  );
}
