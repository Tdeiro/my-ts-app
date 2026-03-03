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
import { api } from "../api/client";

type EventDetailsCategoryDto = {
  id: number | string;
  name?: string;
  level?: string;
  minAge?: number | null;
  maxAge?: number | null;
  gender?: string;
  price?: number | string;
};

type EventDetailsDto = {
  id: number | string;
  name?: string;
  timezone?: string;
  locationName?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  registrationDeadline?: string;
  entryFee?: number | string;
  currency?: string;
  tournamentStage?: string;
  categories?: EventDetailsCategoryDto[];
};

const UPCOMING_SUBSCRIBED_EVENTS_KEY = "upcoming.subscribedEventIds";

type SubscribeMePayload = {
  eventId: number;
  categories: Array<{
    id: number;
    suggestedPlayer?: string;
    note?: string;
  }>;
};

type Category = {
  id: string;
  name: string;
  level: string;
  gender: "Men" | "Women" | "Mixed";
  format: "Singles" | "Doubles" | "Mixed";
  tabLabel: string;
  optionLabel: string;
  selectionLabel: string;
  minAge: string;
  maxAge: string;
  fee: number;
};

type SelectedCategory = Category & {
  partnerName: string;
  partnerNote: string;
};

type InviteUiModel = {
  eventId: number;
  name: string;
  timezone: string;
  location: string;
  address: string;
  dateLabel: string;
  dateMeta: string;
  timeLabel: string;
  timeMeta: string;
  feeLabel: string;
  feeMeta: string;
  deadlineLabel: string;
  deadlineMeta: string;
  stage: string;
  currency: string;
};

function parseInviteTournamentId(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function rememberSubscribedEvent(eventId: number) {
  try {
    const raw = window.localStorage.getItem(UPCOMING_SUBSCRIBED_EVENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const current: number[] = Array.isArray(parsed)
      ? parsed
          .map((item) => Number(item))
          .filter((item) => Number.isFinite(item) && item > 0)
      : [];
    const next = Array.from(new Set([eventId, ...current])).slice(0, 50);
    window.localStorage.setItem(
      UPCOMING_SUBSCRIBED_EVENTS_KEY,
      JSON.stringify(next),
    );
  } catch {
    // Ignore storage errors in private browsing or locked environments.
  }
}

function getErrorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string[]; error?: string } } })
      ?.response?.data?.message?.[0] ||
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
    fallback
  );
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
  onBack,
  onConfirm,
  submitting,
}: {
  tournament: InviteUiModel;
  categories: Category[];
  readOnly: boolean;
  onBack: () => void;
  onConfirm: (selected: SelectedCategory[]) => void;
  submitting: boolean;
}) {
  const availableTabs = React.useMemo<string[]>(() => {
    const set = new Set(categories.map((c) => c.tabLabel));
    const tabOrder = ["Beginner", "Intermediate", "Advanced", "Open"];
    const known = tabOrder.filter((item) => set.has(item));
    const unknown = Array.from(set).filter((item) => !tabOrder.includes(item)).sort();
    const ordered = [...known, ...unknown];
    return ordered.length > 0 ? ordered : ["Open"];
  }, [categories]);

  const [activeTab, setActiveTab] = React.useState<string>("");
  const [selectedCategories, setSelectedCategories] = React.useState<SelectedCategory[]>([]);
  const [expandedCategoryId, setExpandedCategoryId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!availableTabs.includes(activeTab)) setActiveTab(availableTabs[0]);
  }, [activeTab, availableTabs]);

  React.useEffect(() => {
    setSelectedCategories([]);
    setExpandedCategoryId(null);
  }, [tournament.eventId]);

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
      <ButtonBase key={category.id} onClick={() => toggleCategory(category)} sx={{ borderRadius: 1.5, textAlign: "left" }}>
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
                    You&apos;re Invited!
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
          </Box>
        </Card>

        <Card sx={{ borderRadius: 1.5, borderColor: "#D1D5DB", mb: 2.5 }}>
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.75 }}>
              <EmojiEventsOutlinedIcon sx={{ color: "#9333EA", fontSize: 30 }} />
              <Box>
                <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>Your Registered Categories</Typography>
                <Typography sx={{ fontSize: 14, color: "#6B7280" }}>You are registered for the following categories</Typography>
              </Box>
            </Stack>

            <Alert
              icon={<CheckCircleRoundedIcon />}
              severity="success"
              sx={{ mb: 2.5, borderRadius: 1.5, bgcolor: "#ECFDF3", border: "1px solid #BBF7D0", color: "#166534" }}
            >
              You&apos;re all set! Your registration is confirmed for these categories.
            </Alert>

            <Stack spacing={2}>
              <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
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
          </Box>
        </Card>

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
                  No category selected yet. Select one from &quot;Your Registered Categories&quot;.
                </Typography>
              </Box>
            )}
          </Box>
        </Card>

        <Card sx={{ borderRadius: 1.5, borderColor: "#D1D5DB" }}>
          <Box sx={{ p: { xs: 2, md: 3 }, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography sx={{ fontSize: 14, color: "#6B7280" }}>Total Amount Paid</Typography>
              <Typography sx={{ fontSize: 42, fontWeight: 900, color: "#9333EA", lineHeight: 1.05 }}>${totalFee} {tournament.currency}</Typography>
              <Typography sx={{ fontSize: 13, color: "#6B7280" }}>
                {selectedCategories.length > 0 ? "Payment completed" : "Select a category to continue"}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.25}>
              <Button variant="outlined" onClick={onBack}>Cancel</Button>
              <Button
                variant="contained"
                disabled={selectedCategories.length === 0 || readOnly || submitting}
                onClick={() => onConfirm(selectedCategories)}
              >
                {submitting ? "Confirming..." : "Confirm Registration"}
              </Button>
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

  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [event, setEvent] = React.useState<EventDetailsDto | null>(null);

  React.useEffect(() => {
    if (!inviteTournamentId) return;

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<EventDetailsDto>(`/events/${inviteTournamentId}`);
        if (!cancelled) setEvent(res.data);
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
  }, [inviteTournamentId]);

  const handleConfirm = async (selected: SelectedCategory[]) => {
    if (!inviteTournamentId) return;

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

      await api.post(`/events/${inviteTournamentId}/subscriptions/me`, payload);
      rememberSubscribedEvent(inviteTournamentId);
      setSuccess("Registration confirmed.");

      const totalAmount = selected.reduce((sum, item) => sum + Number(item.fee || 0), 0);
      navigate("/tournaments/payment", {
        state: {
          eventId: inviteTournamentId,
          tournamentName: event?.name || "Tournament",
          currency: String(event?.currency || "AUD").toUpperCase(),
          totalAmount,
          selectedCategoryNames: selected.map((c) => c.name),
        },
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not confirm registration."));
    } finally {
      setSubmitting(false);
    }
  };

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

  const inviteUi = mapEventToUi(event);
  const categories = mapEventCategories(event);

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
        tournament={inviteUi}
        categories={categories}
        readOnly={isReadOnlyView}
        onBack={() => navigate("/dashboard")}
        onConfirm={handleConfirm}
        submitting={submitting}
      />
    </>
  );
}
