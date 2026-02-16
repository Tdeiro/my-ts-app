import { Box, Button } from "@mui/material";
import SelectActionCard from "../Components/Shared/SelectActionCard";
import WeeklyScheduleCard from "../Components/Shared/WeeklyScheduleCard";
import { useNavigate } from "react-router";
import { getToken } from "../auth/tokens";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate("/tournaments/new");
  };

  function parseJwt(token: string) {
    return JSON.parse(atob(token.split(".")[1]));
  }
  const token = getToken();
  const user = token ? parseJwt(token) : null;

  console.log("Logged user:", user);

  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        minWidth: 0,
        bgcolor: "background.default",
        p: { xs: 2, md: 3 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Box
        style={{
          display: "flex",
          minWidth: "100%",
          justifyContent: "flex-end",
        }}
      >
        <Button
          sx={{
            minWidth: 200,
            margin: 1,
            backgroundColor: "background.primary",
            color: "white",
          }}
          variant="contained"
          size="large"
          // fullWidth
          onClick={handleRedirect}
        >
          Create Event
        </Button>
      </Box>
      <Box
        sx={{
          maxWidth: 1100,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <SelectActionCard />
          <WeeklyScheduleCard />
        </Box>
      </Box>
    </Box>
  );
}
