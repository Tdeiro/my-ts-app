import * as React from "react";
import { Card, Typography } from "@mui/material";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontWeight: 700, color: "#111827", mb: 1 }}>
      {children}
    </Typography>
  );
}

export function SoftCard({ children }: { children: React.ReactNode }) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        overflow: "hidden",
      }}
    >
      {children}
    </Card>
  );
}
