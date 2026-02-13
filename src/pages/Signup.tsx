// src/pages/Signup.tsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
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
} from "@mui/material";

type AccountType = "participant" | "coach" | "organization";

type SignupForm = {
  fullName: string;
  email: string;
  phone: string;
  accountType: AccountType;
  organizationName: string; // only required if accountType === "organization"
  password: string;
  confirmPassword: string;
};

type FormErrors = Partial<Record<keyof SignupForm, string>>;

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = React.useState<SignupForm>({
    fullName: "",
    email: "",
    phone: "",
    accountType: "participant",
    organizationName: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const showOrgName = form.accountType === "organization";

  const setField =
    (field: keyof SignupForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      setForm((prev) => ({ ...prev, [field]: value }));

      // Clear error as user fixes the field
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
      // Reset org name if switching away
      organizationName: value === "organization" ? prev.organizationName : "",
    }));

    // Clear org error if switching away
    if (value !== "organization") {
      setErrors((prev) => {
        if (!prev.organizationName) return prev;
        const next = { ...prev };
        delete next.organizationName;
        return next;
      });
    }
  };

  const validate = (data: SignupForm): FormErrors => {
    const next: FormErrors = {};

    if (!data.fullName.trim()) next.fullName = "Full name is required.";

    if (!data.email.trim()) next.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(data.email))
      next.email = "Please enter a valid email.";

    if (!data.phone.trim()) next.phone = "Phone is required.";
    // (Optional) add basic phone rule for MVP:
    // else if (data.phone.replace(/\D/g, "").length < 8) next.phone = "Phone number looks too short.";

    if (data.accountType === "organization" && !data.organizationName.trim()) {
      next.organizationName = "School / Club name is required.";
    }

    if (!data.password) next.password = "Password is required.";
    else if (data.password.length < 8)
      next.password = "Password must be at least 8 characters.";

    if (!data.confirmPassword)
      next.confirmPassword = "Please confirm your password.";
    else if (data.confirmPassword !== data.password)
      next.confirmPassword = "Passwords do not match.";

    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors = validate(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      // Build payload for API
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        accountType: form.accountType,
        organizationName:
          form.accountType === "organization"
            ? form.organizationName.trim()
            : null,
        password: form.password,
      };

      console.log("Signup payload:", payload);

      // TODO: replace with your API endpoint
      // const res = await fetch("/api/signup", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });
      // if (!res.ok) throw new Error("Signup failed");

      // MVP: navigate after "success"
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      // Example: show a generic error
      // setErrors((prev) => ({ ...prev, email: "Signup failed. Please try again." }));
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
              <Typography variant="h1">MatchFlow</Typography>
              <Typography color="text.secondary">
                Create an account to continue.
              </Typography>
            </Box>

            <Box
              component="form"
              noValidate
              onSubmit={handleSubmit}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                required
                label="Full name"
                value={form.fullName}
                onChange={setField("fullName")}
                error={!!errors.fullName}
                helperText={errors.fullName || " "}
                autoComplete="name"
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
                type="password"
                value={form.password}
                onChange={setField("password")}
                error={!!errors.password}
                helperText={errors.password || " "}
                autoComplete="new-password"
              />

              <TextField
                required
                label="Confirm password"
                type="password"
                value={form.confirmPassword}
                onChange={setField("confirmPassword")}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword || " "}
                autoComplete="new-password"
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
                Already have an account?{" "}
                <Button
                  variant="text"
                  size="small"
                  onClick={() => navigate("/login")}
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
