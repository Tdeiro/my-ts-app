import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import TournamentPhaseBuilder, {
  type BuilderBracketMatch,
} from "../../Components/Shared/TournamentPhaseBuilder";
import type { GroupBucket } from "../../Utils/tournamentPlanner";
import type { StructureMode } from "./types";

type EntryOption = {
  value: string;
  label: string;
};

type GroupsTabProps = {
  selectedCategoryLevel: string;
  selectedCategoryDisplayName: string;
  structureMode: StructureMode | "";
  groups: GroupBucket[];
  bracketMatches: BuilderBracketMatch[];
  groupCount: number;
  teamsPerGroup: number;
  qualifiersPerGroup: number;
  entryLabel: string;
  availableEntries: EntryOption[];
  resolveEntryLabel: (value: string) => string;
  onGroupsChange: (nextGroups: GroupBucket[]) => void;
  onGroupCountChange: (count: number) => void;
  onBracketChange: (nextMatches: BuilderBracketMatch[]) => void;
  onBackToStructure: () => void;
  onNextToSchedule: () => void;
};

export function GroupsTab({
  selectedCategoryLevel,
  selectedCategoryDisplayName,
  structureMode,
  groups,
  bracketMatches,
  groupCount,
  teamsPerGroup,
  qualifiersPerGroup,
  entryLabel,
  availableEntries,
  resolveEntryLabel,
  onGroupsChange,
  onGroupCountChange,
  onBracketChange,
  onBackToStructure,
  onNextToSchedule,
}: GroupsTabProps) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ mb: 2 }}>
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
            1. Assign teams to groups manually or use random draw.
          </Typography>
          <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
            2. Review group distribution and bracket pairings.
          </Typography>
          <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
            3. Save updates and go back to adjust earlier steps if needed.
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "#6B7280", mt: 0.75 }}>
            {structureMode ? `Structure: ${structureMode}` : "Structure not selected yet"}
          </Typography>
        </Box>
        <TournamentPhaseBuilder
          groups={groups}
          bracketMatches={bracketMatches}
          groupCount={groupCount}
          teamsPerGroup={teamsPerGroup}
          qualifiersPerGroup={qualifiersPerGroup}
          entryLabel={entryLabel}
          availableEntries={availableEntries}
          resolveEntryLabel={resolveEntryLabel}
          structureMode={structureMode}
          onGroupsChange={onGroupsChange}
          onGroupCountChange={onGroupCountChange}
          onBracketChange={onBracketChange}
        />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            pt: 1,
          }}
        >
          <Button variant="outlined" onClick={onBackToStructure} sx={{ borderRadius: "10px" }}>
            Back: Structure
          </Button>
          <Button variant="contained" onClick={onNextToSchedule} sx={{ borderRadius: "10px" }}>
            Next: Schedule
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
