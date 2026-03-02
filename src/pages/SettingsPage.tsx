import { Box, Card, CardContent, FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import { UI_FEATURE_FLAGS } from "../config/featureFlags";
import MockDataFlag from "../Components/Shared/MockDataFlag";

export default function SettingsPage() {
  return (
    <Box sx={{ maxWidth: 960, mx: "auto", p: { xs: 0.5, md: 0 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.25} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Personal preferences and UI behavior.
          </Typography>
        </Box>
        <MockDataFlag label="Settings are local-only" />
      </Stack>

      <Card sx={{ borderRadius: 2.5 }}>
        <CardContent>
          <Stack spacing={1.5}>
            <FormControlLabel
              control={<Switch checked={UI_FEATURE_FLAGS.enableMockData} disabled />}
              label="Enable mock data for non-integrated pages"
            />
            <Typography variant="body2" color="text.secondary">
              This switch is controlled via `VITE_ENABLE_UI_MOCKS` in your environment.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

