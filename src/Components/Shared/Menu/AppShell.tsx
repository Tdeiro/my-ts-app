import * as React from "react";
import {
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/DashboardRounded";
import EmojiEventsIcon from "@mui/icons-material/EmojiEventsRounded";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonthRounded";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../../../assets/onora.png";

const drawerWidth = 272;

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  match?: "exact" | "prefix";
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: <DashboardIcon />,
    match: "exact",
  },
  {
    label: "Tournaments",
    to: "/tournaments",
    icon: <EmojiEventsIcon />,
    match: "prefix",
  },
  {
    label: "Classes",
    to: "/classes",
    icon: <CalendarMonthIcon />,
    match: "prefix",
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (item: NavItem) => {
    if (item.match === "exact") return location.pathname === item.to;
    return (
      location.pathname === item.to ||
      location.pathname.startsWith(item.to + "/")
    );
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        // subtle brand wash (premium SaaS vibe)
        background:
          "linear-gradient(180deg, #FAF7FF 0%, #F7F7FB 55%, #F7F7FB 100%)",
      }}
    >
      <CssBaseline />

      <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
        <Box
          sx={{
            mx: "auto",
            maxWidth: 1440,
            minHeight: "calc(100vh - 40px)",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top App Bar */}
          <AppBar
            position="static"
            color="inherit"
            elevation={0}
            sx={{
              bgcolor: "#FAF7FF",
              borderBottom: "1px solid rgba(139, 92, 246, 0.12)",
              color: "text.primary",
            }}
          >
            <Toolbar
              disableGutters
              sx={{
                px: 2,
                gap: 1,
                minHeight: 64,
                "@media (min-width:600px)": { minHeight: 64 },
                alignItems: "center",
              }}
            >
              <Tooltip title={open ? "Collapse menu" : "Expand menu"} arrow>
                <IconButton
                  onClick={() => setOpen((v) => !v)}
                  edge="start"
                  sx={{
                    mr: 0.5,
                    borderRadius: 2,
                    "&:hover": { bgcolor: "rgba(139, 92, 246, 0.08)" },
                  }}
                >
                  <MenuIcon />
                </IconButton>
              </Tooltip>

              <Box
                onClick={() => navigate("/dashboard")}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  userSelect: "none",
                  // keep logo left-aligned and clean
                }}
              >
                <Box
                  component="img"
                  src={Logo}
                  alt="Onora logo"
                  sx={{ height: 36, width: "auto", display: "block" }}
                />
              </Box>

              <Box sx={{ flexGrow: 1 }} />

              {/* Optional: tiny coral "status dot" (ties to logo dot) */}
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "secondary.main",
                  opacity: 0.9,
                }}
              />
            </Toolbar>
          </AppBar>

          {/* Body row */}
          <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
            {/* Sidebar */}
            <Drawer
              variant="persistent"
              open={open}
              sx={{
                width: open ? drawerWidth : 0,
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                  width: drawerWidth,
                  boxSizing: "border-box",
                  position: "relative",
                  height: "100%",
                  bgcolor: "#FFFFFF",
                  borderRight: "1px solid rgba(139, 92, 246, 0.10)",
                },
              }}
            >
              {/* Sidebar header (tight + aligned) */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 1.25,
                  py: 1.25,
                  bgcolor: "#FFFFFF",
                }}
              >
                <Box sx={{ fontSize: 12, color: "text.secondary", pl: 1 }}>
                  Menu
                </Box>

                <Tooltip title="Collapse" arrow>
                  <IconButton
                    onClick={() => setOpen(false)}
                    sx={{
                      borderRadius: 2,
                      "&:hover": { bgcolor: "rgba(139, 92, 246, 0.08)" },
                    }}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              <Divider />

              {/* Nav */}
              <List sx={{ px: 1, py: 1 }}>
                {navItems.map((item) => {
                  const active = isActive(item);

                  return (
                    <ListItem key={item.to} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        selected={active}
                        onClick={() => navigate(item.to)}
                        sx={{
                          borderRadius: 2,
                          px: 1.25,
                          py: 1.05,
                          position: "relative",
                          gap: 0.75,

                          "&:hover": {
                            bgcolor: "rgba(139, 92, 246, 0.06)",
                          },

                          "&.Mui-selected": {
                            bgcolor: "rgba(139, 92, 246, 0.08)",
                            "&:hover": { bgcolor: "rgba(139, 92, 246, 0.10)" },

                            // strong identity: left rail
                            "&::before": {
                              content: '""',
                              position: "absolute",
                              left: 6,
                              top: 8,
                              bottom: 8,
                              width: 3,
                              borderRadius: 999,
                              background:
                                "linear-gradient(180deg, #8B5CF6 0%, #A855F7 100%)",
                            },

                            "& .MuiListItemIcon-root": {
                              color: "primary.main",
                            },
                            "& .MuiListItemText-primary": { fontWeight: 700 },
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 38,
                            color: active ? "primary.main" : "text.secondary",
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: 14,
                            fontWeight: active ? 700 : 600,
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>

              <Box sx={{ flexGrow: 1 }} />

              <Divider />

              {/* Footer */}
              <List sx={{ px: 1, py: 1 }}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => navigate("/settings")}
                    sx={{
                      borderRadius: 2,
                      px: 1.25,
                      py: 1.05,
                      "&:hover": { bgcolor: "rgba(139, 92, 246, 0.06)" },
                    }}
                  >
                    <ListItemIcon
                      sx={{ minWidth: 38, color: "text.secondary" }}
                    >
                      <SettingsIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Settings"
                      primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                    />
                  </ListItemButton>
                </ListItem>
              </List>
            </Drawer>

            {/* Main content */}
            <Box
              component="main"
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                bgcolor: "transparent",
                // consistent page padding
                p: { xs: 2, md: 3 },
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
