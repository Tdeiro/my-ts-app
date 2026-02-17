import * as React from "react";
import {
  Box,
  Stack,
  Card,
  CardContent,
  Typography,
  Divider,
  Avatar,
  useTheme,
} from "@mui/material";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";

function StatCard({
  title,
  accent = false,
  children,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        flex: "1 1 0",
        minWidth: 260,
        maxWidth: 380,
        minHeight: 140,
        borderRadius: 2,
        position: "relative",
        overflow: "hidden",

        // subtle premium tint (keeps it clean)
        background:
          "linear-gradient(180deg, rgba(139,92,246,0.06) 0%, rgba(255,255,255,0) 55%)",

        // orange dot accent (super subtle)
        ...(accent
          ? {
              "&::after": {
                content: '""',
                position: "absolute",
                top: 14,
                right: 14,
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: theme.palette.secondary.main,
                opacity: 0.9,
              },
            }
          : null),
      }}
    >
      <CardContent
        sx={{
          p: 3,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* Header */}
        <Box>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 800,
              letterSpacing: 0.2,
              color: "text.primary",
              mb: 1,
            }}
          >
            {title}
          </Typography>

          <Divider
            sx={{
              opacity: 0.7,
              borderColor: "rgba(15, 23, 42, 0.08)",
            }}
          />
        </Box>

        {/* Content */}
        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function TopStatCardsLikeDesign() {
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      spacing={2}
      useFlexGap
      flexWrap="wrap"
      sx={{ width: "100%" }}
    >
      {/* Upcoming Events */}
      <StatCard title="Upcoming Events" accent>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ width: "100%" }}
        >
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: "rgba(139, 92, 246, 0.10)",
              color: "primary.main",
              border: "1px solid",
              borderColor: "rgba(139, 92, 246, 0.18)",
              flexShrink: 0,
            }}
          >
            <EventRoundedIcon fontSize="small" />
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 800,
                color: "primary.main",
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
      <StatCard title="Today’s Classes">
        <Stack
          direction="row"
          alignItems="center"
          spacing={2.5}
          sx={{ width: "100%" }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: "rgba(139, 92, 246, 0.10)",
                color: "primary.main",
                border: "1px solid",
                borderColor: "rgba(139, 92, 246, 0.18)",
                flexShrink: 0,
              }}
            >
              <GroupsRoundedIcon fontSize="small" />
            </Avatar>

            <Stack direction="row" alignItems="baseline" spacing={1}>
              <Typography variant="h3" sx={{ lineHeight: 1, fontWeight: 900 }}>
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
          </Stack>

          <Divider orientation="vertical" flexItem sx={{ opacity: 0.7 }} />

          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography variant="h3" sx={{ lineHeight: 1, fontWeight: 900 }}>
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
          alignItems="center"
          spacing={1.5}
          sx={{ width: "100%" }}
        >
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: "rgba(139, 92, 246, 0.10)",
              color: "primary.main",
              border: "1px solid",
              borderColor: "rgba(139, 92, 246, 0.18)",
              flexShrink: 0,
            }}
          >
            <EmojiEventsRoundedIcon fontSize="small" />
          </Avatar>

          <Stack direction="row" alignItems="baseline" spacing={1.25}>
            <Typography variant="h3" sx={{ lineHeight: 1, fontWeight: 900 }}>
              2
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ongoing
            </Typography>
          </Stack>
        </Stack>
      </StatCard>
    </Stack>
  );
}
