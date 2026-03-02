import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import MockDataFlag from "../Components/Shared/MockDataFlag";
import { UI_FEATURE_FLAGS } from "../config/featureFlags";

const mockPlans = [
  {
    id: "basic",
    title: "Basic",
    price: "$0",
    period: "/month",
    blurb: "Perfect for participants and players",
    cta: "Current Plan",
    ctaVariant: "outlined" as const,
    features: [
      "Join tournaments and classes",
      "View public tournaments",
      "View public classes",
      "Basic profile management",
    ],
  },
  {
    id: "pro",
    title: "Pro",
    price: "$29",
    period: "/month",
    blurb: "Full control for coaches and organizers",
    cta: "Upgrade to Pro",
    ctaVariant: "contained" as const,
    features: [
      "Create tournaments and events",
      "Manage teams",
      "Create and manage classes",
      "Full platform control",
      "Advanced analytics",
      "Priority support",
      "Unlimited participants",
    ],
  },
];

const faqItems = [
  {
    q: "Can I switch plans anytime?",
    a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.",
  },
  {
    q: "What happens to my data if I downgrade?",
    a: "Your data is always safe. If you downgrade, you'll lose access to Pro features but all your data remains intact.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Yes! New users get a 14-day free trial of Pro features when they first upgrade.",
  },
];

