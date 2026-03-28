import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
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
  formatTournamentLevelLabel,
} from "../../utils/addEventHelpers";

export type PreviewStepProps = {
  form: TournamentForm;
  signupCategories: TournamentCategoryForm[];
  categoryPricingRule: CategoryPricingRule;
  whenText: string;
  feeText: string;
  createdTournamentId: number | null;
  inviteLink: string;
  canUseNativeShare: boolean;
  handleGenerateInviteLink: () => void;
  handleCopyInviteLink: () => void | Promise<void>;
  handleShareInviteLink: () => void | Promise<void>;
};

export default function PreviewStep({
  form,
  signupCategories,
  categoryPricingRule,
  whenText,
  feeText,
  createdTournamentId,
  inviteLink,
  canUseNativeShare,
  handleGenerateInviteLink,
  handleCopyInviteLink,
  handleShareInviteLink,
}: PreviewStepProps) {
  // Step 3: preview summary + invite link tools.
  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack spacing={4}>
          {/* Header */}
          <Box>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: "0.875rem",
                color: "#6A7282",
                mb: 2,
                textTransform: "uppercase",
                letterSpacing: "0.2px",
              }}
            >
              Tournament Preview
            </Typography>

            {/* Tournament Name */}
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                fontSize: "2.25rem",
                color: "#0A0A0A",
                mb: 2,
              }}
            >
              {form.name || "Untitled Tournament"}
            </Typography>

            {/* Chips Row */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={form.sport}
                sx={{
                  bgcolor: "#F3E8FF",
                  color: "#8200DB",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  border: "none",
                  height: 32,
                  borderRadius: "999px",
                  px: 0.5,
                }}
              />
              <Chip
                size="small"
                label={formatTournamentLevelLabel(form.level)}
                sx={{
                  bgcolor: "#F3F4F6",
                  color: "#364153",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  border: "none",
                  height: 32,
                  borderRadius: "999px",
                  px: 0.5,
                }}
              />
              <Chip
                size="small"
                label={form.tournamentStage}
                sx={{
                  bgcolor: "#DCFCE7",
                  color: "#008236",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  border: "none",
                  height: 32,
                  borderRadius: "999px",
                  px: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.2px",
                }}
              />
              <Chip
                size="small"
                label={form.isPublic ? "Public" : "Private"}
                sx={{
                  bgcolor: form.isPublic ? "#DBEAFE" : "#FEF2F2",
                  color: form.isPublic ? "#1447E6" : "#DC2626",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  border: "none",
                  height: 32,
                  borderRadius: "999px",
                  px: 0.5,
                }}
              />
            </Stack>
          </Box>

          {/* Location */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              pb: 2,
              borderBottom: "1px solid #E5E7EB",
            }}
          >
            <Box
              sx={{
                width: 20,
                height: 20,
                color: "#9810FA",
                mt: 0.25,
              }}
            >
              📍
            </Box>
            <Box>
              <Typography
                sx={{
                  fontWeight: 500,
                  fontSize: "1rem",
                  color: "#364153",
                  mb: 0.25,
                }}
              >
                {form.locationName || "Venue not set"}
              </Typography>
              <Typography sx={{ fontSize: "0.875rem", color: "#6A7282" }}>
                {form.address || "Address not set"}
              </Typography>
            </Box>
          </Stack>

          {/* Tournament Details Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
              },
              gap: 3,
            }}
          >
            {/* When */}
            <Stack direction="row" spacing={1.5}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "10px",
                  bgcolor: "#F3E8FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Box sx={{ fontSize: "1.25rem" }}>🗓️</Box>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "1.125rem",
                    color: "#101828",
                    mb: 0.5,
                  }}
                >
                  When
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.875rem",
                    color: "#364153",
                    wordBreak: "break-word",
                  }}
                >
                  {whenText}
                </Typography>
              </Box>
            </Stack>

            {/* Registration */}
            <Stack direction="row" spacing={1.5}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "10px",
                  bgcolor: "#F3E8FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Box sx={{ fontSize: "1.25rem" }}>⏰</Box>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "1.125rem",
                    color: "#101828",
                    mb: 0.5,
                  }}
                >
                  Registration
                </Typography>
                <Typography
                  sx={{ fontSize: "0.875rem", color: "#6A7282" }}
                >
                  Deadline: {form.registrationDeadline || "—"}
                </Typography>
              </Box>
            </Stack>

            {/* Capacity */}
            <Stack direction="row" spacing={1.5}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "10px",
                  bgcolor: "#F3E8FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Box sx={{ fontSize: "1.25rem" }}>👥</Box>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "1.125rem",
                    color: "#101828",
                    mb: 0.5,
                  }}
                >
                  Capacity
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.875rem",
                    color: "#364153",
                    mb: 0.25,
                  }}
                >
                  {form.capacity} players
                </Typography>
                <Typography sx={{ fontSize: "0.875rem", color: "#6A7282" }}>
                  Waitlist {form.allowWaitlist ? "enabled" : "disabled"}
                </Typography>
              </Box>
            </Stack>

            {/* Category Total */}
            <Stack direction="row" spacing={1.5}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "10px",
                  bgcolor: "#F3E8FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Box sx={{ fontSize: "1.25rem" }}>💰</Box>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "1.125rem",
                    color: "#101828",
                    mb: 0.5,
                  }}
                >
                  Category Base Total
                </Typography>
                <Typography sx={{ fontSize: "0.875rem", color: "#364153" }}>
                  {feeText}
                </Typography>
                {categoryPricingRule.enabled ? (
                  <Typography
                    sx={{ fontSize: "0.8125rem", color: "#6A7282", mt: 0.25 }}
                  >
                    Special price per category (2+ categories):{" "}
                    {categoryPricingRule.currency}{" "}
                    {categoryPricingRule.specialPricePerCategory}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          </Box>

          {/* Categories Section */}
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "10px",
                  bgcolor: "#F3E8FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Box sx={{ fontSize: "1.25rem" }}>🏆</Box>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "1.125rem",
                    color: "#101828",
                    mb: 0.5,
                  }}
                >
                  Categories
                </Typography>
                <Typography sx={{ fontSize: "0.875rem", color: "#364153" }}>
                  {signupCategories.length} signup option
                  {signupCategories.length === 1 ? "" : "s"}
                </Typography>
              </Box>
            </Stack>

            {/* Category Cards Grid */}
            {signupCategories.length > 0 && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                  },
                  gap: 2,
                }}
              >
                {signupCategories.map((category, index) => {
                  const getGenderColor = (gender: string) => {
                    if (gender === "Men") {
                      return {
                        bg: "linear-gradient(169.355deg, #FAF5FF 0%, #F3E8FF 100%)",
                        border: "#E9D4FF",
                        textColor: "#59168B",
                        badgeBg: "#9810FA",
                        metaColor: "#8200DB",
                      };
                    } else if (gender === "Women") {
                      return {
                        bg: "linear-gradient(169.355deg, #FDF2F8 0%, #FCE7F3 100%)",
                        border: "#FCCEE8",
                        textColor: "#861043",
                        badgeBg: "#E60076",
                        metaColor: "#C6005C",
                      };
                    } else {
                      return {
                        bg: "linear-gradient(169.355deg, #EFF6FF 0%, #DBEAFE 100%)",
                        border: "#BEDBFF",
                        textColor: "#1C398E",
                        badgeBg: "#155DFC",
                        metaColor: "#1447E6",
                      };
                    }
                  };

                  const colors = getGenderColor(category.gender);

                  return (
                    <Box
                      key={index}
                      sx={{
                        p: 2,
                        borderRadius: "10px",
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <Stack spacing={1}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography
                            sx={{
                              fontWeight: 600,
                              fontSize: "0.875rem",
                              color: colors.textColor,
                            }}
                          >
                            {category.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={category.gender}
                            sx={{
                              bgcolor: colors.badgeBg,
                              color: "#FFFFFF",
                              fontWeight: 400,
                              fontSize: "0.75rem",
                              height: 20,
                              borderRadius: "999px",
                              "& .MuiChip-label": {
                                px: 1,
                                py: 0.25,
                              },
                            }}
                          />
                        </Stack>
                        <Typography
                          sx={{
                            fontSize: "0.75rem",
                            color: colors.metaColor,
                          }}
                        >
                          {formatCategoryLevelLabel(category.level)} •{" "}
                          {formatCategoryFormatLabel(category.format)} •{" "}
                          {categoryPricingRule.currency}{" "}
                          {Number(category.price || 0)}
                        </Typography>
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Description */}
          {form.description && (
            <Box
              sx={{
                pt: 3,
                borderTop: "1px solid #E5E7EB",
              }}
            >
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: "1.125rem",
                  color: "#101828",
                  mb: 1,
                }}
              >
                Description
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  color: "#6A7282",
                  fontStyle: form.description ? "normal" : "italic",
                }}
              >
                {form.description || "Add a short description for players…"}
              </Typography>
            </Box>
          )}

          {/* Invite Link Section */}
          <Box
            sx={{
              pt: 3,
              borderTop: "1px solid #E5E7EB",
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "10px",
                  bgcolor: "#F3E8FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Box sx={{ fontSize: "1.25rem" }}>🔗</Box>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "1.125rem",
                    color: "#101828",
                    mb: 0.5,
                  }}
                >
                  Invite Link
                </Typography>
                <Typography sx={{ fontSize: "0.875rem", color: "#6A7282" }}>
                  {createdTournamentId
                    ? "Create the tournament first, then generate a shareable invite link."
                    : "Create the tournament first, then generate a shareable invite link."}
                </Typography>
              </Box>
            </Stack>

            <Button
              variant="outlined"
              onClick={handleGenerateInviteLink}
              disabled={!createdTournamentId}
              sx={{
                borderRadius: "10px",
                border: "1px solid #9810FA",
                color: "#9810FA",
                fontWeight: 500,
                px: 3,
                py: 1.25,
                textTransform: "none",
                mb: 2,
                "&:hover": {
                  border: "1px solid #8200DB",
                  bgcolor: "#FAF5FF",
                },
                "&:disabled": {
                  border: "1px solid #D1D5DC",
                  color: "#9CA3AF",
                },
              }}
            >
              Generate Invite Link
            </Button>

            {inviteLink && (
              <Stack spacing={2}>
                <TextField
                  value={inviteLink}
                  size="small"
                  fullWidth
                  InputProps={{
                    readOnly: true,
                    sx: {
                      borderRadius: "10px",
                      bgcolor: "#F9FAFB",
                      fontFamily: "monospace",
                      fontSize: "0.875rem",
                    },
                  }}
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button
                    variant="contained"
                    onClick={handleCopyInviteLink}
                    sx={{
                      borderRadius: "10px",
                      background: "#9810FA",
                      fontWeight: 500,
                      px: 3,
                      py: 1.25,
                      textTransform: "none",
                      flex: 1,
                      "&:hover": {
                        background: "#8200DB",
                      },
                    }}
                  >
                    Copy Link
                  </Button>
                  {canUseNativeShare && (
                    <Button
                      variant="outlined"
                      onClick={handleShareInviteLink}
                      sx={{
                        borderRadius: "10px",
                        border: "1px solid #D1D5DC",
                        color: "#364153",
                        fontWeight: 500,
                        px: 3,
                        py: 1.25,
                        textTransform: "none",
                        flex: 1,
                        "&:hover": {
                          border: "1px solid #D1D5DC",
                          bgcolor: "#F9FAFB",
                        },
                      }}
                    >
                      Share
                    </Button>
                  )}
                </Stack>
              </Stack>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
