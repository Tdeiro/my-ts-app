import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",

    background: {
      default: "#F8FAFC",
      paper: "#FFFFFF",
    },

    text: {
      primary: "#18192B",   // logo navy
      secondary: "#64748B",
    },

    primary: {
      main: "#A855F8",      // logo purple
      dark: "#943AC8",      // deeper purple
      light: "#D8B4FE",     // soft lilac for hovers / chips
      contrastText: "#FFFFFF",
    },

    secondary: {
      main: "#F66E67",      // coral dot
      dark: "#E85A54",
      light: "#FFB4AE",
      contrastText: "#18192B",
    },

    divider: "rgba(24, 25, 43, 0.08)", // based on logo navy
  },

  shape: { borderRadius: 12 },

  typography: {
    fontFamily: [
      "Inter",
      "system-ui",
      "-apple-system",
      "Segoe UI",
      "Roboto",
      "Helvetica",
      "Arial",
      "sans-serif",
    ].join(","),
    h1: { fontSize: "2rem", fontWeight: 700 },
    h2: { fontSize: "1.5rem", fontWeight: 700 },
    h3: { fontSize: "1.25rem", fontWeight: 650 },
    body1: { fontSize: "0.95rem", lineHeight: 1.55 },
    body2: { fontSize: "0.875rem", lineHeight: 1.5 },
    button: { textTransform: "none", fontWeight: 600 },
  },

  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(24, 25, 43, 0.08)",
          boxShadow: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(24, 25, 43, 0.08)",
          boxShadow: "none",
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12 },

        // tasteful “Canva-ish” gradient only on contained buttons
        containedPrimary: {
          backgroundImage: "linear-gradient(135deg, #BD2AF7 0%, #A855F8 55%, #943AC8 100%)",
          color: "#FFFFFF",
          "&:hover": {
            filter: "brightness(0.97)",
          },
        },

        contained: {
          "&:hover": {
            filter: "brightness(0.97)",
          },
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: "1px solid rgba(24, 25, 43, 0.08)",
          backgroundColor: "#FFFFFF",
          color: "#18192B",
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
      },
    },
  },
});
