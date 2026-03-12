import type { ReactNode } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Tooltip,
  Typography,
} from "@mui/material";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";

type ScheduleTabProps = {
  selectedCategoryLevel: string;
  selectedCategoryDisplayName: string;
  canFinalizeSelectedCategory: boolean;
  finalizeDisabledReason: string;
  selectedCategoryIsFinalizing: boolean;
  selectedCategoryIsFinalized: boolean;
  onFinalize: () => void;
  onGoToRunTournament: () => void;
  creatorContent: ReactNode;
  overviewContent: ReactNode;
};

export function ScheduleTab({
  selectedCategoryLevel,
  selectedCategoryDisplayName,
  canFinalizeSelectedCategory,
  finalizeDisabledReason,
  selectedCategoryIsFinalizing,
  selectedCategoryIsFinalized,
  onFinalize,
  onGoToRunTournament,
  creatorContent,
  overviewContent,
}: ScheduleTabProps) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            gap: 2,
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "10px",
                bgcolor: "#FFEDD4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CalendarMonthOutlinedIcon sx={{ fontSize: 24, color: "#F54900" }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: "#6A7282",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {selectedCategoryLevel}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.45rem",
                  fontWeight: 700,
                  color: "#101828",
                  lineHeight: 1.2,
                }}
              >
                {selectedCategoryDisplayName}
              </Typography>
            </Box>
          </Box>
          <Tooltip
            title={canFinalizeSelectedCategory ? "" : finalizeDisabledReason}
            arrow
            disableHoverListener={canFinalizeSelectedCategory}
          >
            <span>
              <Button
                variant="contained"
                onClick={onFinalize}
                disabled={
                  selectedCategoryIsFinalized ||
                  selectedCategoryIsFinalizing ||
                  !canFinalizeSelectedCategory
                }
                sx={{
                  borderRadius: "10px",
                  textTransform: "none",
                  minWidth: 150,
                }}
              >
                {selectedCategoryIsFinalizing
                  ? "Finalizing..."
                  : selectedCategoryIsFinalized
                    ? "Setup Finalized"
                    : "Finalize Setup"}
              </Button>
            </span>
          </Tooltip>
        </Box>

        {selectedCategoryIsFinalizing ? (
          <Box
            sx={{
              p: 3,
              borderRadius: "12px",
              border: "1px solid #E5E7EB",
              bgcolor: "#FFFFFF",
              textAlign: "center",
            }}
          >
            <CircularProgress size={28} sx={{ color: "#F54900", mb: 1 }} />
            <Typography sx={{ fontWeight: 700, color: "#101828", mb: 0.5 }}>
              Finalizing setup...
            </Typography>
            <Typography sx={{ color: "#4A5565", fontSize: "0.9rem" }}>
              We are locking this category schedule now.
            </Typography>
          </Box>
        ) : selectedCategoryIsFinalized ? (
          <Box
            sx={{
              p: 3,
              borderRadius: "12px",
              border: "1px solid #BBF7D0",
              bgcolor: "#F0FDF4",
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontWeight: 800, color: "#166534", mb: 0.5 }}>
              You are all set
            </Typography>
            <Typography sx={{ color: "#166534", fontSize: "0.95rem", mb: 2 }}>
              Setup is finalized. You can now view and run matches from the Run Tournament page.
            </Typography>
            <Button
              variant="contained"
              onClick={onGoToRunTournament}
              sx={{
                borderRadius: "10px",
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Go to Run Tournament
            </Button>
          </Box>
        ) : (
          <>
            {creatorContent}
            {overviewContent}
          </>
        )}
      </CardContent>
    </Card>
  );
}
