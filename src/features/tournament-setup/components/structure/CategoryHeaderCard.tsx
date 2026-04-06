import { Box, Typography } from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import styles from "./StructureTab.module.css";

type CategoryHeaderCardProps = {
  level: string;
  displayName: string;
};

export function CategoryHeaderCard({ level, displayName }: CategoryHeaderCardProps) {
  return (
    <Box className={styles.categoryMeta}>
      <Typography className={styles.categoryLevel}>{level}</Typography>
      <Box className={styles.categoryHeader}>
        <Box className={styles.categoryIconBox}>
          <EmojiEventsRoundedIcon className={styles.categoryIcon} />
        </Box>
        <Typography className={styles.categoryTitle}>{displayName}</Typography>
      </Box>
    </Box>
  );
}
