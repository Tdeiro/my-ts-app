import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { designTokens } from "../../Theme/designTokens";

export function SectionCard({
  children,
  sx,
}: {
  children: React.ReactNode;
  sx?: Record<string, unknown>;
}) {
  return (
    <Card sx={{ borderRadius: 2.5, ...(sx ?? {}) }}>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function OverviewMetric({
  label,
  value,
  trend,
  valueColor,
}: {
  label: string;
  value: number | string;
  trend?: number | null;
  valueColor?: string;
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: "1px solid rgba(15,23,42,0.08)",
        bgcolor: "background.paper",
        minWidth: 0,
        flex: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
        {label}
      </Typography>
      <Stack direction="row" alignItems="baseline" spacing={0.75}>
        <Typography
          sx={{ fontWeight: 900, fontSize: 30, lineHeight: 1.05, color: valueColor ?? "text.primary" }}
        >
          {value}
        </Typography>
        {typeof trend === "number" ? (
          <Stack direction="row" alignItems="center" spacing={0.25}>
            <ArrowUpwardRoundedIcon
              sx={{
                fontSize: 14,
                color: trend >= 0 ? "success.main" : "error.main",
                transform: trend < 0 ? "rotate(180deg)" : "none",
              }}
            />
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: trend >= 0 ? "success.main" : "error.main" }}
            >
              {Math.abs(trend).toFixed(1)}%
            </Typography>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}

export function RevenueSliceCard({
  title,
  value,
  subtitle,
  variant,
}: {
  title: string;
  value: string;
  subtitle: string;
  variant: "primary" | "neutral" | "accent" | "info";
}) {
  const stylesByVariant = {
    primary: {
      borderColor: designTokens.purple[200],
      background: designTokens.gradients.revenueCard,
    },
    neutral: {
      borderColor: designTokens.purple[200],
      background: designTokens.purple[50],
    },
    accent: {
      borderColor: designTokens.pink[200],
      background: designTokens.pink[50],
    },
    info: {
      borderColor: designTokens.blue[200],
      background: designTokens.blue[50],
    },
  } as const;

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        p: 1.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: stylesByVariant[variant].borderColor,
        background: stylesByVariant[variant].background,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography sx={{ fontWeight: 900, fontSize: 24, lineHeight: 1.15, mb: 0.25 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {subtitle}
      </Typography>
    </Box>
  );
}

export function NavigateSummaryCard({
  title,
  count,
  subtitle,
  icon,
  color,
  onClick,
}: {
  title: string;
  count: number;
  subtitle: string;
  icon: React.ReactNode;
  color: "primary" | "warning" | "default";
  onClick?: () => void;
}) {
  const borderColor =
    color === "primary"
      ? designTokens.purple[200]
      : color === "warning"
        ? designTokens.orange[200]
        : "rgba(15,23,42,0.10)";
  const iconBg =
    color === "primary" ? "primary.main" : color === "warning" ? "warning.main" : designTokens.purple[100];
  const iconColor = color === "default" ? "primary.main" : "white";

  return (
    <Card
      sx={{
        flex: 1,
        borderRadius: 2,
        border: "1px solid",
        borderColor,
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
          {onClick ? (
            <Button size="small" endIcon={<ChevronRightRoundedIcon />} onClick={onClick}>
              View
            </Button>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: iconBg,
              color: iconColor,
              display: "grid",
              placeItems: "center",
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: 28, lineHeight: 1.1 }}>{count}</Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function RevenueMiniBars({
  items,
  formatValue,
}: {
  items: Array<{ label: string; value: number }>;
  formatValue: (value: number) => string;
}) {
  const maxValue = Math.max(1, ...items.map((item) => Math.max(0, item.value)));
  return (
    <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ minHeight: 84 }}>
      {items.map((item) => {
        const barHeight = `${Math.max(6, (item.value / maxValue) * 100)}%`;
        return (
          <Box key={item.label} sx={{ flex: 1, minWidth: 0 }}>
            <Tooltip title={formatValue(item.value)}>
              <Box
                sx={{
                  height: 72,
                  display: "flex",
                  alignItems: "flex-end",
                  borderRadius: 1,
                  p: 0.25,
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    height: barHeight,
                    borderRadius: 1,
                    background: designTokens.gradients.revenueBar,
                  }}
                />
              </Box>
            </Tooltip>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", textAlign: "center", mt: 0.5 }}
            >
              {item.label}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}
