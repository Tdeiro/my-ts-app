import { useNavigate } from "react-router";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import Logo from "../assets/onora.png";

export default function LoginPage() {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate("/dashboard");
  };
  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "background.default",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Container maxWidth="sm">
        <Card>
          <CardContent sx={{ p: 4 }}>
            {/* Logo / App name */}
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
              <Typography color="text.secondary">Sign in with Onora</Typography>
            </Box>

            {/* Form */}
            <Box
              component="form"
              noValidate
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                label="Email address"
                type="email"
                fullWidth
                autoComplete="email"
              />

              <TextField
                label="Password"
                type="password"
                fullWidth
                autoComplete="current-password"
              />

              <Box sx={{ textAlign: "right" }}>
                <Button variant="text" size="small">
                  Forgot password?
                </Button>
              </Box>

              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                onClick={handleRedirect}
              >
                Sign In
              </Button>

              <Divider sx={{ my: 2 }}></Divider>
            </Box>

            {/* Footer */}
            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Don’t have an account?{" "}
                <Button
                  variant="text"
                  size="small"
                  onClick={() => navigate("/signup")}
                >
                  Sign up
                </Button>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
