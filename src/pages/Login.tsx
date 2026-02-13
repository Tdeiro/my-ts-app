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

export default function Login() {
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
              <Typography variant="h2">MatchFlow</Typography>
              <Typography color="text.secondary">
                Welcome back. Please sign in to continue.
              </Typography>
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

              <Divider sx={{ my: 2 }}>or</Divider>

              <Button
                variant="outlined"
                fullWidth
                startIcon={
                  <img
                    src="/google.svg"
                    alt="Google"
                    style={{ width: 18, height: 18 }}
                  />
                }
              >
                Sign in with Google
              </Button>
            </Box>

            {/* Footer */}
            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Don’t have an account?{" "}
                <Button variant="text" size="small">
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
