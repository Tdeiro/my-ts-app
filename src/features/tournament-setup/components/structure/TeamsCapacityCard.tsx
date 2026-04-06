import { Box, Chip, Stack, Typography } from "@mui/material";
import styles from "./StructureTab.module.css";

type TeamsCapacityCardProps = {
  teamsCount: number;
  selectedTargetTeamsForStructure: number;
  groupCount?: number;
  teamsPerGroup?: number;
};

export function TeamsCapacityCard({
  teamsCount,
  selectedTargetTeamsForStructure,
  groupCount,
  teamsPerGroup,
}: TeamsCapacityCardProps) {
  return (
    <Box className={styles.cardSection} sx={{ p: 1.5 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        className={styles.teamsHeader}
      >
        <Typography className={styles.sectionHeading}>
          Teams available for this category
        </Typography>
        <Chip
          size="small"
          label={`${teamsCount} team${teamsCount === 1 ? "" : "s"}`}
          className={styles.teamsCountChip}
        />
      </Stack>
      {selectedTargetTeamsForStructure > 0 ? (
        <Typography className={styles.capacityNote}>
          Current structure needs about {selectedTargetTeamsForStructure} teams
          ({groupCount ?? 0} groups x {teamsPerGroup ?? 0} teams/group).
        </Typography>
      ) : null}
    </Box>
  );
}
