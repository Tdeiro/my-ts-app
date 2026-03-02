import { Chip } from "@mui/material";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";

export default function MockDataFlag({ label = "Mock Data" }: { label?: string }) {
  return (
    <Chip
      size="small"
      icon={<ScienceRoundedIcon />}
      label={label}
      sx={{
        bgcolor: "rgba(245, 158, 11, 0.12)",
        color: "warning.dark",
        fontWeight: 700,
      }}
    />
  );
}
