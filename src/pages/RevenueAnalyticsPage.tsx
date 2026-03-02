import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import type { ReactNode } from "react";
import * as React from "react";
import MockDataFlag from "../Components/Shared/MockDataFlag";
import { UI_FEATURE_FLAGS } from "../config/featureFlags";
import { designTokens } from "../Theme/designTokens";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MOCK_WEEK = [320, 450, 380, 520, 410, 180, 80];

type Period = "week" | "month" | "year";

const formatMoney = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });

export default function RevenueAnalyticsPage() {
  const hasMockData = UI_FEATURE_FLAGS.enableMockData;
  const [period, setPeriod] = React.useState<Period>("week");

  const weeklyTotal = MOCK_WEEK.reduce((sum, value) => sum + value, 0);
  const summary = {
    totalRevenue: hasMockData ? 12450 : 0,
    periodRevenue: hasMockData ? weeklyTotal : 0,
    periodGrowth: hasMockData ? 12.5 : null,
    sessions: hasMockData ? 62 : 0,
    teams: hasMockData ? 3 : 0,
    tournaments: hasMockData ? 5 : 0,
  };

  const sourceRows = [
    {
      label: "Classes",
      amount: hasMockData ? 1450 : 0,
      pct: hasMockData ? 62 : 0,
      color: designTokens.purple[600],
      bg: designTokens.purple[50],
      icon: <CalendarMonthRoundedIcon fontSize="small" />,
    },
    {
      label: "Tournaments",
      amount: hasMockData ? 680 : 0,
      pct: hasMockData ? 29 : 0,
      color: designTokens.orange[500],
      bg: designTokens.orange[50],
      icon: <EmojiEventsRoundedIcon fontSize="small" />,
    },
    {
      label: "Team Fees",
      amount: hasMockData ? 210 : 0,
      pct: hasMockData ? 9 : 0,
      color: designTokens.blue[600],
      bg: designTokens.blue[50],
      icon: <GroupsRoundedIcon fontSize="small" />,
    },
  ];

  const max = Math.max(1, ...MOCK_WEEK);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, md: 3 } }}>
      <Stack spacing={4}>
        {/* Page Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
        >
          <Stack spacing={0.5}>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: "2rem" }}>
              Revenue & Analytics
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontSize: "1rem" }}
            >
              Track your earnings and performance metrics
            </Typography>
          </Stack>
          {hasMockData ? (
            <MockDataFlag label="Analytics uses mock data" />
          ) : null}
        </Stack>

        {/* Alert */}
        {!hasMockData ? (
          <Alert
            severity="info"
            sx={{
              borderRadius: 2,
              border: "1px solid #BFDBFE",
            }}
          >
            Analytics backend is not connected yet for this page.
          </Alert>
        ) : null}

        {/* Period Toggle & Quick Stats Row */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          <ToggleButtonGroup
            exclusive
            value={period}
            onChange={(_, value: Period | null) => value && setPeriod(value)}
            sx={{
              "& .MuiToggleButton-root": {
                px: 3,
                py: 1.25,
                fontWeight: 600,
                fontSize: "0.875rem",
                textTransform: "none",
                borderRadius: 2,
                border: "1.5px solid #E5E7EB",
                color: "#6B7280",
                "&.Mui-selected": {
                  background:
                    "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                  color: "#FFFFFF",
                  border: "1.5px solid transparent",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)",
                  },
                },
                "&:hover": {
                  bgcolor: "#F9FAFB",
                },
              },
              gap: 1,
            }}
          >
            <ToggleButton value="week">This Week</ToggleButton>
            <ToggleButton value="month">This Month</ToggleButton>
            <ToggleButton value="year">This Year</ToggleButton>
          </ToggleButtonGroup>

          {/* Quick Summary Chips */}
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Chip
              icon={
                <CalendarMonthRoundedIcon
                  sx={{ fontSize: "1rem !important" }}
                />
              }
              label={`${summary.sessions} Sessions`}
              sx={{
                bgcolor: "#F3F4F6",
                color: "#374151",
                fontWeight: 700,
                fontSize: "0.875rem",
                height: 36,
                px: 1,
              }}
            />
            <Chip
              icon={
                <EmojiEventsRoundedIcon sx={{ fontSize: "1rem !important" }} />
              }
              label={`${summary.tournaments} Tournaments`}
              sx={{
                bgcolor: "#F3F4F6",
                color: "#374151",
                fontWeight: 700,
                fontSize: "0.875rem",
                height: 36,
                px: 1,
              }}
            />
          </Stack>
        </Stack>

        {/* Primary Metric Cards */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          <MetricCard
            icon={<PaidRoundedIcon />}
            label="Total Revenue"
            value={formatMoney(summary.totalRevenue)}
            tone="primary"
            footer="All-time earnings"
          />
          <MetricCard
            icon={
              summary.periodGrowth == null || summary.periodGrowth >= 0 ? (
                <TrendingUpRoundedIcon />
              ) : (
                <TrendingDownRoundedIcon />
              )
            }
            label={
              period === "week"
                ? "This Week"
                : period === "month"
                  ? "This Month"
                  : "This Year"
            }
            value={formatMoney(summary.periodRevenue)}
            tone="success"
            footer={
              summary.periodGrowth == null
                ? "No comparison"
                : `${summary.periodGrowth > 0 ? "+" : ""}${summary.periodGrowth}% vs previous`
            }
          />
          <MetricCard
            icon={<GroupsRoundedIcon />}
            label="Active Teams"
            value={String(summary.teams)}
            tone="info"
            footer="Currently managing"
          />
        </Stack>

        {/* Weekly Income Chart - Full Width for Prominence */}
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
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={2}
              >
                <Stack spacing={0.5}>
                  <Typography
                    variant="h2"
                    sx={{ fontWeight: 700, fontSize: "1.5rem" }}
                  >
                    Daily Revenue Breakdown
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: "0.875rem" }}
                  >
                    Feb 23 - Mar 1 • Total: {formatMoney(weeklyTotal)}
                  </Typography>
                </Stack>
                <Chip
                  label={
                    summary.periodGrowth
                      ? `+${summary.periodGrowth}% vs last week`
                      : "No comparison"
                  }
                  sx={{
                    bgcolor: "#DCFCE7",
                    color: "#16A34A",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    height: 32,
                  }}
                />
              </Stack>

              <Stack
                direction="row"
                spacing={2}
                alignItems="flex-end"
                sx={{ minHeight: 240, mt: 2 }}
              >
                {(hasMockData
                  ? MOCK_WEEK
                  : Array.from({ length: 7 }).map(() => 0)
                ).map((value, idx) => (
                  <Box key={DAYS[idx]} sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        height: 180,
                        display: "flex",
                        alignItems: "flex-end",
                        px: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: "100%",
                          height: `${Math.max(8, (value / max) * 100)}%`,
                          borderRadius: 2,
                          background:
                            "linear-gradient(180deg, #8B5CF6 0%, #EC4899 100%)",
                          transition: "all 0.3s ease",
                          position: "relative",
                          "&:hover": {
                            transform: "scaleY(1.05)",
                            filter: "brightness(1.1)",
                          },
                          "&::after": {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: "rgba(255, 255, 255, 0.1)",
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        textAlign: "center",
                        mt: 1.5,
                        fontWeight: 700,
                        fontSize: "0.8125rem",
                        color: "#374151",
                      }}
                    >
                      {DAYS[idx]}
                    </Typography>
                    <Chip
                      size="small"
                      label={formatMoney(value)}
                      sx={{
                        mt: 1,
                        width: "100%",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        bgcolor: "#F3F4F6",
                        color: "#374151",
                        height: 24,
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Revenue Sources & Additional Insights */}
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
          {/* Revenue by Source */}
          <Card
            sx={{
              flex: 1,
              borderRadius: 3,
              border: "1px solid #E5E7EB",
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Stack spacing={0.5}>
                  <Typography
                    variant="h2"
                    sx={{ fontWeight: 700, fontSize: "1.5rem" }}
                  >
                    Revenue by Source
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: "0.875rem" }}
                  >
                    Breakdown of income streams
                  </Typography>
                </Stack>
                <Stack spacing={3}>
                  {sourceRows.map((row) => (
                    <Box key={row.label}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 1.25 }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              bgcolor: row.bg,
                              color: row.color,
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            {row.icon}
                          </Box>
                          <Stack spacing={0.25}>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: "1rem",
                                color: "#111827",
                              }}
                            >
                              {row.label}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ fontSize: "0.75rem", color: "#6B7280" }}
                            >
                              {row.pct}% of total
                            </Typography>
                          </Stack>
                        </Stack>
                        <Typography
                          sx={{
                            fontWeight: 800,
                            fontSize: "1.25rem",
                            color: "#111827",
                          }}
                        >
                          {formatMoney(row.amount)}
                        </Typography>
                      </Stack>
                      <Box
                        sx={{
                          height: 12,
                          borderRadius: 999,
                          bgcolor: "#F3F4F6",
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <Box
                          sx={{
                            width: `${row.pct}%`,
                            height: "100%",
                            bgcolor: row.color,
                            borderRadius: 999,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card
            sx={{
              flex: 1,
              borderRadius: 3,
              border: "1px solid #E5E7EB",
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
              background: "linear-gradient(135deg, #FAF5FF 0%, #FDF2F8 100%)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Stack spacing={0.5}>
                  <Typography
                    variant="h2"
                    sx={{ fontWeight: 700, fontSize: "1.5rem" }}
                  >
                    Performance Insights
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: "0.875rem" }}
                  >
                    Key metrics and trends
                  </Typography>
                </Stack>
                <Stack spacing={2.5}>
                  {/* Average per session */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: "#FFFFFF",
                      border: "1px solid #E9D5FF",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: "#6B7280",
                        }}
                      >
                        Avg. Revenue per Session
                      </Typography>
                      <TrendingUpRoundedIcon
                        sx={{ fontSize: 20, color: "#16A34A" }}
                      />
                    </Stack>
                    <Typography
                      sx={{
                        fontSize: "2rem",
                        fontWeight: 800,
                        color: "#111827",
                      }}
                    >
                      {formatMoney(
                        hasMockData
                          ? Math.round(weeklyTotal / summary.sessions)
                          : 0,
                      )}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontSize: "0.75rem", color: "#6B7280", mt: 0.5 }}
                    >
                      Based on {summary.sessions} total sessions
                    </Typography>
                  </Box>

                  {/* Peak day */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: "#FFFFFF",
                      border: "1px solid #E9D5FF",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: "#6B7280",
                        }}
                      >
                        Best Performing Day
                      </Typography>
                      <EmojiEventsRoundedIcon
                        sx={{ fontSize: 20, color: "#F59E0B" }}
                      />
                    </Stack>
                    <Typography
                      sx={{
                        fontSize: "2rem",
                        fontWeight: 800,
                        color: "#111827",
                      }}
                    >
                      {DAYS[MOCK_WEEK.indexOf(Math.max(...MOCK_WEEK))]}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontSize: "0.75rem", color: "#6B7280", mt: 0.5 }}
                    >
                      {formatMoney(Math.max(...MOCK_WEEK))} earned
                    </Typography>
                  </Box>

                  {/* Active tournaments */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: "#FFFFFF",
                      border: "1px solid #E9D5FF",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: "#6B7280",
                        }}
                      >
                        Revenue per Tournament
                      </Typography>
                      <GroupsRoundedIcon
                        sx={{ fontSize: 20, color: "#3B82F6" }}
                      />
                    </Stack>
                    <Typography
                      sx={{
                        fontSize: "2rem",
                        fontWeight: 800,
                        color: "#111827",
                      }}
                    >
                      {formatMoney(
                        hasMockData
                          ? Math.round(
                              summary.totalRevenue / summary.tournaments,
                            )
                          : 0,
                      )}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontSize: "0.75rem", color: "#6B7280", mt: 0.5 }}
                    >
                      Average across {summary.tournaments} tournaments
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Stack>
    </Box>
  );
}

