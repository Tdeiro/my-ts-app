import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import type {
  CategoryPricingRule,
  TournamentCategoryForm,
  TournamentForm,
} from "../../types/addEventTypes";
import {
  formatCategoryFormatLabel,
  formatCategoryLevelLabel,
  newCategory,
} from "../../utils/addEventHelpers";

export type CategoriesStepProps = {
  form: TournamentForm;
  savedCategories: TournamentCategoryForm[];
  categoryPricingRule: CategoryPricingRule;
  setCategoryPricingRule: React.Dispatch<React.SetStateAction<CategoryPricingRule>>;
  setDraftCategory: React.Dispatch<React.SetStateAction<TournamentCategoryForm>>;
  setDraftFormats: React.Dispatch<React.SetStateAction<TournamentCategoryForm["format"][]>>;
  setDraftGenders: React.Dispatch<React.SetStateAction<TournamentCategoryForm["gender"][]>>;
  setEditingCategoryId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsCategoryModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editCategory: (id: string) => void;
  removeCategory: (id: string) => void;
  deletingCategoryIds: string[];
};

export default function CategoriesStep({
  form,
  savedCategories,
  categoryPricingRule,
  setCategoryPricingRule,
  setDraftCategory,
  setDraftFormats,
  setDraftGenders,
  setEditingCategoryId,
  setIsCategoryModalOpen,
  editCategory,
  removeCategory,
  deletingCategoryIds,
}: CategoriesStepProps) {
  // Step 2: manage category list + pricing rules.
  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                fontSize: "1.5rem",
                color: "#111827",
                mb: 0.5,
              }}
            >
              Categories
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "#6B7280", fontSize: "0.9375rem" }}
            >
              Add categories and pricing for each one. You can create as many
              combinations as needed.
            </Typography>
          </Box>

          <Alert
            severity="info"
            sx={{
              borderRadius: 2,
              border: "1px solid #BFDBFE",
              bgcolor: "#EFF6FF",
            }}
          >
            Category pricing rules are persisted. If enabled, special price is
            applied per category when a player subscribes to 2+ categories.
          </Alert>

          <Card
            sx={{
              borderRadius: 2,
              border: "1px solid #E9D5FF",
              background:
                "linear-gradient(135deg, #FAF5FF 0%, #FDF2F8 100%)",
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack spacing={0.5}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "#111827",
                  }}
                >
                  {form.name || "Untitled Tournament"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "#6B7280", fontSize: "0.875rem" }}
                >
                  {form.sport} • {form.startDate || "TBD"}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card
            sx={{
              borderRadius: 3,
              border: "1px solid #E5E7EB",
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 700,
                      fontSize: "1.5rem",
                      color: "#111827",
                    }}
                  >
                    Categories List
                  </Typography>
                  <Stack direction="row" spacing={1.5} useFlexGap>
                    <Chip
                      size="small"
                      label={`${savedCategories.length} categor${savedCategories.length === 1 ? "y" : "ies"}`}
                      sx={{
                        bgcolor: "#F9FAFB",
                        color: "#6B7280",
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        border: "1px solid #E5E7EB",
                      }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setDraftCategory(newCategory());
                        setDraftFormats([]);
                        setDraftGenders(["Men"]);
                        setEditingCategoryId(null);
                        setIsCategoryModalOpen(true);
                      }}
                      sx={{
                        borderRadius: 2,
                        borderColor: "#8B5CF6",
                        color: "#8B5CF6",
                        fontWeight: 600,
                        textTransform: "none",
                        "&:hover": { borderColor: "#7C3AED", bgcolor: "#FAF5FF" },
                      }}
                    >
                      Add Category
                    </Button>
                  </Stack>
                </Stack>

                <TableContainer
                  sx={{
                    border: "1px solid #E5E7EB",
                    borderRadius: 2,
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#F9FAFB" }}>
                        <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.875rem" }}>
                          Category
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.875rem" }}>
                          Gender
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.875rem" }}>
                          Level
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.875rem" }}>
                          Format
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.875rem" }}>
                          Price
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: "#374151", fontSize: "0.875rem" }}>
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {savedCategories.length > 0 ? (
                        savedCategories.map((category) => (
                          <TableRow key={category.id} hover sx={{ "&:hover": { bgcolor: "#F9FAFB" } }}>
                            <TableCell sx={{ fontWeight: 600, color: "#111827" }}>
                              {category.name.trim()}
                            </TableCell>
                            <TableCell sx={{ color: "#6B7280" }}>{category.gender}</TableCell>
                            <TableCell sx={{ color: "#6B7280" }}>
                              {formatCategoryLevelLabel(category.level)}
                            </TableCell>
                            <TableCell sx={{ color: "#6B7280" }}>
                              {formatCategoryFormatLabel(category.format)}
                            </TableCell>
                            <TableCell sx={{ color: "#6B7280" }}>
                              {categoryPricingRule.currency} {Number(category.price || 0)}
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button
                                  size="small"
                                  onClick={() => editCategory(category.id)}
                                  sx={{
                                    borderRadius: 1.5,
                                    color: "#8B5CF6",
                                    fontWeight: 600,
                                    textTransform: "none",
                                    px: 2,
                                    "&:hover": { bgcolor: "#F3E8FF" },
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="small"
                                  onClick={() => void removeCategory(category.id)}
                                  disabled={deletingCategoryIds.includes(category.id)}
                                  sx={{
                                    borderRadius: 1.5,
                                    color: "#DC2626",
                                    fontWeight: 600,
                                    textTransform: "none",
                                    px: 2,
                                    "&:hover": { bgcolor: "#FEF2F2" },
                                    "&:disabled": { color: "#9CA3AF" },
                                  }}
                                >
                                  {deletingCategoryIds.includes(category.id) ? "Deleting..." : "Remove"}
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
                            <Stack spacing={1.5} alignItems="center">
                              <Typography variant="body2" sx={{ color: "#6B7280", fontSize: "0.9375rem" }}>
                                You currently don&apos;t have any category.
                              </Typography>
                              <Button
                                variant="contained"
                                onClick={() => {
                                  setDraftCategory(newCategory());
                                  setDraftFormats([]);
                                  setDraftGenders(["Men"]);
                                  setEditingCategoryId(null);
                                  setIsCategoryModalOpen(true);
                                }}
                                sx={{
                                  borderRadius: 2,
                                  background:
                                    "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                                  fontWeight: 600,
                                  textTransform: "none",
                                }}
                              >
                                Add Category
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            </CardContent>
          </Card>

          <Card
            sx={{
              borderRadius: 3,
              border: "1px solid #E5E7EB",
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography sx={{ fontWeight: 700, fontSize: "1.125rem", color: "#111827" }}>
                  Category Pricing Rules
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      label="Currency"
                      value={categoryPricingRule.currency}
                      onChange={(e) =>
                        setCategoryPricingRule((prev) => ({
                          ...prev,
                          currency: e.target.value as CategoryPricingRule["currency"],
                        }))
                      }
                    >
                      <MenuItem value="AUD">AUD</MenuItem>
                      <MenuItem value="USD">USD</MenuItem>
                      <MenuItem value="EUR">EUR</MenuItem>
                      <MenuItem value="BRL">BRL</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel
                    sx={{ m: 0, px: 1 }}
                    control={
                      <Switch
                        checked={categoryPricingRule.enabled}
                        onChange={(_, checked) =>
                          setCategoryPricingRule((prev) => ({
                            ...prev,
                            enabled: checked,
                          }))
                        }
                      />
                    }
                    label="Special price for 2+ categories"
                  />
                </Stack>

                {categoryPricingRule.enabled ? (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Applies when player registers at least"
                      value="2 categories"
                      InputProps={{ readOnly: true }}
                      fullWidth
                    />
                    <TextField
                      label="Price per category"
                      type="number"
                      value={categoryPricingRule.specialPricePerCategory}
                      onChange={(e) =>
                        setCategoryPricingRule((prev) => ({
                          ...prev,
                          specialPricePerCategory: Math.max(
                            0,
                            Number(e.target.value || 0),
                          ),
                        }))
                      }
                      fullWidth
                    />
                  </Stack>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </CardContent>
    </Card>
  );
}
