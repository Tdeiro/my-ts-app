import * as React from "react";
import { Box, Card, CardContent, Container, Typography } from "@mui/material";
import Logo from "../../../assets/onora.png";

export type AuthPageProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function AuthPage({ title, subtitle, children, footer }: AuthPageProps) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
        py: { xs: 4, sm: 6 },
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Box
                component="img"
                src={Logo}
                alt="Onora logo"
                sx={{
                  height: 60,
                  display: "block",
                  mx: "auto",
                  mb: 1,
                }}
              />
              {title ? (
                <Typography variant="h5" fontWeight={600}>
                  {title}
                </Typography>
              ) : null}
              {subtitle ? (
                <Typography color="text.secondary">{subtitle}</Typography>
              ) : null}
            </Box>

            {children}

            {footer ? <Box sx={{ mt: 3, textAlign: "center" }}>{footer}</Box> : null}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
