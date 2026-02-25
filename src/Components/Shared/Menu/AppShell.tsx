import * as React from "react";
import {
  Avatar,
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
  Stack,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/DashboardRounded";
import EmojiEventsIcon from "@mui/icons-material/EmojiEventsRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonthRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../../../assets/onora.png";
import { clearToken, getLoggedInRole, getToken, hasCreatorAccess } from "../../../auth/tokens";

const drawerWidth = 272;

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  match?: "exact" | "prefix";
};

const baseNavItems: NavItem[] = [
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
    label: "Upcoming Events",
    to: "/events/upcoming",
    icon: <EventAvailableRoundedIcon />,
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
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const role = getLoggedInRole();
  const canManageTeams = hasCreatorAccess(role);
  const navItems = React.useMemo(
    () =>
      canManageTeams
        ? [
            ...baseNavItems,
            {
              label: "Teams",
              to: "/teams",
              icon: <GroupsRoundedIcon />,
              match: "prefix" as const,
            },
          ]
        : baseNavItems,
    [canManageTeams],
  );
  const userName = React.useMemo(() => {
    const token = getToken();
    if (!token) return "User";
    try {
      const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
      const fullName = String(payload?.fullName ?? "").trim();
      if (fullName) return fullName;
      const email = String(payload?.email ?? "").trim();
      if (email.includes("@")) return email.split("@")[0];
      return "User";
    } catch {
      return "User";
    }
  }, []);

  const handleLogout = () => {
    setMenuAnchor(null);
    clearToken();
    navigate("/login", { replace: true });
  };

  const isActive = (item: NavItem) => {
    if (item.match === "exact") return location.pathname === item.to;
    return (
      location.pathname === item.to ||
      location.pathname.startsWith(item.to + "/")
    );
  };

  const handleToggleMenu = () => {
    if (isMobile) {
      setMobileOpen((v) => !v);
      return;
    }
    setOpen((v) => !v);
  };

  const handleNavigate = (to: string) => {
    navigate(to);
    if (isMobile) setMobileOpen(false);
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

      <Box sx={{ p: { xs: 0, md: 2.5 } }}>
        <Box
          sx={{
            mx: "auto",
            maxWidth: isMobile ? "100%" : open ? 1440 : 1720,
            minHeight: { xs: "100vh", md: "calc(100vh - 40px)" },
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: { xs: 0, md: 2 },
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
                px: { xs: 1.25, sm: 2 },
                gap: 1,
                minHeight: 64,
                "@media (min-width:600px)": { minHeight: 64 },
                alignItems: "center",
              }}
            >
              <Tooltip
                title={
                  isMobile
                    ? mobileOpen
                      ? "Close menu"
                      : "Open menu"
                    : open
                      ? "Collapse menu"
                      : "Expand menu"
                }
                arrow
              >
                <IconButton
                  onClick={handleToggleMenu}
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

              <TextField
                size="small"
                placeholder="Search classes, tournaments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{
                  display: { xs: "none", sm: "block" },
                  minWidth: { xs: 150, sm: 260, md: 320 },
                  maxWidth: 380,
                  mr: 1,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "rgba(255,255,255,0.75)",
                    borderRadius: 999,
                  },
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <SearchRoundedIcon
                        fontSize="small"
                        style={{ marginRight: 8, opacity: 0.6 }}
                      />
                    ),
                  },
                }}
              />

              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box
                  role="button"
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1,
                    py: 0.5,
                    borderRadius: 999,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "rgba(139,92,246,0.08)" },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: "rgba(139, 92, 246, 0.18)",
                      color: "primary.main",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {userName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography
                    variant="body2"
                    sx={{
                      display: { xs: "none", sm: "block" },
                      fontWeight: 700,
                      maxWidth: 160,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={userName}
                  >
                    {userName}
                  </Typography>
                  <KeyboardArrowDownRoundedIcon fontSize="small" />
                </Box>
              </Stack>

              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem onClick={handleLogout}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LogoutRoundedIcon fontSize="small" />
                    <span>Logout</span>
                  </Stack>
                </MenuItem>
              </Menu>
            </Toolbar>
          </AppBar>

          {/* Body row */}
          <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
            {/* Sidebar */}
            <Drawer
              variant={isMobile ? "temporary" : "persistent"}
              open={isMobile ? mobileOpen : open}
              onClose={() => setMobileOpen(false)}
              sx={{
                width: isMobile ? 0 : open ? drawerWidth : 0,
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                  width: { xs: "86vw", sm: 320, md: drawerWidth },
                  boxSizing: "border-box",
                  position: isMobile ? "fixed" : "relative",
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
                    onClick={() => (isMobile ? setMobileOpen(false) : setOpen(false))}
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
                        onClick={() => handleNavigate(item.to)}
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
                    onClick={() => handleNavigate("/settings")}
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
                p: { xs: 1.5, md: 3 },
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
