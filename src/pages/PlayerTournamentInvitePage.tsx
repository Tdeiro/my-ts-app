import * as React from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../shared/api/client";
import { getLoggedInUserId } from "../features/auth/services/tokens";
import type {
  Category,
  DashboardApiResp,
  DashboardEventDto,
  EventDetailsCategoryDto,
  EventDetailsDto,
  InviteUiModel,
  SelectedCategory,
  SubscribeMePayload,
  UserScopedEventDto,
} from "../features/tournaments/types/inviteTypes";

const UPCOMING_SUBSCRIBED_EVENTS_KEY = "upcoming.subscribedEventIds";

function parseInviteTournamentId(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function getErrorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string[]; error?: string } } })
      ?.response?.data?.message?.[0] ||
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
    fallback
  );
}

function isSubscribedLikeStatus(value?: string): boolean {
  const status = String(value ?? "").trim().toUpperCase();
  return ["REGISTERED", "SUBSCRIBED", "CONFIRMED", "ACTIVE", "APPROVED"].includes(status);
}

function forgetSubscribedEvent(eventId: number) {
  try {
    const raw = window.localStorage.getItem(UPCOMING_SUBSCRIBED_EVENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(parsed)
      ? parsed.filter((item) => Number(item) !== Number(eventId))
      : [];
    window.localStorage.setItem(
      UPCOMING_SUBSCRIBED_EVENTS_KEY,
      JSON.stringify(next),
    );
  } catch {
    // Ignore storage errors.
  }
}

function extractDashboardEvents(
  events: DashboardApiResp["events"],
): DashboardEventDto[] {
  if (!Array.isArray(events)) return [];
  return events
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      if ("event" in item) return item.event ?? null;
      return item as DashboardEventDto;
    })
    .filter((event): event is DashboardEventDto => Boolean(event));
}

function normalizeGender(value?: string): "Men" | "Women" | "Mixed" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("women") || normalized.includes("female")) return "Women";
  if (normalized.includes("men") || normalized.includes("male")) return "Men";
  return "Mixed";
}

function normalizeLevel(value?: string): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "Open";
  if (normalized === "all levels") return "Open";
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseFormatFromName(name?: string): "Singles" | "Doubles" | "Mixed" {
  const text = String(name ?? "").toLowerCase();
  if (text.includes("double")) return "Doubles";
  if (text.includes("single")) return "Singles";
  if (text.includes("mixed")) return "Mixed";
  return "Singles";
}

function formatDateRange(start?: string, end?: string): string {
  if (!start) return "Date TBD";
  if (!end || end === start) return start;
  return `${start} to ${end}`;
}

function categoryAgeLabel(category: Category): string {
  if (category.minAge && category.maxAge) return `${category.minAge}-${category.maxAge}`;
  if (category.minAge) return `${category.minAge}+`;
  if (category.maxAge) return `Up to ${category.maxAge}`;
  return "All ages";
}

function categorySubtitle(category: Category): string {
  if (category.format === "Mixed") return "Women and Men";
  return categoryAgeLabel(category);
}

function daysLeftLabel(deadline?: string): string {
  if (!deadline) return "N/A";
  const target = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(target.getTime())) return "N/A";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  return `${days} day${days === 1 ? "" : "s"} left`;
}

function mapEventToUi(event: EventDetailsDto): InviteUiModel {
  const currency = String(event.currency || "AUD").toUpperCase();
  const entryFee = Number(event.entryFee ?? 0);
  return {
    eventId: Number(event.id),
    name: String(event.name ?? "Tournament"),
    timezone: String(event.timezone ?? "Australia/Sydney"),
    location: String(event.locationName ?? "Location TBD"),
    address: String(event.address ?? "Address not provided"),
    dateLabel: formatDateRange(event.startDate, event.endDate),
    dateMeta: event.startDate && event.endDate && event.startDate !== event.endDate ? "Multiple days" : "Single Day",
    timeLabel: `${event.startTime ?? "-"}${event.endTime ? ` - ${event.endTime}` : ""}`,
    timeMeta: "Scheduled time",
    feeLabel: `${Number.isFinite(entryFee) ? entryFee : 0} ${currency}`,
    feeMeta: "per category",
    deadlineLabel: event.registrationDeadline || "Not set",
    deadlineMeta: "Registration deadline",
    stage: String(event.tournamentStage ?? "INVITE"),
    currency,
  };
}