export default function AccountBillingPage() {
  const hasMockData = UI_FEATURE_FLAGS.enableMockData;

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 2, md: 0 } }}>
      {/* Page Header */}
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
        >
          <Stack spacing={0.5}>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: "2rem" }}>
              Account & Billing
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontSize: "1rem" }}
            >
              Manage your plan, subscription, and invoices
            </Typography>
          </Stack>
          {hasMockData ? <MockDataFlag label="Billing data is mocked" /> : null}
        </Stack>

        {/* Alert */}
        {hasMockData ? (
          <Alert
            severity="info"
            sx={{
              borderRadius: 2,
              border: "1px solid #BFDBFE",
              "& .MuiAlert-icon": {
                color: "#3B82F6",
              },
            }}
          >
            Billing endpoints are not connected yet. This page is using mock
            subscription data.
          </Alert>
        ) : (
          <Alert
            severity="info"
            sx={{
              borderRadius: 2,
              border: "1px solid #BFDBFE",
            }}
          >
            Billing endpoints are not connected yet. Enable
            `VITE_ENABLE_UI_MOCKS` to preview mocked plans.
          </Alert>
        )}

        {hasMockData ? (
          <Stack spacing={4}>
            {/* Current Plan Card */}
            <Card
              sx={{
                borderRadius: 3,
                border: "1px solid #E5E7EB",
                boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                position: "relative",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background:
                    "linear-gradient(90deg, #8B5CF6 0%, #A855F7 50%, #EC4899 100%)",
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Typography
                    variant="h2"
                    sx={{ fontWeight: 700, fontSize: "1.5rem" }}
                  >
                    Current Plan
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography
                      sx={{
                        fontSize: "2rem",
                        fontWeight: 800,
                        lineHeight: 1,
                        color: "#111827",
                      }}
                    >
                      Basic Plan
                    </Typography>
                    <Chip
                      label="Active"
                      size="small"
                      sx={{
                        bgcolor: "#DCFCE7",
                        color: "#16A34A",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        height: 24,
                      }}
                    />
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: "0.875rem" }}
                  >
                    Free forever • Perfect for getting started
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* Plans Section */}
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography
                  variant="h2"
                  sx={{ fontWeight: 700, fontSize: "1.5rem" }}
                >
                  Upgrade Your Plan
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: "0.875rem" }}
                >
                  Choose the plan that fits your needs
                </Typography>
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                {mockPlans.map((plan) => (
                  <Card
                    key={plan.id}
                    sx={{
                      flex: 1,
                      borderRadius: 3,
                      border:
                        plan.id === "pro"
                          ? "2px solid #8B5CF6"
                          : "1px solid #E5E7EB",
                      background:
                        plan.id === "pro"
                          ? "linear-gradient(135deg, #FAF5FF 0%, #FDF2F8 100%)"
                          : "#FFFFFF",
                      boxShadow:
                        plan.id === "pro"
                          ? "0 10px 15px -3px rgb(139 92 246 / 0.2), 0 4px 6px -2px rgb(139 92 246 / 0.05)"
                          : "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow:
                          plan.id === "pro"
                            ? "0 20px 25px -5px rgb(139 92 246 / 0.2), 0 8px 10px -6px rgb(139 92 246 / 0.1)"
                            : "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)",
                      },
                      ...(plan.id === "pro" && {
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "4px",
                          background:
                            "linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)",
                        },
                      }),
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Stack spacing={3}>
                        {/* Plan Header */}
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                        >
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: "1.75rem",
                              lineHeight: 1,
                              color: "#111827",
                            }}
                          >
                            {plan.title}
                          </Typography>
                          {plan.id === "pro" && (
                            <Chip
                              label="Recommended"
                              size="small"
                              sx={{
                                background:
                                  "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                                color: "#FFFFFF",
                                fontWeight: 700,
                                fontSize: "0.75rem",
                                height: 24,
                              }}
                            />
                          )}
                        </Stack>

                        {/* Price */}
                        <Stack
                          direction="row"
                          alignItems="baseline"
                          spacing={0.5}
                        >
                          <Typography
                            sx={{
                              fontSize: "3.5rem",
                              fontWeight: 800,
                              lineHeight: 1,
                              background:
                                plan.id === "pro"
                                  ? "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)"
                                  : "none",
                              WebkitBackgroundClip:
                                plan.id === "pro" ? "text" : "unset",
                              WebkitTextFillColor:
                                plan.id === "pro" ? "transparent" : "inherit",
                              backgroundClip:
                                plan.id === "pro" ? "text" : "unset",
                            }}
                          >
                            {plan.price}
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              color: "#6B7280",
                              fontSize: "1rem",
                              fontWeight: 600,
                            }}
                          >
                            {plan.period}
                          </Typography>
                        </Stack>

                        {/* Description */}
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#6B7280",
                            fontSize: "0.9375rem",
                          }}
                        >
                          {plan.blurb}
                        </Typography>

                        {/* CTA Button */}
                        <Button
                          variant={plan.ctaVariant}
                          fullWidth
                          sx={{
                            py: 1.5,
                            fontWeight: 700,
                            fontSize: "1rem",
                            borderRadius: 2,
                            textTransform: "none",
                            ...(plan.id === "pro"
                              ? {
                                  background:
                                    "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                                  "&:hover": {
                                    background:
                                      "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)",
                                    boxShadow:
                                      "0 4px 6px -1px rgb(139 92 246 / 0.3)",
                                  },
                                }
                              : {
                                  color: "#6B7280",
                                  borderColor: "#E5E7EB",
                                  borderWidth: "1.5px",
                                  "&:hover": {
                                    borderWidth: "1.5px",
                                    borderColor: "#D1D5DB",
                                    bgcolor: "#F9FAFB",
                                  },
                                }),
                          }}
                        >
                          {plan.cta}
                        </Button>

                        <Divider sx={{ borderColor: "#E5E7EB" }} />

                        {/* Features Header */}
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            color: plan.id === "pro" ? "#8B5CF6" : "#6B7280",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {plan.id === "pro"
                            ? "Everything in Basic, plus:"
                            : "What's included:"}
                        </Typography>

                        {/* Features List */}
                        <Stack spacing={1.5}>
                          {plan.features.map((feature) => (
                            <Stack
                              key={feature}
                              direction="row"
                              spacing={1.25}
                              alignItems="flex-start"
                            >
                              <CheckCircleRoundedIcon
                                sx={{
                                  fontSize: 20,
                                  color:
                                    plan.id === "pro" ? "#8B5CF6" : "#16A34A",
                                  flexShrink: 0,
                                  mt: 0.25,
                                }}
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  fontSize: "0.9375rem",
                                  lineHeight: 1.5,
                                  color: "#374151",
                                }}
                              >
                                {feature}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Stack>

            {/* FAQ Section */}
            <Card
              sx={{
                borderRadius: 3,
                border: "1px solid #E5E7EB",
                boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={3}>
                  <Typography
                    variant="h2"
                    sx={{ fontWeight: 700, fontSize: "1.5rem" }}
                  >
                    Frequently Asked Questions
                  </Typography>
                  <Stack spacing={3}>
                    {faqItems.map((item, index) => (
                      <Box key={item.q}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            mb: 1,
                            fontSize: "1rem",
                            color: "#111827",
                          }}
                        >
                          {item.q}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#6B7280",
                            fontSize: "0.9375rem",
                            lineHeight: 1.6,
                          }}
                        >
                          {item.a}
                        </Typography>
                        {index < faqItems.length - 1 && (
                          <Divider sx={{ mt: 3, borderColor: "#E5E7EB" }} />
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        ) : (
          <Card
            sx={{
              borderRadius: 3,
              border: "1px solid #E5E7EB",
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="body2"
                sx={{
                  color: "#6B7280",
                  fontSize: "0.9375rem",
                }}
              >
                Billing UI is disabled because mock mode is off and no billing
                endpoint is connected.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
