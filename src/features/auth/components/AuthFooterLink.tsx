import * as React from "react";
import { Button, Typography } from "@mui/material";

export type AuthFooterLinkProps = {
  prompt: string;
  actionLabel: string;
  onAction: () => void;
};

export default function AuthFooterLink({ prompt, actionLabel, onAction }: AuthFooterLinkProps) {
  return (
    <Typography variant="body2" color="text.secondary">
      {prompt}{" "}
      <Button variant="text" size="small" onClick={onAction}>
        {actionLabel}
      </Button>
    </Typography>
  );
}
