import { Box, Typography } from "@mui/material";
import styles from "./StructureTab.module.css";

export function InstructionsCard() {
  return (
    <Box className={styles.cardSection} sx={{ p: 1.5 }}>
      <Typography className={styles.sectionHeading}>Instructions</Typography>
      <Typography className={styles.sectionText}>
        1. Confirm teams for this category.
      </Typography>
      <Typography className={styles.sectionText}>
        2. Pick the structure and set group inputs if needed.
      </Typography>
      <Typography className={styles.sectionText}>
        3. Continue to Groups & Brackets.
      </Typography>
    </Box>
  );
}
