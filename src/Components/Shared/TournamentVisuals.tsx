import * as React from "react";
import { Box, Stack, Typography } from "@mui/material";

function Node({ label }: { label: string }) {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.55,
        borderRadius: 1,
        border: "1px solid rgba(15,23,42,0.12)",
        bgcolor: "rgba(255,255,255,0.85)",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

export function BracketPreviewCard() {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1.1 }}>
      <Stack spacing={0.5}>
        <Node label="R16" />
        <Node label="R16" />
      </Stack>
      <Typography sx={{ color: "text.disabled", fontWeight: 700 }}>→</Typography>
      <Stack spacing={0.5}>
        <Node label="QF" />
        <Node label="QF" />
      </Stack>
      <Typography sx={{ color: "text.disabled", fontWeight: 700 }}>→</Typography>
      <Stack spacing={0.5}>
        <Node label="SF" />
        <Node label="Final" />
      </Stack>
    </Stack>
  );
}

export function GroupStagePreviewCard() {
  return (
    <Box sx={{ mt: 1.1 }}>
      <Box
        sx={{
          border: "1px solid rgba(15,23,42,0.10)",
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: "rgba(255,255,255,0.85)",
        }}
      >
        <Stack direction="row" sx={{ bgcolor: "rgba(15,23,42,0.05)", px: 1, py: 0.45 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, flex: 1 }}>Group A</Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 800 }}>Pts</Typography>
        </Stack>
        {["Team 1", "Team 2", "Team 3"].map((t, idx) => (
          <Stack
            key={t}
            direction="row"
            sx={{
              px: 1,
              py: 0.45,
              borderTop: idx === 0 ? "none" : "1px solid rgba(15,23,42,0.06)",
            }}
          >
            <Typography sx={{ fontSize: 11, flex: 1 }}>{t}</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{6 - idx * 2}</Typography>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

export function RoundsProgressionCard() {
  return (
    <Stack direction="row" spacing={0.6} sx={{ mt: 1.1, flexWrap: "wrap", rowGap: 0.6 }}>
      {["Round 1", "Round 2", "Round 3", "Final Round"].map((r, idx) => (
        <React.Fragment key={r}>
          <Node label={r} />
          {idx < 3 ? (
            <Typography sx={{ color: "text.disabled", fontWeight: 700 }}>→</Typography>
          ) : null}
        </React.Fragment>
      ))}
    </Stack>
  );
}
