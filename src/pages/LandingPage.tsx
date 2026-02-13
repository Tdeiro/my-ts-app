import * as React from "react";
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";

export default function LandingPage() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {/* TOP NAV */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "transparent",
          borderBottom: "1px solid",
          borderColor: "divider",
          backdropFilter: "blur(10px)",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ minHeight: 76, px: { xs: 0, md: 1 } }}>
            {/* Logo */}
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: "999px",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                }}
              >
                M
              </Box>
              <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
                MatchFlow
              </Typography>
            </Stack>

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
          bgcolor: "background.default",
          pt: { xs: 6, md: 10 },
          pb: { xs: 0, md: 0 },
        }}
      >
        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.05fr 1fr" },
              gap: { xs: 4, md: 6 },
              alignItems: "center",
              pb: { xs: 6, md: 0 },
            }}
          >
            {/* Left copy */}
            <Box sx={{ pr: { md: 2 } }}>
              <Typography
                sx={{
                  fontWeight: 900,
                  letterSpacing: -1.2,
                  lineHeight: 1.05,
                  fontSize: { xs: "2.6rem", md: "3.6rem" },
                  color: "text.primary",
                }}
              >
                Powerful Platform
                <br />
                for Managing Activities
              </Typography>

              <Typography
                sx={{
                  mt: 2.2,
                  fontSize: { xs: "1.02rem", md: "1.12rem" },
                  lineHeight: 1.8,
                  color: "text.secondary",
                  maxWidth: 520,
                }}
              >
                Built for schools, clubs, coaches, and communities.
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mt: 3.5 }}>
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

            {/* Right “Laptop” mock with blobs behind */}
            <Box sx={{ position: "relative", minHeight: { xs: 320, md: 430 } }}>
              {/* Blobs */}
              <Box
                sx={{
                  position: "absolute",
                  right: { xs: "-18%", md: "-20%" },
                  top: { xs: "10%", md: "0%" },
                  width: { xs: 520, md: 820 },
                  height: { xs: 360, md: 540 },
                  background:
                    "radial-gradient(closest-side, rgba(34,197,94,0.10), transparent 70%)",
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
                    "radial-gradient(closest-side, rgba(34,197,94,0.07), transparent 72%)",
                  pointerEvents: "none",
                }}
              />

              {/* Laptop + shadow */}
              <Box sx={{ position: "relative", zIndex: 1 }}>
                {/* Screen */}
                <Paper
                  sx={{
                    borderRadius: 5,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow:
                      "0 22px 60px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.05)",
                    bgcolor: "background.paper",
                  }}
                >
                  {/* top chrome */}
                  <Box
                    sx={{
                      px: 2,
                      py: 1.2,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      bgcolor: "background.paper",
                    }}
                  >
                    <Stack direction="row" spacing={0.8} sx={{ mr: 1 }}>
                      <Box
                        sx={{
                          width: 9,
                          height: 9,
                          borderRadius: 99,
                          bgcolor: "rgba(15,23,42,0.16)",
                        }}
                      />
                      <Box
                        sx={{
                          width: 9,
                          height: 9,
                          borderRadius: 99,
                          bgcolor: "rgba(15,23,42,0.10)",
                        }}
                      />
                      <Box
                        sx={{
                          width: 9,
                          height: 9,
                          borderRadius: 99,
                          bgcolor: "rgba(15,23,42,0.06)",
                        }}
                      />
                    </Stack>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: 12,
                        color: "text.secondary",
                      }}
                    >
                      MatchFlow
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Stack
                      direction="row"
                      spacing={1.2}
                      alignItems="center"
                      sx={{ color: "text.secondary" }}
                    >
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: 99,
                          bgcolor: "rgba(15,23,42,0.08)",
                        }}
                      />
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: 99,
                          bgcolor: "rgba(15,23,42,0.08)",
                        }}
                      />
                      <Box
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: 99,
                          bgcolor: "rgba(34,197,94,0.18)",
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                    </Stack>
                  </Box>

                  {/* content */}
                  <Box sx={{ p: 2.2 }}>
                    <Typography sx={{ fontWeight: 900, mb: 1.4 }}>
                      Events Dashboard
                    </Typography>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1.25fr 1fr",
                        gap: 1.8,
                      }}
                    >
                      {/* left main card */}
                      <Paper sx={{ p: 1.8, borderRadius: 3 }}>
                        <Typography
                          sx={{
                            fontWeight: 800,
                            fontSize: 12,
                            color: "text.secondary",
                          }}
                        >
                          Upcoming
                        </Typography>

                        <Paper
                          sx={{
                            mt: 1.2,
                            p: 1.4,
                            borderRadius: 999,
                            display: "flex",
                            alignItems: "center",
                            gap: 1.3,
                          }}
                        >
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: 99,
                              bgcolor: "rgba(34,197,94,0.16)",
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              sx={{ fontWeight: 900, fontSize: 13 }}
                              noWrap
                            >
                              Community Session
                            </Typography>
                            <Typography
                              sx={{ fontSize: 12, color: "text.secondary" }}
                            >
                              In 2 days
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              px: 1.2,
                              py: 0.55,
                              borderRadius: 999,
                              bgcolor: "rgba(15,23,42,0.06)",
                              fontSize: 12,
                              color: "text.primary",
                            }}
                          >
                            Open
                          </Box>
                        </Paper>

                        {/* bottom stats */}
                        <Box
                          sx={{
                            mt: 1.6,
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 1.2,
                          }}
                        >
                          <Paper sx={{ p: 1.3, borderRadius: 3 }}>
                            <Typography
                              sx={{ fontSize: 12, color: "text.secondary" }}
                            >
                              Today’s Schedule
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="baseline"
                              sx={{ mt: 0.5 }}
                            >
                              <Typography
                                sx={{ fontWeight: 900, fontSize: 18 }}
                              >
                                3
                              </Typography>
                              <Typography
                                sx={{ fontSize: 12, color: "text.secondary" }}
                              >
                                sessions
                              </Typography>
                            </Stack>
                          </Paper>

                          <Paper sx={{ p: 1.3, borderRadius: 3 }}>
                            <Typography
                              sx={{ fontSize: 12, color: "text.secondary" }}
                            >
                              Active Competitions
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="baseline"
                              sx={{ mt: 0.5 }}
                            >
                              <Typography
                                sx={{ fontWeight: 900, fontSize: 18 }}
                              >
                                1
                              </Typography>
                              <Typography
                                sx={{ fontSize: 12, color: "text.secondary" }}
                              >
                                active
                              </Typography>
                            </Stack>
                          </Paper>
                        </Box>
                      </Paper>

                      {/* right side cards */}
                      <Stack spacing={1.6}>
                        <Paper sx={{ p: 1.6, borderRadius: 3 }}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Typography
                              sx={{
                                fontWeight: 800,
                                fontSize: 12,
                                color: "text.secondary",
                              }}
                            >
                              Teaching at 4pm
                            </Typography>
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: 99,
                                bgcolor: "rgba(15,23,42,0.10)",
                              }}
                            />
                          </Stack>

                          <Typography
                            sx={{ mt: 1.2, fontWeight: 900, fontSize: 18 }}
                          >
                            2
                          </Typography>
                          <Typography
                            sx={{ color: "text.secondary", fontSize: 12 }}
                          >
                            Sessions
                          </Typography>

                          <Divider sx={{ my: 1.2 }} />

                          <Typography sx={{ fontWeight: 800, fontSize: 12 }}>
                            17
                          </Typography>
                          <Typography
                            sx={{ color: "text.secondary", fontSize: 12 }}
                          >
                            New registrations
                          </Typography>
                        </Paper>

                        <Paper sx={{ p: 1.6, borderRadius: 3 }}>
                          <Typography sx={{ fontWeight: 900 }}>
                            Active Participants
                          </Typography>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="flex-end"
                            sx={{ mt: 1.1 }}
                          >
                            <Box>
                              <Typography
                                sx={{ fontWeight: 900, fontSize: 20 }}
                              >
                                72
                              </Typography>
                              <Typography
                                sx={{ fontSize: 12, color: "text.secondary" }}
                              >
                                Today’s check-ins
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                px: 1.2,
                                py: 0.6,
                                borderRadius: 999,
                                bgcolor: "rgba(34,197,94,0.14)",
                                color: "primary.dark",
                                fontWeight: 800,
                                fontSize: 12,
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              Up 9%
                            </Box>
                          </Stack>
                        </Paper>
                      </Stack>
                    </Box>
                  </Box>
                </Paper>

                {/* “Laptop base” */}
                <Box
                  sx={{
                    height: 18,
                    width: "92%",
                    mx: "auto",
                    mt: 1.2,
                    borderRadius: "0 0 28px 28px",
                    bgcolor: "rgba(15,23,42,0.06)",
                    filter: "blur(0px)",
                  }}
                />
                <Box
                  sx={{
                    height: 16,
                    width: "74%",
                    mx: "auto",
                    mt: -0.6,
                    borderRadius: "0 0 22px 22px",
                    bgcolor: "rgba(15,23,42,0.04)",
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Container>

        {/* soft bottom fade like the screenshot */}
        <Box
          sx={{
            mt: { xs: 4, md: 6 },
            height: { xs: 120, md: 140 },
            background:
              "linear-gradient(to bottom, rgba(248,250,252,0) 0%, rgba(248,250,252,1) 70%)",
          }}
        />
      </Box>

      {/* CENTER TAGLINE */}
      <Container maxWidth="lg">
        <Typography
          sx={{
            textAlign: "center",
            color: "text.primary",
            fontSize: { xs: "1.2rem", md: "1.6rem" },
            fontWeight: 500,
            mt: { xs: 2, md: 0 },
            mb: { xs: 3, md: 4 },
          }}
        >
          Built for schools, clubs, coaches, and communities.
        </Typography>

        {/* FEATURES */}
        <Box
          id="features"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
            gap: { xs: 3, md: 5 },
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
            © {new Date().getFullYear()} MatchFlow. All rights reserved.
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
