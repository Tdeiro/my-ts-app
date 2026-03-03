import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  MenuItem,
  Grid,
  InputAdornment,
} from "@mui/material";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import { api } from "../api/client";
import { setLoggedInPlanOverride, setToken } from "../auth/tokens";

export default function AccountCheckoutPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const handleStartFreeTrial = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await api.patch("/account/plan", { targetPlan: "Pro" });
      const refreshedToken = response?.data?.token;
      if (typeof refreshedToken === "string" && refreshedToken.length > 0) {
        setToken(refreshedToken);
      } else {
        setLoggedInPlanOverride("Pro");
      }
      navigate("/dashboard");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        "Could not upgrade plan. Please try again.";
      setSubmitError(Array.isArray(message) ? message[0] : String(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: "#F9FAFB", minHeight: "100vh", py: 4 }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 4 } }}>
        {/* Back to Account Link */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/account")}
          sx={{
            color: "#4A5565",
            fontWeight: 600,
            fontSize: "0.875rem",
            textTransform: "none",
            mb: 3,
            "&:hover": {
              bgcolor: "transparent",
              textDecoration: "underline",
            },
          }}
        >
          Back to Account
        </Button>

        {/* Page Title */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: "#0A0A0A", mb: 1 }}
          >
            Complete Your Upgrade
          </Typography>
          <Typography sx={{ color: "#4A5565", fontSize: "1rem" }}>
            Join thousands of coaches and organizers on Onora Pro
          </Typography>
        </Box>

        {/* Top Row: Payment Information + Order Summary */}
        <Grid container spacing={3}>
          {/* Payment Information */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={3}>
              <Box
                sx={{
                  bgcolor: "white",
                  p: 3,
                  borderRadius: "14px",
                  border: "1px solid #E5E7EB",
                  boxShadow:
                    "0px 4px 6px -1px rgba(0,0,0,0.1), 0px 2px 4px -2px rgba(0,0,0,0.1)",
                }}
              >
                {/* Header with Icon */}
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 3 }}
                >
                  <CreditCardIcon sx={{ color: "#8B5CF6", fontSize: 20 }} />
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "1.25rem",
                      color: "#0A0A0A",
                    }}
                  >
                    Payment Information
                  </Typography>
                </Stack>

                <Stack spacing={2.5}>
                  {/* Card Number */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#364153",
                        mb: 0.5,
                      }}
                    >
                      Card Number
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="1234 5678 9012 3456"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Box sx={{ display: "flex", gap: 0.5 }}>
                              {/* Mastercard Icon */}
                              <Box
                                sx={{
                                  width: 32,
                                  height: 20,
                                  bgcolor: "#EB001B",
                                  borderRadius: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  position: "relative",
                                }}
                              >
                                <Box
                                  sx={{
                                    position: "absolute",
                                    width: 12,
                                    height: 12,
                                    borderRadius: "50%",
                                    bgcolor: "#EB001B",
                                    left: 6,
                                  }}
                                />
                                <Box
                                  sx={{
                                    position: "absolute",
                                    width: 12,
                                    height: 12,
                                    borderRadius: "50%",
                                    bgcolor: "#FF5F00",
                                    left: 14,
                                  }}
                                />
                              </Box>
                            </Box>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "10px",
                          height: 50,
                          fontSize: "1rem",
                        },
                      }}
                    />
                  </Box>

                  {/* Expiry Date & CVV */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "#364153",
                          mb: 0.5,
                        }}
                      >
                        Expiry Date
                      </Typography>
                      <TextField
                        fullWidth
                        placeholder="MM / YY"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "10px",
                            height: 50,
                            fontSize: "1rem",
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "#364153",
                          mb: 0.5,
                        }}
                      >
                        CVV
                      </Typography>
                      <TextField
                        fullWidth
                        placeholder="123"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "10px",
                            height: 50,
                            fontSize: "1rem",
                          },
                        }}
                      />
                    </Grid>
                  </Grid>

                  {/* Cardholder Name */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#364153",
                        mb: 0.5,
                      }}
                    >
                      Cardholder Name
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="John Doe"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "10px",
                          height: 50,
                          fontSize: "1rem",
                        },
                      }}
                    />
                  </Box>
                </Stack>
              </Box>

              {/* Billing Address */}
              <Box
                sx={{
                  bgcolor: "white",
                  p: 3,
                  borderRadius: "14px",
                  border: "1px solid #E5E7EB",
                  boxShadow:
                    "0px 4px 6px -1px rgba(0,0,0,0.1), 0px 2px 4px -2px rgba(0,0,0,0.1)",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "1.25rem",
                    color: "#0A0A0A",
                    mb: 3,
                  }}
                >
                  Billing Address
                </Typography>

                <Stack spacing={2.5}>
                  {/* Country */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#364153",
                        mb: 0.5,
                      }}
                    >
                      Country
                    </Typography>
                    <TextField
                      fullWidth
                      select
                      defaultValue=""
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "10px",
                          height: 50,
                          fontSize: "1rem",
                        },
                      }}
                    >
                      <MenuItem value="">Select country</MenuItem>
                      <MenuItem value="US">United States</MenuItem>
                      <MenuItem value="CA">Canada</MenuItem>
                      <MenuItem value="UK">United Kingdom</MenuItem>
                    </TextField>
                  </Box>

                  {/* Address Line 1 */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#364153",
                        mb: 0.5,
                      }}
                    >
                      Address Line 1
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="Street address"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "10px",
                          height: 50,
                          fontSize: "1rem",
                        },
                      }}
                    />
                  </Box>

                  {/* Address Line 2 */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#364153",
                        mb: 0.5,
                      }}
                    >
                      Address Line 2 (Optional)
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="Apartment, suite, etc."
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "10px",
                          height: 50,
                          fontSize: "1rem",
                        },
                      }}
                    />
                  </Box>

                  {/* City, State, ZIP Code */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "#364153",
                          mb: 0.5,
                        }}
                      >
                        City
                      </Typography>
                      <TextField
                        fullWidth
                        placeholder="City"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "10px",
                            height: 50,
                            fontSize: "1rem",
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "#364153",
                          mb: 0.5,
                        }}
                      >
                        State
                      </Typography>
                      <TextField
                        fullWidth
                        placeholder="State"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "10px",
                            height: 50,
                            fontSize: "1rem",
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "#364153",
                          mb: 0.5,
                        }}
                      >
                        ZIP Code
                      </Typography>
                      <TextField
                        fullWidth
                        placeholder="12345"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "10px",
                            height: 50,
                            fontSize: "1rem",
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </Box>
            </Stack>
          </Grid>

          {/* Right Column - Order Summary */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Box
              sx={{
                background:
                  "linear-gradient(112.855deg, rgb(250, 245, 255) 0%, rgb(239, 246, 255) 100%)",
                border: "2px solid #DAB2FF",
                borderRadius: "14px",
                p: 3,
                boxShadow:
                  "0px 10px 15px 0px rgba(0,0,0,0.1), 0px 4px 6px 0px rgba(0,0,0,0.1)",
                position: "sticky",
                top: 24,
              }}
            >
              {/* Header with Icon */}
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 3 }}
              >
                <MonetizationOnIcon sx={{ color: "#8B5CF6", fontSize: 20 }} />
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "1.25rem",
                    color: "#59168B",
                  }}
                >
                  Order Summary
                </Typography>
              </Stack>

              {/* Plan Details */}
              <Box sx={{ pb: 2, borderBottom: "1px solid #E9D4FF", mb: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                >
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "1.125rem",
                        color: "#59168B",
                        mb: 0.5,
                      }}
                    >
                      Pro Plan
                    </Typography>
                    <Typography sx={{ fontSize: "0.875rem", color: "#4A5565" }}>
                      Monthly subscription
                    </Typography>
                  </Box>
                  <Typography
                    sx={{ fontWeight: 700, fontSize: "1rem", color: "#59168B" }}
                  >
                    $29.00
                  </Typography>
                </Stack>
              </Box>

              {/* What's Included */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    color: "#59168B",
                    mb: 1.5,
                  }}
                >
                  What's included:
                </Typography>
                <Stack spacing={1.5}>
                  {[
                    "Create tournaments & events",
                    "Manage teams",
                    "Full platform control",
                    "Advanced analytics",
                    "Priority support",
                  ].map((feature, idx) => (
                    <Stack
                      key={idx}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                    >
                      <CheckCircleIcon
                        sx={{ color: "#8B5CF6", fontSize: 16 }}
                      />
                      <Typography
                        sx={{ fontSize: "0.875rem", color: "#364153" }}
                      >
                        {feature}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              {/* 14-day Trial Banner */}
              <Box
                sx={{
                  bgcolor: "#F0FDF4",
                  border: "1px solid #B9F8CF",
                  borderRadius: "10px",
                  p: 2,
                  mb: 3,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    color: "#016630",
                    mb: 0.5,
                  }}
                >
                  🎉 14-day free trial included
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", color: "#008236" }}>
                  Cancel anytime during trial period
                </Typography>
              </Box>

              {/* Pricing Breakdown */}
              <Stack spacing={1.5} sx={{ mb: 3 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: "0.875rem", color: "#4A5565" }}>
                    Subtotal
                  </Typography>
                  <Typography sx={{ fontSize: "0.875rem", color: "#4A5565" }}>
                    $29.00
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: "0.875rem", color: "#4A5565" }}>
                    Tax
                  </Typography>
                  <Typography sx={{ fontSize: "0.875rem", color: "#4A5565" }}>
                    $0.00
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ pt: 1 }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "1.125rem",
                      color: "#59168B",
                    }}
                  >
                    Total due today
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "1.5rem",
                      color: "#59168B",
                    }}
                  >
                    $0.00
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: "#4A5565",
                    textAlign: "right",
                  }}
                >
                  Then $29.00/month after trial ends
                </Typography>
              </Stack>

              {/* Start Free Trial Button */}
              {submitError ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {submitError}
                </Alert>
              ) : null}
              <Button
                fullWidth
                startIcon={<LockIcon />}
                onClick={handleStartFreeTrial}
                disabled={isSubmitting}
                sx={{
                  bgcolor: "#8B5CF6",
                  color: "white",
                  fontWeight: 500,
                  fontSize: "1rem",
                  height: 56,
                  borderRadius: "10px",
                  textTransform: "none",
                  mb: 2,
                  boxShadow:
                    "0px 4px 6px 0px rgba(0,0,0,0.1), 0px 2px 4px 0px rgba(0,0,0,0.1)",
                  "&:hover": {
                    bgcolor: "#7C3AED",
                  },
                }}
              >
                {isSubmitting ? "Upgrading..." : "Start Free Trial"}
              </Button>

              {/* Terms Text */}
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: "#4A5565",
                  textAlign: "center",
                  lineHeight: 1.33,
                }}
              >
                By confirming your subscription, you agree to our Terms of
                Service
              </Typography>
            </Box>
          </Grid>

        </Grid>

        {/* Footer Security Badges */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
          sx={{ mt: 4, pt: 4, borderTop: "1px solid #E5E7EB" }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <LockIcon sx={{ fontSize: 16, color: "#6B7280" }} />
            <Typography sx={{ fontSize: "0.875rem", color: "#6B7280" }}>
              Secure 256-bit SSL encryption
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <VerifiedUserIcon sx={{ fontSize: 16, color: "#6B7280" }} />
            <Typography sx={{ fontSize: "0.875rem", color: "#6B7280" }}>
              Money-back guarantee
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
