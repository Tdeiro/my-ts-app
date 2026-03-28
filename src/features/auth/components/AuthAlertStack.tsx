import * as React from "react";
import { Alert, Stack } from "@mui/material";

export type AuthAlertStackProps = {
  error?: string | null;
  success?: string | null;
};

export default function AuthAlertStack({ error, success }: AuthAlertStackProps) {
  if (!error && !success) return null;

  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
    </Stack>
  );
}