function mapEventCategories(event: EventDetailsDto): Category[] {
  const fallbackFee = Number(event.entryFee ?? 0);
  const categories = Array.isArray(event.categories) ? event.categories : [];
  const deduped: Category[] = [];
  const seenMixedKeys = new Set<string>();

  categories.forEach((category) => {
    const price = Number(category.price);
    const format = parseFormatFromName(category.name);
    const gender = normalizeGender(category.gender);
    const level = normalizeLevel(category.level);
    const fee = Number.isFinite(price)
      ? Math.max(0, price)
      : Number.isFinite(fallbackFee)
        ? Math.max(0, fallbackFee)
        : 0;

    const mapped: Category = {
      id: String(category.id),
      name: String(category.name ?? `Category #${category.id}`),
      level,
      gender: format === "Mixed" ? "Mixed" : gender,
      format,
      tabLabel: level,
      optionLabel: format === "Mixed" ? "Mixed" : `${gender} ${format}`,
      selectionLabel: format === "Mixed" ? `${level} Mixed` : `${gender} ${level} ${format}`,
      minAge: typeof category.minAge === "number" ? String(category.minAge) : "",
      maxAge: typeof category.maxAge === "number" ? String(category.maxAge) : "",
      fee,
    };

    // Backend can return duplicated mixed variants by gender; keep a single mixed card per level.
    if (mapped.format === "Mixed") {
      const mixedKey = `${mapped.tabLabel}::${mapped.format}`;
      if (seenMixedKeys.has(mixedKey)) return;
      seenMixedKeys.add(mixedKey);
    }

    deduped.push(mapped);
  });

  return deduped;
}

