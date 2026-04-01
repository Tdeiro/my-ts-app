import { createTheme } from "@mui/material/styles";
import { designTokens } from "./designTokens";

export const theme = createTheme({
  palette: {
    mode: "light",

    background: {
      default: designTokens.gray[50],
      paper: "#FFFFFF",
    },

    text: {
      primary: designTokens.gray[900],
      secondary: designTokens.gray[500],
      disabled: designTokens.gray[400],
    },

    primary: {
      main: designTokens.purple[600],
      dark: designTokens.purple[700],
      light: designTokens.purple[400],
      contrastText: "#FFFFFF",
    },

    secondary: {
      main: designTokens.pink[500],
      dark: designTokens.pink[600],
      light: designTokens.pink[400],
      contrastText: "#FFFFFF",
    },

    error: {
      main: designTokens.red[500],
      dark: designTokens.red[600],
      light: designTokens.red[400],
      contrastText: "#FFFFFF",
    },

    warning: {
      main: designTokens.orange[500],
      dark: designTokens.orange[600],
      light: "#FB923C",
      contrastText: "#431407",
    },

    info: {
      main: designTokens.blue[500],
      dark: designTokens.blue[600],
      light: designTokens.blue[400],
      contrastText: "#FFFFFF",
    },

    success: {
      main: designTokens.green[500],
      dark: designTokens.green[600],
      light: designTokens.green[400],
      contrastText: "#052E16",
    },

    divider: designTokens.gray[200],
  },

  shape: {
    borderRadius: 12,
  },

  typography: {
    fontFamily: [
      "Manrope",
      "Inter",
      "system-ui",
      "-apple-system",
      "Segoe UI",
      "Roboto",
      "Helvetica Neue",
      "Arial",
      "sans-serif",
    ].join(","),

    h1: {
      fontSize: "3rem",
      fontWeight: 700,
      lineHeight: 1.2,
      color: designTokens.gray[900],
    },
    h2: {
      fontSize: "1.875rem",
      fontWeight: 700,
      lineHeight: 1.3,
      color: designTokens.gray[900],
    },
    h3: {
      fontSize: "1.5rem",
      fontWeight: 700,
      lineHeight: 1.4,
      color: designTokens.gray[900],
    },
    h4: {
      fontSize: "1.25rem",
      fontWeight: 600,
      lineHeight: 1.4,
      color: designTokens.gray[900],
    },
    h5: {
      fontSize: "1.125rem",
      fontWeight: 600,
      lineHeight: 1.5,
      color: designTokens.gray[900],
    },
    h6: {
      fontSize: "1rem",
      fontWeight: 600,
      lineHeight: 1.5,
      color: designTokens.gray[900],
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.5,
      color: designTokens.gray[700],
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
      color: designTokens.gray[500],
    },
    subtitle1: {
      fontSize: "1rem",
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: "0.875rem",
      fontWeight: 500,
      lineHeight: 1.5,
    },
    caption: {
      fontSize: "0.75rem",
      lineHeight: 1.5,
      color: designTokens.gray[400],
    },
    overline: {
      fontSize: "0.75rem",
      fontWeight: 600,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      lineHeight: 1.5,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
      fontSize: "0.875rem",
      letterSpacing: "0.01em",
    },
  },

  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: `1px solid ${designTokens.gray[100]}`,
          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
          transition: "box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        },
        elevation1: {
          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        },
        elevation2: {
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        },
        elevation3: {
          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${designTokens.gray[100]}`,
          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
          borderRadius: 16,
          transition:
            "box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1), transform 200ms cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
          },
        },
      },
    },

    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "10px 20px",
          fontSize: "0.875rem",
          fontWeight: 600,
          transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        },

        containedPrimary: {
          background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #EC4899 100%)",
          color: "#FFFFFF",
          boxShadow: "0 4px 6px -1px rgb(139 92 246 / 0.2)",
          "&:hover": {
            background: "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 50%, #DB2777 100%)",
            boxShadow: "0 10px 15px -3px rgb(139 92 246 / 0.3)",
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(0)",
          },
        },

        containedSecondary: {
          background: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)",
          color: "#FFFFFF",
          "&:hover": {
            background: "linear-gradient(135deg, #DB2777 0%, #EC4899 100%)",
          },
        },

        outlinedPrimary: {
          borderColor: designTokens.purple[600],
          color: designTokens.purple[600],
          borderWidth: "2px",
          "&:hover": {
            borderWidth: "2px",
            backgroundColor: designTokens.purple[50],
            borderColor: designTokens.purple[700],
          },
        },

        textPrimary: {
          color: designTokens.purple[600],
          "&:hover": {
            backgroundColor: designTokens.purple[50],
          },
        },

        sizeSmall: {
          padding: "6px 16px",
          fontSize: "0.8125rem",
        },
        sizeLarge: {
          padding: "12px 28px",
          fontSize: "0.9375rem",
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: `1px solid ${designTokens.gray[200]}`,
          backgroundColor: "#FFFFFF",
          color: designTokens.gray[900],
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 500,
          fontSize: "0.8125rem",
        },
        colorPrimary: {
          backgroundColor: designTokens.purple[100],
          color: designTokens.purple[700],
        },
        colorSecondary: {
          backgroundColor: designTokens.pink[100],
          color: designTokens.pink[700],
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            backgroundColor: "#FFFFFF",
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: designTokens.gray[300],
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: designTokens.purple[600],
              borderWidth: "2px",
            },
          },
        },
      },
    },

    MuiBadge: {
      styleOverrides: {
        colorPrimary: {
          background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
        },
        dot: {
          borderRadius: 4,
        },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 8,
          backgroundColor: designTokens.gray[200],
        },
        barColorPrimary: {
          background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
        },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "&.Mui-checked": {
            color: designTokens.purple[600],
            "& + .MuiSwitch-track": {
              backgroundColor: designTokens.purple[600],
              opacity: 0.5,
            },
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${designTokens.gray[200]}`,
        },
        indicator: {
          background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
          height: 3,
          borderRadius: "3px 3px 0 0",
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.875rem",
          minHeight: 48,
          color: designTokens.gray[500],
          "&.Mui-selected": {
            color: designTokens.purple[600],
          },
          "&:hover": {
            color: designTokens.purple[600],
            backgroundColor: designTokens.purple[50],
          },
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: "1px solid",
        },
        standardSuccess: {
          backgroundColor: designTokens.green[50],
          borderColor: designTokens.green[200],
          color: designTokens.green[700],
        },
        standardError: {
          backgroundColor: designTokens.red[50],
          borderColor: designTokens.red[200],
          color: designTokens.red[700],
        },
        standardWarning: {
          backgroundColor: designTokens.orange[50],
          borderColor: designTokens.orange[200],
          color: designTokens.orange[700],
        },
        standardInfo: {
          backgroundColor: designTokens.blue[50],
          borderColor: designTokens.blue[200],
          color: designTokens.blue[700],
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: designTokens.gray[800],
          fontSize: "0.75rem",
          borderRadius: 6,
          padding: "8px 12px",
        },
        arrow: {
          color: designTokens.gray[800],
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
          marginTop: 8,
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          margin: "4px 8px",
          padding: "8px 12px",
          fontSize: "0.875rem",
          "&:hover": {
            backgroundColor: designTokens.gray[100],
          },
          "&.Mui-selected": {
            backgroundColor: designTokens.purple[50],
            color: designTokens.purple[600],
            "&:hover": {
              backgroundColor: designTokens.purple[100],
            },
          },
        },
      },
    },
  },
});
