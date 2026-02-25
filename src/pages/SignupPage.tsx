import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
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
import type { AccountType, FormErrors, SignupForm } from "../Utils/FormTypes";
import { validateInput } from "../Utils/FormValidationUtil";
import Logo from "../assets/onora.png";

const REGISTER_ROLE_IDS_BY_ACCOUNT_TYPE: Record<AccountType, number[]> = {
  participant: [1],
  coach: [2],
  organization: [2],
};

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteTournamentId = searchParams.get("inviteTournamentId");

  const [form, setForm] = React.useState<SignupForm>({
    name: "",
    email: "",
    phone: "",
    accountType: "participant",
    organizationName: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const showOrgName = form.accountType === "organization";

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

  const setAccountType = (value: AccountType) => {
    setForm((prev) => ({
      ...prev,
      accountType: value,

      organizationName: value === "organization" ? prev.organizationName : "",
    }));

    if (value !== "organization") {
      setErrors((prev) => {
        if (!prev.organizationName) return prev;
        const next = { ...prev };
        delete next.organizationName;
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setApiError(null);
    setApiSuccess(null);

    const nextErrors = validateInput(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    // const normaliseName = `${form.name.trim()} ${form.lastName.trim()}`;

    try {
      const roleIds =
        REGISTER_ROLE_IDS_BY_ACCOUNT_TYPE[form.accountType] ??
        REGISTER_ROLE_IDS_BY_ACCOUNT_TYPE.participant;

      const payload = {
        email: form.email.trim().toLowerCase(),
        fullName: form.name.trim(), // backend expects fullName
        phone: form.phone.trim(),
        roleIds,
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
                value={form.name}
                onChange={setField("name")}
                error={!!errors.name}
                helperText={errors.name || " "}
                autoComplete="name"
              />
              {/* <TextField
                required
                label="Last Name"
                value={form.lastName}
                onChange={setField("lastName")}
                error={!!errors.lastName}
                helperText={errors.lastName || " "}
                autoComplete="lastName"
              /> */}
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

              {/* Account Type */}
              <FormControl required error={!!errors.accountType}>
                <FormLabel id="account-type-label">I’m signing up as</FormLabel>
                <RadioGroup
                  row
                  aria-labelledby="account-type-label"
                  name="account-type"
                  value={form.accountType}
                  onChange={(e) =>
                    setAccountType(e.target.value as AccountType)
                  }
                >
                  <FormControlLabel
                    value="participant"
                    control={<Radio />}
                    label="Player / Participant"
                  />
                  <FormControlLabel
                    value="coach"
                    control={<Radio />}
                    label="Coach"
                  />
                  <FormControlLabel
                    value="organization"
                    control={<Radio />}
                    label="School / Club"
                  />
                </RadioGroup>
                <FormHelperText>{errors.accountType || " "}</FormHelperText>
              </FormControl>

              {/* Conditional: School / Club Name */}
              {showOrgName ? (
                <TextField
                  required
                  label="School / Club name"
                  value={form.organizationName}
                  onChange={setField("organizationName")}
                  error={!!errors.organizationName}
                  helperText={errors.organizationName || " "}
                  autoComplete="organization"
                />
              ) : null}

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