function TournamentInviteContent({
  tournament,
  categories,
  readOnly,
  alreadyRegistered,
  initialSelectedCategories,
  onBack,
  onConfirm,
  onWithdraw,
  submitting,
  withdrawing,
}: {
  tournament: InviteUiModel;
  categories: Category[];
  readOnly: boolean;
  alreadyRegistered: boolean;
  initialSelectedCategories: SelectedCategory[];
  onBack: () => void;
  onConfirm: (selected: SelectedCategory[]) => void;
  onWithdraw: () => void;
  submitting: boolean;
  withdrawing: boolean;
}) {
  const availableTabs = React.useMemo<string[]>(() => {
    const set = new Set(categories.map((c) => c.tabLabel));
    const tabOrder = ["Beginner", "Intermediate", "Advanced", "Open"];
    const known = tabOrder.filter((item) => set.has(item));
    const unknown = Array.from(set).filter((item) => !tabOrder.includes(item)).sort();
    const ordered = [...known, ...unknown];
    return ordered.length > 0 ? ordered : ["Open"];
  }, [categories]);

  const [activeTab, setActiveTab] = React.useState<string>(() => availableTabs[0] ?? "Open");
  const [selectedCategories, setSelectedCategories] = React.useState<SelectedCategory[]>([]);
  const [expandedCategoryId, setExpandedCategoryId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!availableTabs.includes(activeTab)) setActiveTab(availableTabs[0]);
  }, [activeTab, availableTabs]);

  React.useEffect(() => {
    setSelectedCategories(initialSelectedCategories);
    setExpandedCategoryId(null);
  }, [initialSelectedCategories, tournament.eventId]);

  React.useEffect(() => {
    if (!readOnly || initialSelectedCategories.length === 0) return;
    const preferredTab = initialSelectedCategories[0]?.tabLabel;
    if (preferredTab && preferredTab !== activeTab) {
      setActiveTab(preferredTab);
    }
  }, [activeTab, initialSelectedCategories, readOnly]);

  const visibleCategories = categories.filter((c) => c.tabLabel === activeTab);
  const womenCategories = visibleCategories.filter((c) => c.gender === "Women" && c.format !== "Mixed");
  const menCategories = visibleCategories.filter((c) => c.gender === "Men" && c.format !== "Mixed");
  const mixedCategories = visibleCategories.filter((c) => c.format === "Mixed");

  const toggleCategory = (category: Category) => {
    const exists = selectedCategories.some((c) => c.id === category.id);
    if (exists) {
      setSelectedCategories((prev) => prev.filter((c) => c.id !== category.id));
      if (expandedCategoryId === category.id) setExpandedCategoryId(null);
      return;
    }
    setSelectedCategories((prev) => [
      ...prev,
      { ...category, partnerName: "", partnerNote: "" },
    ]);
    setExpandedCategoryId(category.id);
  };

  const updatePartner = (
    categoryId: string,
    field: "partnerName" | "partnerNote",
    value: string,
  ) => {
    setSelectedCategories((prev) =>
      prev.map((cat) => (cat.id === categoryId ? { ...cat, [field]: value } : cat)),
    );
  };

  const totalFee = selectedCategories.reduce((sum, cat) => sum + cat.fee, 0);

  const renderCategoryCard = (category: Category) => {
    const selected = selectedCategories.some((c) => c.id === category.id);

    return (
      <ButtonBase
        key={category.id}
        onClick={() => {
          if (readOnly) return;
          toggleCategory(category);
        }}
        sx={{ borderRadius: 1.5, textAlign: "left" }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",
            p: 1.75,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: selected ? "#9333EA" : "#D1D5DB",
            bgcolor: selected ? "#9333EA" : "#FFF",
            color: selected ? "#FFF" : "#111827",
            boxShadow: selected ? "0 8px 16px rgba(147, 51, 234, 0.3)" : "none",
            transition: "all 180ms ease",
          }}
        >
          {selected ? (
            <CheckCircleRoundedIcon sx={{ position: "absolute", top: -10, right: -10, color: "#22C55E", bgcolor: "#FFF", borderRadius: "50%" }} />
          ) : null}
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.25 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: selected ? "#FFFFFF" : "#111827" }}>{category.optionLabel}</Typography>
            <Stack direction="row" spacing={0.75}>
              {selected && readOnly ? (
                <Chip
                  size="small"
                  label="Selected"
                  sx={{
                    bgcolor: selected ? "rgba(255,255,255,0.22)" : "#DCFCE7",
                    color: selected ? "#FFF" : "#166534",
                    fontWeight: 800,
                  }}
                />
              ) : null}
              <Chip
                size="small"
                label={category.level}
                sx={{
                  bgcolor: selected ? "rgba(255,255,255,0.2)" : "#F3E8FF",
                  color: selected ? "#FFF" : "#6D28D9",
                  fontWeight: 700,
                }}
              />
            </Stack>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: 13, color: selected ? "rgba(255,255,255,0.85)" : "#6B7280" }}>
              {categorySubtitle(category)}
            </Typography>
            <Typography sx={{ fontSize: 17, fontWeight: 800, color: selected ? "#FFFFFF" : "#111827" }}>${category.fee}</Typography>
          </Stack>
        </Box>
      </ButtonBase>
    );
  };

  return (
    <Box sx={{ flex: 1, bgcolor: "#F3F4F6", overflow: "auto" }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 }, py: 3 }}>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={onBack}
          sx={{
            mb: 2.5,
            px: 2.5,
            py: 1,
            borderRadius: 1.5,
            color: "#FFF",
            fontWeight: 700,
            background: "linear-gradient(135deg, #7C3AED 0%, #A21CAF 100%)",
            "&:hover": { filter: "brightness(0.97)" },
          }}
        >
          Back to Tournaments
        </Button>

        <Card sx={{ borderRadius: 1.5, borderColor: "#D1D5DB", mb: 2.5, overflow: "hidden" }}>
          <Box sx={{ height: 6, background: "linear-gradient(90deg, #9333EA 0%, #EC4899 100%)" }} />
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2} sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    bgcolor: "#7C3AED",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AutoAwesomeOutlinedIcon sx={{ color: "#FFF", fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 24, fontWeight: 900, color: "#111827", lineHeight: 1.1 }}>
                    {tournament.name}
                  </Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1 }}>
                    {alreadyRegistered ? "Registration Confirmed" : "You&apos;re Invited!"}
                  </Typography>
                </Box>
              </Stack>
              <Typography sx={{ color: "#4B5563", fontSize: 18 }}>Compete. Connect. Challenge yourself.</Typography>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0,1fr))" },
                gap: 1.5,
                mb: 2,
              }}
            >
              {[
                { label: "Location", value: tournament.location, meta: tournament.address, icon: <LocationOnOutlinedIcon sx={{ fontSize: 16, color: "#9333EA" }} /> },
                { label: "Date", value: tournament.dateLabel, meta: tournament.dateMeta, icon: <CalendarMonthOutlinedIcon sx={{ fontSize: 16, color: "#9333EA" }} /> },
                { label: "Time", value: tournament.timeLabel, meta: tournament.timeMeta, icon: <AccessTimeOutlinedIcon sx={{ fontSize: 16, color: "#9333EA" }} /> },
                { label: "Entry Fee", value: tournament.feeLabel, meta: tournament.feeMeta, icon: <AttachMoneyOutlinedIcon sx={{ fontSize: 16, color: "#9333EA" }} /> },
              ].map((item) => (
                <Box key={item.label} sx={{ p: 1.5, border: "1px solid #D1D5DB", borderRadius: 1.5, bgcolor: "#F9FAFB" }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                    {item.icon}
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>
                      {item.label}
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{item.value}</Typography>
                  <Typography sx={{ fontSize: 12, color: "#6B7280" }}>{item.meta}</Typography>
                </Box>
              ))}
            </Box>

            {!alreadyRegistered ? (
              <Box sx={{ p: 1.75, borderRadius: 1.5, border: "1px solid #D8B4FE", bgcolor: "#F5F3FF" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: "#9333EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <AccessTimeOutlinedIcon sx={{ fontSize: 16, color: "#FFF" }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: "#111827", fontSize: 22 }}>
                        Registration Deadline
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: "#6B7280" }}>
                        {tournament.deadlineLabel} - Don&apos;t miss out!
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip label={daysLeftLabel(tournament.deadlineLabel)} sx={{ bgcolor: "#9333EA", color: "#FFF", fontWeight: 800 }} />
                </Stack>
              </Box>
            ) : null}
          </Box>
        </Card>

        <Card sx={{ borderRadius: 1.5, borderColor: "#D1D5DB", mb: 2.5 }}>
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {alreadyRegistered ? (
              <Alert
                icon={<CheckCircleRoundedIcon />}
                severity="success"
                sx={{ borderRadius: 1.5, bgcolor: "#ECFDF3", border: "1px solid #BBF7D0", color: "#166534" }}
              >
                <Typography sx={{ fontWeight: 800, mb: 0.25 }}>
                  You are already registered for this tournament.
                </Typography>
                <Typography sx={{ fontSize: 14 }}>
                  Your registration has already been submitted.
                </Typography>
              </Alert>
            ) : (
              <>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.75 }}>
                  <EmojiEventsOutlinedIcon sx={{ color: "#9333EA", fontSize: 30 }} />
                  <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>
                      Choose Your Categories
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: "#6B7280" }}>
                      Select the categories you want to join before confirming registration
                    </Typography>
                  </Box>
                </Stack>

                <Alert
                  icon={<EmojiEventsOutlinedIcon />}
                  severity="info"
                  sx={{ mb: 2.5, borderRadius: 1.5 }}
                >
                  You are not registered yet. Choose one or more categories, optionally add a partner, then confirm on the payment page.
                </Alert>

                <Stack spacing={2}>
                  <Tabs
                    value={availableTabs.includes(activeTab) ? activeTab : availableTabs[0]}
                    onChange={(_, value) => setActiveTab(value)}
                  >
                    {availableTabs.map((tab) => (
                      <Tab key={tab} value={tab} label={tab} sx={{ textTransform: "none", fontWeight: 700 }} />
                    ))}
                  </Tabs>

                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))" }, gap: 2 }}>
                    <Stack spacing={1.5}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>
                        Women
                      </Typography>
                      {womenCategories.length > 0 ? (
                        womenCategories.map(renderCategoryCard)
                      ) : (
                        <Box sx={{ p: 1.5, border: "1px dashed #D1D5DB", borderRadius: 1.25, bgcolor: "#F9FAFB" }}>
                          <Typography sx={{ fontSize: 13, color: "#6B7280" }}>Unavailable</Typography>
                        </Box>
                      )}
                    </Stack>
                    <Stack spacing={1.5}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>
                        Men
                      </Typography>
                      {menCategories.length > 0 ? (
                        menCategories.map(renderCategoryCard)
                      ) : (
                        <Box sx={{ p: 1.5, border: "1px dashed #D1D5DB", borderRadius: 1.25, bgcolor: "#F9FAFB" }}>
                          <Typography sx={{ fontSize: 13, color: "#6B7280" }}>Unavailable</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                  {mixedCategories.length > 0 ? (
                    <Stack spacing={1.5}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>
                        Mixed
                      </Typography>
                      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))" }, gap: 2 }}>
                        {mixedCategories.map(renderCategoryCard)}
                      </Box>
                    </Stack>
                  ) : null}
                </Stack>
              </>
            )}
          </Box>
        </Card>

        {!alreadyRegistered ? (
          <Card sx={{ borderRadius: 1.5, borderColor: "#D1D5DB", mb: 2.5 }}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.75 }}>
                <PeopleAltOutlinedIcon sx={{ color: "#9333EA", fontSize: 30 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>Your Selections</Typography>
                  <Typography sx={{ fontSize: 13, color: "#6B7280" }}>Add partner details (optional)</Typography>
                </Box>
                <Chip label={`${selectedCategories.length} Category`} sx={{ bgcolor: "#9333EA", color: "#FFF", fontWeight: 800 }} />
              </Stack>

              <Alert icon={<AutoAwesomeOutlinedIcon />} severity="info" sx={{ borderRadius: 1.5, mb: 2 }}>
                Partner information is optional. You can add it now or your coach can help you decide later.
              </Alert>

              {selectedCategories.length > 0 ? (
                <Stack spacing={1.5}>
                  {selectedCategories.map((category) => {
                    const expanded = expandedCategoryId === category.id;
                    return (
                      <Card key={category.id} sx={{ border: "1px solid #D1D5DB", borderRadius: 1.25 }}>
                        <ButtonBase sx={{ width: "100%", textAlign: "left" }} onClick={() => setExpandedCategoryId(expanded ? null : category.id)}>
                          <Box sx={{ width: "100%", p: 2, bgcolor: "#F9FAFB" }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Stack direction="row" spacing={1.25} alignItems="center">
                                <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: "#9333EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <EmojiEventsOutlinedIcon sx={{ color: "#FFF", fontSize: 18 }} />
                                </Box>
                                <Box>
                                  <Typography sx={{ fontWeight: 800 }}>{category.selectionLabel}</Typography>
                                  <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Fee: ${category.fee} {tournament.currency}</Typography>
                                </Box>
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center">
                                {category.partnerName ? <Chip label="Partner added" size="small" color="success" /> : null}
                                {expanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
                              </Stack>
                            </Stack>
                          </Box>
                        </ButtonBase>

                        <Collapse in={expanded && !readOnly} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, borderTop: "1px solid #E5E7EB" }}>
                            <Stack spacing={1.5}>
                              <TextField
                                label="Partner Name (Optional)"
                                value={category.partnerName}
                                onChange={(e) => updatePartner(category.id, "partnerName", e.target.value)}
                                fullWidth
                              />
                              <TextField
                                label="Partner Note (Optional)"
                                value={category.partnerNote}
                                onChange={(e) => updatePartner(category.id, "partnerNote", e.target.value)}
                                fullWidth
                              />
                            </Stack>
                          </Box>
                        </Collapse>
                      </Card>
                    );
                  })}
                </Stack>
              ) : (
                <Box sx={{ p: 2, border: "1px dashed #D1D5DB", borderRadius: 1.25 }}>
                  <Typography sx={{ fontSize: 14, color: "#6B7280" }}>
                    No category selected yet. Select one from the category list above.
                  </Typography>
                </Box>
              )}
            </Box>
          </Card>
        ) : null}

        <Card sx={{ borderRadius: 1.5, borderColor: "#D1D5DB" }}>
          <Box sx={{ p: { xs: 2, md: 3 }, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography sx={{ fontSize: 14, color: "#6B7280" }}>Total Amount Due</Typography>
              <Typography sx={{ fontSize: 42, fontWeight: 900, color: "#9333EA", lineHeight: 1.05 }}>${totalFee} {tournament.currency}</Typography>
              <Typography sx={{ fontSize: 13, color: "#6B7280" }}>
                {alreadyRegistered
                  ? "You are already registered for this tournament."
                  : selectedCategories.length > 0
                    ? "Confirm on the payment page to complete registration"
                    : "Select a category to continue"}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.25}>
              <Button variant="outlined" onClick={onBack}>Cancel</Button>
              {alreadyRegistered ? (
                <Button
                  variant="contained"
                  color="warning"
                  onClick={onWithdraw}
                  disabled={withdrawing}
                >
                  {withdrawing ? "Withdrawing..." : "Withdraw"}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  disabled={selectedCategories.length === 0 || readOnly || submitting}
                  onClick={() => onConfirm(selectedCategories)}
                >
                  {submitting ? "Confirming..." : "Confirm Registration"}
                </Button>
              )}
            </Stack>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}

