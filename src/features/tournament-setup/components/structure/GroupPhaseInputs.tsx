import { Box, TextField, Typography } from "@mui/material";
import styles from "./StructureTab.module.css";

type GroupPhaseInputsProps = {
  groupCount?: number;
  teamsPerGroup?: number;
  qualifiedPerGroup?: number;
  selectedTargetTeamsForStructure: number;
  selectedCategoryTeamsCount: number;
  hasInsufficientCapacity: boolean;
  remainingCapacity: number;
  onFieldChange: (
    field: "groupCount" | "teamsPerGroup" | "qualifiedPerGroup",
    value: number,
  ) => void;
};

export function GroupPhaseInputs({
  groupCount,
  teamsPerGroup,
  qualifiedPerGroup,
  selectedTargetTeamsForStructure,
  selectedCategoryTeamsCount,
  hasInsufficientCapacity,
  remainingCapacity,
  onFieldChange,
}: GroupPhaseInputsProps) {
  return (
    <>
      <Typography className={styles.subsectionTitle}>Group Phase Inputs</Typography>
      <Box className={styles.groupInputs} sx={{ p: 1.5 }}>
        <TextField
          label="Number of groups"
          type="number"
          value={groupCount ?? ""}
          onChange={(e) =>
            onFieldChange("groupCount", Math.max(1, Number(e.target.value || 0)))
          }
          fullWidth
        />
        <TextField
          label="Teams per group (min 2)"
          type="number"
          value={teamsPerGroup ?? ""}
          onChange={(e) =>
            onFieldChange(
              "teamsPerGroup",
              Math.max(2, Number(e.target.value || 0)),
            )
          }
          fullWidth
        />
        <TextField
          label="Qualified per group"
          type="number"
          value={qualifiedPerGroup ?? ""}
          onChange={(e) =>
            onFieldChange(
              "qualifiedPerGroup",
              Math.max(1, Number(e.target.value || 0)),
            )
          }
          fullWidth
        />
      </Box>
      <Typography className={styles.caption} variant="caption">
        {/* Capacity validation message temporarily disabled. */}
        {/* Capacity: {selectedTargetTeamsForStructure} team slots for {selectedCategoryTeamsCount} registered teams.
        {hasInsufficientCapacity
          ? ` Add ${Math.abs(remainingCapacity)} more slot${Math.abs(remainingCapacity) === 1 ? "" : "s"} to continue.`
          : remainingCapacity > 0
            ? ` ${remainingCapacity} slot${remainingCapacity === 1 ? "" : "s"} remaining.`
            : " Capacity is exactly full."} */}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        className={styles.secondaryCaption}
      >
        Groups and bracket will be prepared in the Groups & Brackets tab.
      </Typography>
    </>
  );
}
