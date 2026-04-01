import * as React from "react";
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import Logo from "../assets/onora.png";
import BgImg from "../assets/bgimg.png";

export default function LandingPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        background:
          "radial-gradient(1200px 520px at 85% -10%, rgba(168,85,247,0.12), transparent 62%), radial-gradient(900px 420px at 0% 8%, rgba(56,189,248,0.10), transparent 60%), #F8FAFC",
      }}
    >
      {/* TOP NAV */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "rgba(248,250,252,0.78)",
          borderBottom: "1px solid",
          borderColor: "rgba(168,85,247,0.16)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar
            sx={{
              minHeight: { xs: 62, md: 68 },
              px: { xs: 0, md: 1 },
              py: 0,
            }}
          >
            {/* Logo */}
            <Box
              component="img"
              src={Logo}
              alt="Onora logo"
              sx={{
                height: 40,
                display: "block",
                mx: "auto",
              }}
            />

            {/* Center nav */}
            <Box sx={{ flex: 1, display: { xs: "none", md: "block" } }} />
            <Stack
              direction="row"
              spacing={3}
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                color: "text.secondary",
                fontSize: 14,
              }}
            >
              <NavLink href="#features">Features</NavLink>
              <NavLink href="#pricing">Pricing</NavLink>
              <NavLink href="#contact">Contact Sales</NavLink>
              <NavLink href="/login">Sign In</NavLink>
            </Stack>

            <Box sx={{ flex: 1 }} />

            {/* CTA */}
            <Button
              variant="contained"
              color="primary"
              sx={{ borderRadius: 999, px: 2.5, py: 1.1 }}
              href="/signup"
            >
              Get Started
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      {/* HERO */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          pt: { xs: 0.25, md: 0.75 },
          pb: { xs: 1, md: 0 },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.10) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            opacity: 0.26,
            pointerEvents: "none",
          }}
        />
        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.05fr 1fr" },
              gap: { xs: 2, md: 3.5 },
              alignItems: "center",
              pb: { xs: 2, md: 0 },
            }}
          >
            {/* Left copy */}
            <Box sx={{ pr: { md: 2 } }}>
              <Typography
                sx={{
                  fontWeight: 900,
                  letterSpacing: -1.2,
                  lineHeight: 1.05,
                  fontSize: { xs: "2.25rem", md: "3.2rem" },
                  color: "text.primary",
                }}
              >
                Powerful Platform
                <br />
                for Managing Activities
              </Typography>

              <Typography
                sx={{
                  mt: 1.4,
                  fontSize: { xs: "0.96rem", md: "1.06rem" },
                  lineHeight: 1.65,
                  color: "text.secondary",
                  maxWidth: 520,
                }}
              >
                Built for schools, clubs, coaches, and communities.
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mt: 2.4 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ borderRadius: 999, px: 3.3, py: 1.2 }}
                  href="/signup"
                >
                  Get Started
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderRadius: 999,
                    px: 3.3,
                    py: 1.2,
                    borderColor: "divider",
                    color: "primary.dark",
                    bgcolor: "background.paper",
                    "&:hover": {
                      borderColor: "divider",
                      bgcolor: "background.paper",
                    },
                  }}
                  href="#contact"
                >
                  Contact Sales
                </Button>
              </Stack>
            </Box>

            {/* Right image with tech glow */}
            <Box sx={{ position: "relative" }}>
              {/* Blobs */}
              <Box
                sx={{
                  position: "absolute",
                  right: { xs: "-18%", md: "-20%" },
                  top: { xs: "10%", md: "0%" },
                  width: { xs: 520, md: 820 },
                  height: { xs: 360, md: 540 },
                  background:
                    "radial-gradient(closest-side, rgba(168,85,247,0.18), transparent 70%)",
                  filter: "blur(0px)",
                  pointerEvents: "none",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  right: { xs: "-8%", md: "-10%" },
                  top: { xs: "38%", md: "44%" },
                  width: { xs: 480, md: 760 },
                  height: { xs: 340, md: 520 },
                  background:
                    "radial-gradient(closest-side, rgba(56,189,248,0.14), transparent 72%)",
                  pointerEvents: "none",
                }}
              />

              <Box
                component="img"
                src={BgImg}
                alt="Events dashboard preview"
                sx={{
                  position: "relative",
                  zIndex: 1,
                  width: { xs: "112%", md: "124%" },
                  maxWidth: "none",
                  ml: { xs: "-6%", md: "-14%" },
                  mt: { xs: -1.2, md: -1.5 },
                  display: "block",
                  objectFit: "cover",
                }}
              />
            </Box>
          </Box>
        </Container>

      </Box>

      <Container maxWidth="lg">
        {/* FEATURES */}
        <Box
          id="features"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
            gap: { xs: 3, md: 5 },
            pt: { xs: 1.5, md: 2.5 },
            pb: { xs: 5, md: 6 },
          }}
        >
          <Feature
            icon={<CalendarMonthRoundedIcon />}
            title="Schedule Events"
            desc="Organize classes, matches, and tournaments."
          />
          <Feature
            icon={<PaymentsRoundedIcon />}
            title="Manage Registrations"
            desc="Handle sign-ups and collect payments."
          />
          <Feature
            icon={<NotificationsActiveRoundedIcon />}
            title="Keep Everyone Updated"
            desc="Send notifications and reminders."
          />
        </Box>

        <Divider />

        {/* FOOTER */}
        <Box
          sx={{
            py: 3,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 2,
            color: "text.secondary",
          }}
        >
          <Typography variant="body2">
            © {new Date().getFullYear()} Onora. All rights reserved.
          </Typography>

          <Stack direction="row" spacing={3}>
            <NavLink href="#privacy">Privacy</NavLink>
            <NavLink href="#terms">Terms</NavLink>
            <NavLink href="#contact">Contact</NavLink>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}

/* ---------- small helpers ---------- */

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      component="a"
      href={href}
      sx={{
        textDecoration: "none",
        color: "text.secondary",
        fontSize: 14,
        "&:hover": { color: "text.primary" },
      }}
    >
      {children}
    </Box>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Stack direction="row" spacing={2.2} alignItems="flex-start">
      <Box
        sx={{
          width: 46,
          height: 46,
          borderRadius: 999,
          bgcolor: "rgba(34,197,94,0.14)",
          border: "1px solid",
          borderColor: "divider",
          display: "grid",
          placeItems: "center",
          color: "primary.dark",
          flex: "0 0 auto",
          mt: 0.4,
        }}
      >
        {icon}
      </Box>

      <Box>
        <Typography sx={{ fontWeight: 900, fontSize: 20, lineHeight: 1.2 }}>
          {title}
        </Typography>
        <Typography
          sx={{
            mt: 0.8,
            color: "text.secondary",
            fontSize: 16,
            lineHeight: 1.7,
          }}
        >
          {desc}
        </Typography>
      </Box>
    </Stack>
  );
}