function MetricCard({
  icon,
  label,
  value,
  footer,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  footer: string;
  tone: "primary" | "success" | "info";
}) {
  const toneBg =
    tone === "primary"
      ? "linear-gradient(135deg, #FAF5FF 0%, #FDF2F8 100%)"
      : tone === "success"
        ? "#DCFCE7"
        : "#DBEAFE";
  const iconBg =
    tone === "primary" ? "#F3E8FF" : tone === "success" ? "#BBF7D0" : "#BFDBFE";
  const iconColor =
    tone === "primary" ? "#8B5CF6" : tone === "success" ? "#16A34A" : "#3B82F6";

  return (
    <Card
      sx={{
        flex: 1,
        borderRadius: 3,
        border:
          tone === "primary" ? "1.5px solid #E9D5FF" : "1px solid #E5E7EB",
        boxShadow:
          tone === "primary"
            ? "0 4px 6px -1px rgb(139 92 246 / 0.1)"
            : "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        background: toneBg,
        transition: "all 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow:
            tone === "primary"
              ? "0 10px 15px -3px rgb(139 92 246 / 0.2)"
              : "0 4px 6px -1px rgb(0 0 0 / 0.1)",
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: iconBg,
                color: iconColor,
                display: "grid",
                placeItems: "center",
                fontSize: "1.5rem",
              }}
            >
              {icon}
            </Box>
            <Stack spacing={0.25}>
              <Typography
                variant="body2"
                sx={{
                  color: "#6B7280",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.025em",
                }}
              >
                {label}
              </Typography>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: "2rem",
                  lineHeight: 1,
                  color: "#111827",
                }}
              >
                {value}
              </Typography>
            </Stack>
          </Stack>
          <Typography
            variant="caption"
            sx={{
              color: "#6B7280",
              fontWeight: 600,
              fontSize: "0.8125rem",
            }}
          >
            {footer}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