export default function PlayerTournamentInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteTournamentId = parseInviteTournamentId(searchParams.get("inviteTournamentId"));
  const isReadOnlyView = searchParams.get("mode") === "view";
  const currentUserId = getLoggedInUserId();

  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [event, setEvent] = React.useState<EventDetailsDto | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = React.useState(false);
  const [withdrawing, setWithdrawing] = React.useState(false);

  React.useEffect(() => {
    if (!inviteTournamentId) return;

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [eventRes, dashboardRes, eventsRes] = await Promise.all([
          api.get<EventDetailsDto>(`/events/${inviteTournamentId}`),
          api.get<DashboardApiResp>("/dashboard").catch(() => null),
          api
            .get<UserScopedEventDto[] | { data?: UserScopedEventDto[] }>("/events")
            .catch(() => null),
        ]);
        if (cancelled) return;

        setEvent(eventRes.data);

        const dashboardEvents = extractDashboardEvents(dashboardRes?.data?.events);
        const userScopedEvents = Array.isArray(eventsRes?.data)
          ? eventsRes.data
          : Array.isArray(eventsRes?.data?.data)
            ? eventsRes.data.data
            : [];
        const fromDashboard = dashboardEvents.some((item) => {
          const matchesId = String(item?.id ?? "") === String(inviteTournamentId);
          const isTournament = String(item?.eventType ?? "").toUpperCase() === "TOURNAMENT";
          if (!matchesId || !isTournament) return false;
          return (
            isSubscribedLikeStatus(item?.subscriptionStatus) ||
            isSubscribedLikeStatus(item?.status)
          );
        });
        const fromUserScopedEvents = userScopedEvents.some((item) => {
          const matchesId = String(item?.id ?? "") === String(inviteTournamentId);
          const isTournament = String(item?.eventType ?? "").toUpperCase() === "TOURNAMENT";
          return matchesId && isTournament;
        });

        const optimisticRegistered = fromDashboard || fromUserScopedEvents;
        const registered = optimisticRegistered;
        setAlreadyRegistered(registered);
        if (registered) {
          setSuccess("You are already registered for this tournament.");
        } else {
          setSuccess(null);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(getErrorMessage(err, "Could not load tournament details."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, inviteTournamentId, isReadOnlyView]);

  const handleConfirm = async (selected: SelectedCategory[]) => {
    if (!inviteTournamentId) return;
    if (alreadyRegistered) {
      navigate(
        `/tournaments/invite?inviteTournamentId=${encodeURIComponent(
          String(inviteTournamentId),
        )}&mode=view`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: SubscribeMePayload = {
        eventId: inviteTournamentId,
        categories: selected.map((category) => ({
          id: Number(category.id),
          suggestedPlayer: category.partnerName.trim() || undefined,
          note: category.partnerNote.trim() || undefined,
        })),
      };

      const totalAmount = selected.reduce((sum, item) => sum + Number(item.fee || 0), 0);
      navigate("/tournaments/payment", {
        state: {
          eventId: inviteTournamentId,
          tournamentName: event?.name || "Tournament",
          currency: String(event?.currency || "AUD").toUpperCase(),
          totalAmount,
          selectedCategoryNames: selected.map((c) => c.name),
          subscriptionPayload: payload,
        },
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not confirm registration."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!inviteTournamentId) return;
    setWithdrawing(true);
    setError(null);
    try {
      await api.patch(`/events/${inviteTournamentId}/subscriptions/me/withdraw`);
      forgetSubscribedEvent(inviteTournamentId);
      setAlreadyRegistered(false);
      setSuccess("You have withdrawn from this tournament.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not withdraw from this tournament."));
    } finally {
      setWithdrawing(false);
    }
  };

  const inviteUi = event ? mapEventToUi(event) : null;
  const categories = event ? mapEventCategories(event) : [];
  const initialSelectedCategories: SelectedCategory[] = React.useMemo(() => {
    if (!alreadyRegistered) return [];
    return [];
  }, [alreadyRegistered]);

  if (!inviteTournamentId) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Invalid invite link. Missing or invalid <code>inviteTournamentId</code>.
        </Alert>
        <Button variant="contained" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>Loading invite details...</Alert>
        <CircularProgress size={20} />
      </Container>
    );
  }

  if (!event) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || "Tournament not found."}</Alert>
        <Button variant="contained" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </Container>
    );
  }

  return (
    <>
      {error ? (
        <Container maxWidth="md" sx={{ py: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      ) : null}
      {success ? (
        <Container maxWidth="md" sx={{ py: 2 }}>
          <Alert severity="success">{success}</Alert>
        </Container>
      ) : null}
      <TournamentInviteContent
        tournament={inviteUi!}
        categories={categories}
        readOnly={isReadOnlyView || alreadyRegistered}
        alreadyRegistered={alreadyRegistered}
        initialSelectedCategories={initialSelectedCategories}
        onBack={() => navigate("/dashboard")}
        onConfirm={handleConfirm}
        onWithdraw={handleWithdraw}
        submitting={submitting}
        withdrawing={withdrawing}
      />
    </>
  );
}
