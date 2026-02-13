import * as React from "react";
import {
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import InboxIcon from "@mui/icons-material/MoveToInbox";
import MailIcon from "@mui/icons-material/Mail";
import { useLocation, useNavigate } from "react-router-dom";

const drawerWidth = 260;

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
    icon: <InboxIcon />,
    match: "exact",
  },
  {
    label: "Tournaments",
    to: "/tournaments",
    icon: <InboxIcon />,
    match: "prefix",
  },
  {
    label: "Classes",
    to: "/classes",
    icon: <InboxIcon />,
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
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <CssBaseline />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box
          sx={{
            mx: "auto",
            maxWidth: 1400,
            minHeight: "calc(100vh - 48px)",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <AppBar
            position="static"
            color="inherit"
            elevation={0}
            sx={{
              bgcolor: "background.paper",
              color: "text.primary",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Toolbar sx={{ gap: 1 }}>
              <IconButton onClick={() => setOpen((v) => !v)} edge="start">
                <MenuIcon />
              </IconButton>

              <Typography variant="h3" sx={{ flexGrow: 1 }}>
                <a onClick={() => navigate("./dashboard")}>Dashboard</a>
              </Typography>
            </Toolbar>
          </AppBar>

          {/* ✅ Body row: Drawer + Main */}
          <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
            {/* ✅ Drawer stays inside shell */}
            <Drawer
              variant="persistent"
              open={open}
              sx={{
                width: open ? drawerWidth : 0,
                flexShrink: 0,

                "& .MuiDrawer-paper": {
                  width: drawerWidth,
                  boxSizing: "border-box",

                  // ✅ KEY: keep it in-flow (not fixed to viewport)
                  position: "relative",
                  height: "100%",

                  bgcolor: "background.paper",
                  borderRight: "1px solid",
                  borderColor: "divider",
                  borderRadius: 0, // important inside rounded shell
                },
              }}
            >
              {/* Drawer header area */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  px: 1,
                  py: 1,
                }}
              >
                <IconButton onClick={() => setOpen(false)}>
                  <ChevronLeftIcon />
                </IconButton>
              </Box>

              <Divider />

              {/* Main nav */}
              <List sx={{ px: 1 }}>
                {navItems.map((item) => {
                  const active = isActive(item);

                  return (
                    <ListItem key={item.to} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        selected={active}
                        onClick={() => navigate(item.to)}
                        sx={{
                          borderRadius: 2,
                          px: 1.5,
                          "&.Mui-selected": {
                            backgroundColor: "rgba(34, 197, 94, 0.12)",
                            color: "primary.main",
                            "& .MuiListItemIcon-root": {
                              color: "primary.main",
                            },
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
                        <ListItemText primary={item.label} />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>

              <Box sx={{ flexGrow: 1 }} />

              <Divider />

              {/* Footer nav */}
              <List sx={{ px: 1, py: 1 }}>
                <ListItem disablePadding>
                  <ListItemButton sx={{ borderRadius: 2, px: 1.5, py: 1 }}>
                    <ListItemIcon
                      sx={{ minWidth: 36, color: "text.secondary" }}
                    >
                      <MailIcon />
                    </ListItemIcon>
                    <ListItemText primary="Settings" />
                  </ListItemButton>
                </ListItem>
              </List>
            </Drawer>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
