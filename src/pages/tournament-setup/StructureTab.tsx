import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import type { CategorySetupConfig, StructureMode } from "./types";

type StructureOption = {
  id: StructureMode | "";
  title: string;
  subtitle: string;
};

type StructureTabProps = {
  selectedCategoryLevel: string;
  selectedCategoryDisplayName: string;
  selectedCategoryTeamsCount: number;
  selectedTargetTeamsForStructure: number;
  selectedConfig?: CategorySetupConfig;
  structureOptions: StructureOption[];
  hasGroupStructureConfig: boolean;
  canSaveSelectedCategorySetup: boolean;
  onStructureModeChange: (mode: StructureMode | "") => void;
  onGroupCountChange: (value: number) => void;
  onTeamsPerGroupChange: (value: number) => void;
  onQualifiedPerGroupChange: (value: number) => void;
  onBackToTeams: () => void;
  onNextToGroups: () => void;
};

export function StructureTab({
  selectedCategoryLevel,
  selectedCategoryDisplayName,
  selectedCategoryTeamsCount,
  selectedTargetTeamsForStructure,
  selectedConfig,
  structureOptions,
  hasGroupStructureConfig,
  canSaveSelectedCategorySetup,
  onStructureModeChange,
  onGroupCountChange,
  onTeamsPerGroupChange,
  onQualifiedPerGroupChange,
  onBackToTeams,
  onNextToGroups,
}: StructureTabProps) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "#6A7282",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              mb: 1,
            }}
          >
            {selectedCategoryLevel}
          </Typography>
          <Box
            sx={{
              p: 1.5,
              borderRadius: "14px",
              border: "1.5px solid #8B5CF6",
              bgcolor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "10px",
                bgcolor: "#FFEDD4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <EmojiEventsRoundedIcon sx={{ fontSize: 24, color: "#F54900" }} />
            </Box>
            <Typography
              sx={{
                fontSize: "1.6rem",
                fontWeight: 700,
                color: "#101828",
                lineHeight: 1.2,
              }}
            >
              {selectedCategoryDisplayName}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: "10px",
            bgcolor: "#F9FAFB",
            border: "1px solid #E5E7EB",
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              color: "#101828",
              fontSize: "0.95rem",
              mb: 0.5,
            }}
          >
            Instructions
          </Typography>
          <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
            1. Confirm teams for this category.
          </Typography>
          <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
            2. Pick the structure and set group inputs if needed.
          </Typography>
          <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
            3. Continue to Groups & Brackets.
          </Typography>
        </Box>

        <Box
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: "10px",
            bgcolor: "#F9FAFB",
            border: "1px solid #E5E7EB",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Typography sx={{ fontWeight: 700, color: "#101828", fontSize: "0.9rem" }}>
              Teams available for this category
            </Typography>
            <Chip
              size="small"
              label={`${selectedCategoryTeamsCount} team${selectedCategoryTeamsCount === 1 ? "" : "s"}`}
              sx={{ fontWeight: 700 }}
            />
          </Stack>
          {selectedTargetTeamsForStructure > 0 ? (
            <Typography sx={{ color: "#4A5565", fontSize: "0.8125rem", mt: 0.75 }}>
              Current structure needs about {selectedTargetTeamsForStructure} teams
              ({selectedConfig?.groupCount ?? 0} groups x {selectedConfig?.teamsPerGroup ?? 0} teams/group).
            </Typography>
          ) : null}
        </Box>

        <Typography variant="body1" sx={{ fontWeight: 900, mb: 1 }}>
          Structure
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Configure structure for the selected category.
        </Typography>

        <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
          Structure
        </Typography>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.25}
          useFlexGap
          flexWrap="wrap"
        >
          {structureOptions.map((opt) => {
            const isSelected = selectedConfig?.structureMode === opt.id;
            return (
              <Card
                key={opt.id}
                onClick={() => onStructureModeChange(opt.id)}
                sx={{
                  cursor: "pointer",
                  width: { xs: "100%", md: "calc(50% - 5px)" },
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: isSelected
                    ? "rgba(139,92,246,0.45)"
                    : "rgba(15,23,42,0.10)",
                  bgcolor: isSelected
                    ? "rgba(139,92,246,0.08)"
                    : "background.paper",
                }}
              >
                <CardContent sx={{ p: 1.5 }}>
                  <Typography sx={{ fontWeight: 800 }}>{opt.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {opt.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Stack>

        {selectedConfig?.structureMode === "groups_knockout" ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
              Group Phase Inputs
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
              <TextField
                label="Number of groups"
                type="number"
                value={selectedConfig.groupCount ?? ""}
                onChange={(e) => onGroupCountChange(Number(e.target.value || 0))}
                fullWidth
              />
              <TextField
                label="Teams per group (min 4)"
                type="number"
                value={selectedConfig.teamsPerGroup ?? ""}
                onChange={(e) => onTeamsPerGroupChange(Number(e.target.value || 0))}
                fullWidth
              />
              <TextField
                label="Qualified per group"
                type="number"
                value={selectedConfig.qualifiedPerGroup ?? ""}
                onChange={(e) => onQualifiedPerGroupChange(Number(e.target.value || 0))}
                fullWidth
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Groups and bracket will be auto-generated when you click Next: Groups & Brackets.
            </Typography>
          </>
        ) : null}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          justifyContent="space-between"
          sx={{ mt: 2 }}
        >
          <Button variant="outlined" onClick={onBackToTeams} sx={{ borderRadius: 999 }}>
            Back: Teams
          </Button>
          <Button
            variant="contained"
            onClick={onNextToGroups}
            disabled={!canSaveSelectedCategorySetup || (selectedConfig?.structureMode === "groups_knockout" && !hasGroupStructureConfig)}
            sx={{ borderRadius: 999 }}
          >
            Next: Groups & Brackets
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
