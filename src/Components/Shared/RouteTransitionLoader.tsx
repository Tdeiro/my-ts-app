import * as React from "react";
import { Backdrop, Box, CircularProgress } from "@mui/material";
import { useLocation } from "react-router-dom";

const MIN_LOADER_MS = 1000;

type RouteTransitionLoaderProps = {
  scope?: "viewport" | "content";
};

export default function RouteTransitionLoader({
  scope = "viewport",
}: RouteTransitionLoaderProps) {
  const location = useLocation();
  const firstRenderRef = React.useRef(true);
  const prevPathRef = React.useRef<string>(location.pathname);
  const timerRef = React.useRef<number | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      prevPathRef.current = location.pathname;
      return;
    }

    // Only trigger on actual page changes, not query/hash tweaks.
    if (prevPathRef.current === location.pathname) {
      return;
    }
    prevPathRef.current = location.pathname;

    setOpen(true);

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = window.setTimeout(() => {
      setOpen(false);
      timerRef.current = null;
    }, MIN_LOADER_MS);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [location.pathname]);

  const spinnerBody = <CircularProgress size={26} thickness={4.8} sx={{ color: "primary.main" }} />;

  if (scope === "content") {
    return (
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: (theme) => theme.zIndex.modal + 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.paper",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 180ms ease, visibility 180ms ease",
        }}
      >
        {spinnerBody}
      </Box>
    );
  }

  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 10,
        bgcolor: "background.paper",
      }}
    >
      {spinnerBody}
    </Backdrop>
  );
}
