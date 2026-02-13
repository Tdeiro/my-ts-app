// TopStatCardsLikeDesign.tsx
import * as React from "react";
import {
  Box,
  Stack,
  Card,
  CardContent,
  Typography,
  Divider,
  Avatar,
} from "@mui/material";

function StatCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      sx={{
        flex: "1 1 0",
        minWidth: 260, // ✅ prevents squeezing/trim
        maxWidth: 380, // ✅ keeps cards from getting too huge on wide screens
        minHeight: 130,
      }}
    >
      <CardContent
        sx={{
          p: 3,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            {title}
          </Typography>
          <Divider />
        </Box>

        <Box sx={{ mt: 2, flexGrow: 1, display: "flex", alignItems: "center" }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function TopStatCardsLikeDesign() {
  return (
    <Stack
      direction="row"
      spacing={2}
      useFlexGap
      flexWrap="wrap" // ✅ wrap instead of shrinking
      sx={{ width: "100%" }}
    >
      {/* Upcoming Events */}
      <StatCard title="Upcoming Events">
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ width: "100%" }}
        >
          <Avatar
            sx={{
              width: 30,
              height: 30,
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
              flexShrink: 0, // ✅ avatar never shrinks
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 650,
                color: "#2563EB",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Tennis Tournament
            </Typography>
            <Typography variant="body2" color="text.secondary">
              In 2 days
            </Typography>
          </Box>
        </Stack>
      </StatCard>

      {/* Today's Classes */}
      <StatCard title="Today's Classes">
        <Stack
          direction="row"
          alignItems="center"
          spacing={2.5}
          sx={{ width: "100%" }}
        >
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography variant="h3" sx={{ lineHeight: 1 }}>
              5
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: "nowrap" }}
            >
              Sessions
            </Typography>
          </Stack>

          <Divider orientation="vertical" flexItem />

          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography variant="h3" sx={{ lineHeight: 1 }}>
              32
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: "nowrap" }}
            >
              Students
            </Typography>
          </Stack>
        </Stack>
      </StatCard>

      {/* Active Tournaments */}
      <StatCard title="Active Tournaments">
        <Stack
          direction="row"
          alignItems="baseline"
          spacing={1.5}
          sx={{ width: "100%" }}
        >
          <Typography variant="h3" sx={{ lineHeight: 1 }}>
            2
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ongoing
          </Typography>
        </Stack>
      </StatCard>
    </Stack>
  );
}
