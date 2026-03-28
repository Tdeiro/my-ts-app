import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { getToken } from "../features/auth/services/tokens";
import { parseTournamentCategoriesResponse } from "../Utils/tournamentCategoriesApi";
import type {
  CategoryPricingRule,
  TournamentCategoryForm,
  TournamentForm,
} from "../features/tournaments/types/addEventTypes";
import {
  SPORT_TO_API_VALUE,
  buildAutoCategoryName,
  formatCategoryFormatLabel,
  formatCategoryLevelLabel,
  getTodayIsoDate,
  inferFormatFromCategoryName,
  initialCategoryPricingRule,
  initialForm,
  mapApiTournamentLevel,
  newCategory,
  resolveCategorySpecialPrice,
  teamsLimitSizeFromFormat,
  validateTournamentBasics,
} from "../features/tournaments/utils/addEventHelpers";
import DetailsStep from "../features/tournaments/components/add-event/DetailsStep";
import CategoriesStep from "../features/tournaments/components/add-event/CategoriesStep";
import PreviewStep from "../features/tournaments/components/add-event/PreviewStep";
import CategoryModal from "../features/tournaments/components/add-event/CategoryModal";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";


export default function AddTournamentPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  // Core form state for the 3-step flow.
  const [form, setForm] = React.useState<TournamentForm>(initialForm);
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  // Category builder state (add/edit/list categories).
  const [savedCategories, setSavedCategories] = React.useState<
    TournamentCategoryForm[]
  >([]);
  const [draftCategory, setDraftCategory] =
    React.useState<TournamentCategoryForm>(newCategory());
  const [draftFormats, setDraftFormats] = React.useState<
    TournamentCategoryForm["format"][]
  >([]);
  const [draftGenders, setDraftGenders] = React.useState<
    TournamentCategoryForm["gender"][]
  >(["Men"]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [categoryPricingRule, setCategoryPricingRule] =
    React.useState<CategoryPricingRule>(initialCategoryPricingRule);
  const [editingCategoryId, setEditingCategoryId] = React.useState<
    string | null
  >(null);
  const [loadedCategoryIds, setLoadedCategoryIds] = React.useState<number[]>(
    [],
  );
  const [deletingCategoryIds, setDeletingCategoryIds] = React.useState<
    string[]
  >([]);

  const [saving, setSaving] = React.useState(false);
  const [createdTournamentId, setCreatedTournamentId] = React.useState<
    number | null
  >(null);
  const [inviteLink, setInviteLink] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  // Cache today's date once for validation and date input constraints.
  const todayIsoDate = React.useMemo(() => getTodayIsoDate(), []);
  // Lightweight validation for step 1 navigation and final submit.
  const basicsValidationError = React.useMemo(
    () => validateTournamentBasics(form),
    [form],
  );

  React.useEffect(() => {
    if (!isEditMode || !id) return;

    let cancelled = false;
    const run = async () => {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        // Load existing tournament + categories in parallel for edit mode.
        const [eventRes, categoriesRes] = await Promise.all([
          fetch(`${API_URL}/events`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/tournament-categories?eventId=${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const eventBody = await eventRes.json().catch(() => null);
        const categoriesBody = await categoriesRes.json().catch(() => null);
        if (!eventRes.ok) {
          throw new Error(
            eventBody?.message?.[0] ||
              eventBody?.error ||
              "Failed to load tournament",
          );
        }
        if (!categoriesRes.ok) {
          throw new Error(
            categoriesBody?.message?.[0] ||
              categoriesBody?.error ||
              "Failed to load categories",
          );
        }
        const raw = Array.isArray(eventBody)
          ? eventBody
          : (eventBody?.data ?? []);
        const selected = raw.find((e: any) => String(e.id) === String(id));
        if (!selected) throw new Error("Tournament not found");

        const sportRaw = String(selected.sport ?? "OTHER").toUpperCase();
        const sport =
          sportRaw === "TENNIS"
            ? "Tennis"
            : sportRaw === "BEACH_TENNIS"
              ? "Beach Tennis"
              : sportRaw === "PADEL"
                ? "Padel"
                : sportRaw === "PICKLEBALL"
                  ? "Pickleball"
                  : "Other";

        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          name: String(selected.name ?? ""),
          sport,
          level: mapApiTournamentLevel(selected.level),
          timezone: String(selected.timezone ?? prev.timezone),
          locationName: String(selected.locationName ?? ""),
          address: String(selected.address ?? ""),
          startDate: String(selected.startDate ?? ""),
          endDate: String(selected.endDate ?? ""),
          startTime: String(selected.startTime ?? "").slice(0, 5),
          endTime: String(selected.endTime ?? "").slice(0, 5),
          registrationDeadline: String(selected.registrationDeadline ?? ""),
          capacity: Math.max(0, Number(selected.capacity ?? 0) || 0),
          entryFee: Math.max(0, Number(selected.entryFee ?? 0) || 0),
          currency: String(
            selected.currency ?? prev.currency,
          ) as TournamentForm["currency"],
          description: String(selected.description ?? ""),
          isPublic: Boolean(selected.isPublic ?? true),
          allowWaitlist: Boolean(selected.allowWaitlist ?? false),
          requireApproval: Boolean(selected.requireApproval ?? false),
          tournamentStage: String(
            selected.tournamentStage ?? prev.tournamentStage ?? "DRAFT",
          ).toUpperCase() as TournamentForm["tournamentStage"],
        }));
        setCategoryPricingRule((prev) => ({
          ...prev,
          currency: String(
            selected.currency ?? prev.currency,
          ) as CategoryPricingRule["currency"],
        }));
        setCreatedTournamentId(Number(id));
        const rawCategories = parseTournamentCategoriesResponse(categoriesBody);
        const mappedCategories: TournamentCategoryForm[] = rawCategories.map(
          (c) => ({
            id: crypto.randomUUID(),
            backendId: Number(c.id),
            name: String(c.name ?? ""),
            level: String(
              c.level ?? "INTERMEDIATE",
            ) as TournamentCategoryForm["level"],
            format:
              Number(c.teamsLimitSize) === 1
                ? "SINGLES"
                : inferFormatFromCategoryName(String(c.name ?? "")),
            gender: String(c.gender ?? "Men") === "Women" ? "Women" : "Men",
            price: Math.max(
              0,
              Number(c.price ?? c.entryFee ?? c.fee ?? 0) || 0,
            ),
            specialPrice:
              c.specialPrice == null
                ? null
                : Math.max(0, Number(c.specialPrice ?? 0) || 0),
          }),
        );
        setSavedCategories(mappedCategories);
        const firstCategoryCurrency = String(
          rawCategories.find((category) => category.currency)?.currency ?? "",
        ).toUpperCase();
        if (["AUD", "USD", "EUR", "BRL"].includes(firstCategoryCurrency)) {
          setCategoryPricingRule((prev) => ({
            ...prev,
            currency: firstCategoryCurrency as CategoryPricingRule["currency"],
          }));
        }
        const firstSpecialPrice = mappedCategories
          .map((category) => Number(category.specialPrice))
          .find((value) => Number.isFinite(value) && value >= 0);
        if (Number.isFinite(firstSpecialPrice)) {
          setCategoryPricingRule((prev) => ({
            ...prev,
            enabled: true,
            specialPricePerCategory: Math.max(0, Number(firstSpecialPrice)),
          }));
        }
        setLoadedCategoryIds(
          mappedCategories
            .map((c) => Number(c.backendId))
            .filter((v) => Number.isFinite(v) && v > 0),
        );
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load tournament",
        );
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [id, isEditMode, navigate]);

  const setField =
    <K extends keyof TournamentForm>(key: K) =>
    (
      e:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | { target: { value: unknown } },
    ) => {
      setForm((prev) => ({
        ...prev,
        [key]: (e.target.value as TournamentForm[K]) ?? prev[key],
      }));
    };

  const setSwitch =
    (key: keyof TournamentForm) =>
    (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      setForm((prev) => ({ ...prev, [key]: checked as unknown }));
    };

  // Step transition from Details -> Categories.
  const handleCancel = () => navigate(-1);
  const handleStepOneNext = () => {
    setStatusMessage(null);
    const validationError = validateTournamentBasics(form);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  // Add or update a category draft into the saved list.
  const addCategory = () => {
    const cleanName = draftCategory.name.trim();
    setErrorMessage(null);
    const normalizedDraft = {
      ...draftCategory,
      price: Math.max(0, Number(draftCategory.price || 0)),
    };
    const finalName = cleanName || buildAutoCategoryName(normalizedDraft);

    if (editingCategoryId) {
      setSavedCategories((prev) =>
        prev.map((item) =>
          item.id === editingCategoryId
            ? { ...normalizedDraft, id: editingCategoryId, name: finalName }
            : item,
        ),
      );
      setStatusMessage("Category updated.");
    } else {
      if (draftGenders.length === 0) {
        setErrorMessage("Select at least one gender.");
        return;
      }
      // if (draftFormats.length === 0) {
      //   setErrorMessage("Select at least one format.");
      //   return;
      // }
      const targetGenders = draftGenders;
      const targetFormats =
        draftFormats.length > 0 ? draftFormats : [normalizedDraft.format];
      const categoriesToAdd = targetGenders.flatMap((gender) =>
        targetFormats.map((format) => {
          const generatedName = cleanName
            ? targetFormats.length > 1 || targetGenders.length > 1
              ? `${cleanName} - ${gender} - ${formatCategoryLevelLabel(normalizedDraft.level)} - ${formatCategoryFormatLabel(format)}`
              : cleanName
            : buildAutoCategoryName({
                ...normalizedDraft,
                gender,
                format,
              });
          return {
            ...normalizedDraft,
            id: crypto.randomUUID(),
            gender,
            format,
            name: generatedName,
          };
        }),
      );
      setSavedCategories((prev) => [...prev, ...categoriesToAdd]);
      setStatusMessage(
        categoriesToAdd.length > 1
          ? `${categoriesToAdd.length} categories added to the list.`
          : "Category added to the list.",
      );
    }

    setDraftCategory(newCategory());
    setDraftFormats([]);
    setDraftGenders(["Men"]);
    setIsCategoryModalOpen(false);
    setEditingCategoryId(null);
  };

  const removeCategory = async (id: string) => {
    const target = savedCategories.find((c) => c.id === id);
    if (!target) return;

    const removeLocal = () => {
      setSavedCategories((prev) => prev.filter((c) => c.id !== id));
      if (editingCategoryId === id) {
        setEditingCategoryId(null);
        setDraftCategory(newCategory());
      }
    };

    if (!isEditMode || !target.backendId) {
      removeLocal();
      return;
    }

    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    setDeletingCategoryIds((prev) => [...prev, id]);
    try {
      const res = await fetch(
        `${API_URL}/tournament-categories/${target.backendId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message?.[0] || body?.error || "Failed to delete category",
        );
      }

      removeLocal();
      setLoadedCategoryIds((prev) =>
        prev.filter((cid) => cid !== Number(target.backendId)),
      );
      setStatusMessage("Category deleted.");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to delete category",
      );
    } finally {
      setDeletingCategoryIds((prev) => prev.filter((value) => value !== id));
    }
  };

  // Begin editing an existing category.
  const editCategory = (id: string) => {
    const selected = savedCategories.find((c) => c.id === id);
    if (!selected) return;
    setDraftCategory(selected);
    setDraftFormats([selected.format]);
    setDraftGenders([selected.gender]);
    setIsCategoryModalOpen(true);
    setEditingCategoryId(id);
    setStatusMessage("Editing category. Save to update.");
  };

  // Close category editor and reset draft fields.
  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setDraftCategory(newCategory());
    setDraftFormats([]);
    setDraftGenders(["Men"]);
    setIsCategoryModalOpen(false);
  };

  // Only keep categories with valid names for API submission + preview.
  const signupCategories = React.useMemo(
    () =>
      savedCategories
        .map((category) => {
          const baseName = category.name.trim();
          if (!baseName) return null;
          return { ...category, name: baseName };
        })
        .filter((category): category is TournamentCategoryForm =>
          Boolean(category),
        ),
    [savedCategories],
  );

  const hasValidCategories = signupCategories.length > 0;
  const defaultCategoryFee = React.useMemo(() => {
    const first = signupCategories[0];
    if (!first) return 0;
    const value = Number(first.price ?? 0);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }, [signupCategories]);
  const defaultEventFormatLabel = React.useMemo(() => {
    const first = signupCategories[0];
    if (!first) return "Doubles";
    return formatCategoryFormatLabel(first.format);
  }, [signupCategories]);

  // Final save: create or update tournament, then sync categories.
  const handleSubmit = async () => {
    const token = getToken();
    setErrorMessage(null);
    setStatusMessage(null);

    const validationError = validateTournamentBasics(form);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (!token) {
      navigate("/login");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        eventType: "TOURNAMENT",
        sport: SPORT_TO_API_VALUE[form.sport],
        format: defaultEventFormatLabel,
        level: form.level || "All levels",
        timezone: form.timezone,
        locationName: form.locationName,
        address: form.address,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: `${form.startTime}:00`,
        endTime: `${form.endTime}:00`,
        registrationDeadline: form.registrationDeadline,
        capacity: form.capacity,
        entryFee: defaultCategoryFee,
        currency: categoryPricingRule.currency || "AUD",
        description: form.description,
        isPublic: form.isPublic,
        allowWaitlist: form.allowWaitlist,
        requireApproval: form.requireApproval,
        tournamentStage: form.tournamentStage || "DRAFT",
      };

      const res = await fetch(
        isEditMode && id ? `${API_URL}/events/${id}` : `${API_URL}/events`,
        {
          method: isEditMode ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401) {
          navigate("/login");
          return;
        }
        throw new Error(
          data?.message || data?.error || "Failed to create event",
        );
      }

      const createdId = isEditMode
        ? Number(id)
        : Number(data?.id ?? data?.data?.id ?? 0);
      if (!Number.isFinite(createdId) || createdId <= 0) {
        throw new Error("Tournament created, but no valid id was returned.");
      }

      const expandedCategories: Array<{
        backendId?: number;
        name: string;
        level: TournamentCategoryForm["level"];
        format: TournamentCategoryForm["format"];
        gender: TournamentCategoryForm["gender"];
        price: number;
        specialPrice: number;
      }> = savedCategories.reduce((acc, source) => {
        const baseName = source.name.trim();
        if (!baseName) return acc;
        const basePrice = Math.max(0, Number(source.price || 0));
        acc.push({
          backendId: source.backendId,
          name: baseName,
          level: source.level,
          format: source.format,
          gender: source.gender,
          price: basePrice,
          specialPrice: resolveCategorySpecialPrice(
            basePrice,
            categoryPricingRule,
          ),
        });
        return acc;
      }, [] as Array<{
        backendId?: number;
        name: string;
        level: TournamentCategoryForm["level"];
        format: TournamentCategoryForm["format"];
        gender: TournamentCategoryForm["gender"];
        price: number;
        specialPrice: number;
      }>);

      if (isEditMode) {
        const usedBackendIds = new Set<number>();

        const updateOps = expandedCategories
          .filter((c) => Number.isFinite(Number(c.backendId)))
          .map(async (category) => {
            const backendId = Number(category.backendId);
            usedBackendIds.add(backendId);
            const resUpdate = await fetch(
              `${API_URL}/tournament-categories/${backendId}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  eventId: createdId,
                  name: category.name,
                  level: category.level,
                  minAge: null,
                  maxAge: null,
                  gender: category.gender,
                  teamsLimitSize: teamsLimitSizeFromFormat(category.format),
                  price: category.price,
                  specialPrice: category.specialPrice,
                  currency: categoryPricingRule.currency || "AUD",
                }),
              },
            );
            const body = await resUpdate.json().catch(() => null);
            return { ok: resUpdate.ok, body };
          });

        const createOps = expandedCategories
          .filter((c) => !c.backendId)
          .map(async (category) => {
            const resCreate = await fetch(`${API_URL}/tournament-categories`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                eventId: createdId,
                name: category.name,
                level: category.level,
                minAge: null,
                maxAge: null,
                gender: category.gender,
                teamsLimitSize: teamsLimitSizeFromFormat(category.format),
                price: category.price,
                specialPrice: category.specialPrice,
                currency: categoryPricingRule.currency || "AUD",
              }),
            });
            const body = await resCreate.json().catch(() => null);
            return { ok: resCreate.ok, body };
          });

        const deleteOps = loadedCategoryIds
          .filter((existingId) => !usedBackendIds.has(existingId))
          .map(async (categoryId) => {
            const resDelete = await fetch(
              `${API_URL}/tournament-categories/${categoryId}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            return { ok: resDelete.ok, body: null };
          });

        const results = await Promise.all([
          ...updateOps,
          ...createOps,
          ...deleteOps,
        ]);
        const failed = results.filter((r) => !r.ok);
        if (failed.length > 0) {
          const firstError =
            failed[0].body?.message?.[0] ||
            failed[0].body?.error ||
            "Failed to sync tournament categories";
          throw new Error(firstError);
        }
      } else {
        const categoriesToCreate = signupCategories
          .map((c) => ({
            eventId: createdId,
            name: c.name,
            level: c.level,
            minAge: null,
            maxAge: null,
            gender: c.gender,
            teamsLimitSize: teamsLimitSizeFromFormat(c.format),
            price: Math.max(0, Number(c.price || 0)),
            specialPrice: resolveCategorySpecialPrice(
              Math.max(0, Number(c.price || 0)),
              categoryPricingRule,
            ),
            currency: categoryPricingRule.currency || "AUD",
          }))
          .filter((c) => c.name);

        if (categoriesToCreate.length > 0) {
          const results = await Promise.all(
            categoriesToCreate.map(async (category) => {
              const categoryRes = await fetch(
                `${API_URL}/tournament-categories`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify(category),
                },
              );
              const categoryBody = await categoryRes.json().catch(() => null);
              return { ok: categoryRes.ok, body: categoryBody };
            }),
          );

          const failed = results.filter((r) => !r.ok);
          if (failed.length > 0) {
            const firstError =
              failed[0].body?.message?.[0] ||
              failed[0].body?.error ||
              "Some categories could not be created";
            throw new Error(
              `Tournament created, but ${failed.length} categor${
                failed.length > 1 ? "ies" : "y"
              } failed: ${firstError}`,
            );
          }
        }
      }

      setCreatedTournamentId(createdId);
      setInviteLink("");
      setStatusMessage(
        isEditMode
          ? "Tournament updated successfully."
          : "Tournament created. You can now generate an invite link.",
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to create event",
      );
    } finally {
      setSaving(false);
    }
  };

  // Invite link helpers (preview step).
  const handleGenerateInviteLink = () => {
    if (!createdTournamentId) return;
    const link = `${window.location.origin}/signup?inviteTournamentId=${createdTournamentId}`;
    setInviteLink(link);
    setStatusMessage("Invite link generated.");
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setStatusMessage("Invite link copied to clipboard.");
    } catch {
      setErrorMessage("Could not copy invite link. Please copy it manually.");
    }
  };

  const handleShareInviteLink = async () => {
    if (!inviteLink || !("share" in navigator)) return;
    try {
      await navigator.share({
        title: form.name || "Tournament Invite",
        text: `You are invited to join ${form.name || "our tournament"}.`,
        url: inviteLink,
      });
    } catch {
      // ignore cancelled share
    }
  };

  const whenText = `${form.startDate || "—"} → ${form.endDate || "—"} • ${
    form.startTime || "—"
  }–${form.endTime || "—"}`;
  const categoryBaseTotal = signupCategories.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0,
  );
  const feeText = `${categoryPricingRule.currency || "AUD"} ${categoryBaseTotal}`;
  const canUseNativeShare =
    typeof navigator !== "undefined" && "share" in navigator;

  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        minWidth: 0,
        bgcolor: "#F9FAFB",
        p: { xs: 2, md: 4 },
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 1200 }}>
        <Card
          sx={{
            mb: 4,
            borderRadius: 3,
            border: "1px solid #E5E7EB",
            boxShadow: "0 4px 6px -1px rgb(139 92 246 / 0.1)",
            overflow: "hidden",
            position: "relative",
            background: "#FFFFFF",
          }}
        >
          {/* Decorative gradient bar */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "6px",
              background:
                "linear-gradient(90deg, #8B5CF6 0%, #A855F7 50%, #EC4899 100%)",
            }}
          />

          <CardContent sx={{ p: { xs: 3, sm: 4 }, pt: { xs: 4, sm: 5 } }}>
            <Stack spacing={4}>
              {/* Alerts */}
              {!isCategoryModalOpen && errorMessage ? (
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 2.5,
                    border: "1.5px solid #FEE2E2",
                    bgcolor: "#FEF2F2",
                  }}
                >
                  {errorMessage}
                </Alert>
              ) : null}
              {!isCategoryModalOpen && !errorMessage && statusMessage ? (
                <Alert
                  severity="success"
                  sx={{
                    borderRadius: 2.5,
                    border: "1.5px solid #D1FAE5",
                    bgcolor: "#F0FDF4",
                  }}
                >
                  {statusMessage}
                </Alert>
              ) : null}

              {/* Header Section */}
              <Stack spacing={3}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={3}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Stack spacing={1}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 800,
                        fontSize: { xs: "1.75rem", sm: "2.25rem" },
                        color: "#111827",
                        background:
                          "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {isEditMode ? "Edit Tournament" : "Add Tournament"}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ color: "#6B7280", fontSize: "1rem" }}
                    >
                      Step {step} of 3:{" "}
                      {step === 1
                        ? "Tournament details"
                        : step === 2
                          ? "Categories & Settings"
                          : "Final preview"}
                    </Typography>
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={2}
                    justifyContent="flex-end"
                    flexWrap="wrap"
                  >
                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      sx={{
                        borderRadius: 2,
                        borderWidth: "1.5px",
                        borderColor: "#E5E7EB",
                        color: "#374151",
                        fontWeight: 600,
                        px: 3,
                        py: 1.25,
                        textTransform: "none",
                        "&:hover": {
                          borderWidth: "1.5px",
                          borderColor: "#D1D5DB",
                          bgcolor: "#F9FAFB",
                        },
                      }}
                    >
                      Cancel
                    </Button>

                    {step === 1 ? (
                      <Button
                        variant="contained"
                        onClick={handleStepOneNext}
                        sx={{
                          borderRadius: 2,
                          background:
                            "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                          fontWeight: 600,
                          px: 3,
                          py: 1.25,
                          textTransform: "none",
                          boxShadow: "0 4px 6px -1px rgb(139 92 246 / 0.3)",
                          "&:hover": {
                            background:
                              "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)",
                            boxShadow: "0 6px 8px -1px rgb(139 92 246 / 0.4)",
                          },
                          "&:disabled": {
                            background: "#E5E7EB",
                            color: "#9CA3AF",
                          },
                        }}
                      >
                        Next: Categories
                      </Button>
                    ) : step === 2 ? (
                      <>
                        <Button
                          variant="outlined"
                          onClick={() => setStep(1)}
                          sx={{
                            borderRadius: 2,
                            borderWidth: "1.5px",
                            borderColor: "#E5E7EB",
                            color: "#374151",
                            fontWeight: 600,
                            px: 3,
                            py: 1.25,
                            textTransform: "none",
                            "&:hover": {
                              borderWidth: "1.5px",
                              borderColor: "#D1D5DB",
                              bgcolor: "#F9FAFB",
                            },
                          }}
                        >
                          Back
                        </Button>
                        <Button
                          variant="contained"
                          onClick={() => setStep(3)}
                          disabled={!hasValidCategories}
                          sx={{
                            borderRadius: 2,
                            background:
                              "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                            fontWeight: 600,
                            px: 3,
                            py: 1.25,
                            textTransform: "none",
                            boxShadow: "0 4px 6px -1px rgb(139 92 246 / 0.3)",
                            "&:hover": {
                              background:
                                "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)",
                              boxShadow: "0 6px 8px -1px rgb(139 92 246 / 0.4)",
                            },
                            "&:disabled": {
                              background: "#E5E7EB",
                              color: "#9CA3AF",
                            },
                          }}
                        >
                          Preview
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outlined"
                          onClick={() => setStep(2)}
                          sx={{
                            borderRadius: 2,
                            borderWidth: "1.5px",
                            borderColor: "#E5E7EB",
                            color: "#374151",
                            fontWeight: 600,
                            px: 3,
                            py: 1.25,
                            textTransform: "none",
                            "&:hover": {
                              borderWidth: "1.5px",
                              borderColor: "#D1D5DB",
                              bgcolor: "#F9FAFB",
                            },
                          }}
                        >
                          Back
                        </Button>
                        {createdTournamentId ? (
                          <Button
                            variant="outlined"
                            onClick={() => navigate("/tournaments")}
                            sx={{
                              borderRadius: 2,
                              borderWidth: "1.5px",
                              borderColor: "#8B5CF6",
                              color: "#8B5CF6",
                              fontWeight: 600,
                              px: 3,
                              py: 1.25,
                              textTransform: "none",
                              "&:hover": {
                                borderWidth: "1.5px",
                                borderColor: "#7C3AED",
                                bgcolor: "#FAF5FF",
                              },
                            }}
                          >
                            Back to Tournaments
                          </Button>
                        ) : null}
                        <Button
                          variant="contained"
                          onClick={handleSubmit}
                          disabled={
                            saving ||
                            Boolean(basicsValidationError) ||
                            !hasValidCategories ||
                            (createdTournamentId !== null && !isEditMode)
                          }
                          sx={{
                            borderRadius: 2,
                            background:
                              "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                            fontWeight: 600,
                            px: 3,
                            py: 1.25,
                            textTransform: "none",
                            boxShadow: "0 4px 6px -1px rgb(139 92 246 / 0.3)",
                            "&:hover": {
                              background:
                                "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)",
                              boxShadow: "0 6px 8px -1px rgb(139 92 246 / 0.4)",
                            },
                            "&:disabled": {
                              background: "#E5E7EB",
                              color: "#9CA3AF",
                            },
                          }}
                        >
                          {saving
                            ? "Saving…"
                            : isEditMode
                              ? "Save Changes"
                              : createdTournamentId
                                ? "Tournament Created"
                                : "Create Tournament"}
                        </Button>
                      </>
                    )}
                  </Stack>
                </Stack>

                {/* Enhanced Progress Indicator */}
                <Box>
                  <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
                    {[
                      { num: 1, label: "Details" },
                      { num: 2, label: "Categories" },
                      { num: 3, label: "Preview" },
                    ].map((item) => (
                      <Stack
                        key={item.num}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ flex: 1 }}
                      >
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background:
                              step >= item.num
                                ? "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)"
                                : "#E5E7EB",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: step >= item.num ? "#FFFFFF" : "#9CA3AF",
                            fontWeight: 700,
                            fontSize: "0.8125rem",
                            transition: "all 0.3s ease",
                          }}
                        >
                          {item.num}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            color: step >= item.num ? "#8B5CF6" : "#9CA3AF",
                            display: { xs: "none", sm: "block" },
                          }}
                        >
                          {item.label}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    <Box
                      sx={{
                        flex: 1,
                        height: 8,
                        borderRadius: 999,
                        background:
                          step >= 1
                            ? "linear-gradient(90deg, #8B5CF6 0%, #A855F7 100%)"
                            : "#E5E7EB",
                        transition: "all 0.3s ease",
                      }}
                    />
                    <Box
                      sx={{
                        flex: 1,
                        height: 8,
                        borderRadius: 999,
                        background:
                          step >= 2
                            ? "linear-gradient(90deg, #A855F7 0%, #EC4899 100%)"
                            : "#E5E7EB",
                        transition: "all 0.3s ease",
                      }}
                    />
                    <Box
                      sx={{
                        flex: 1,
                        height: 8,
                        borderRadius: 999,
                        background:
                          step >= 3
                            ? "linear-gradient(90deg, #EC4899 0%, #F472B6 100%)"
                            : "#E5E7EB",
                        transition: "all 0.3s ease",
                      }}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Step content is split into focused components to keep this page readable. */}
        {step === 1 ? (
          <DetailsStep
            form={form}
            setField={setField}
            setForm={setForm}
            setSwitch={setSwitch}
            todayIsoDate={todayIsoDate}
          />
        ) : step === 2 ? (
          <CategoriesStep
            form={form}
            savedCategories={savedCategories}
            categoryPricingRule={categoryPricingRule}
            setCategoryPricingRule={setCategoryPricingRule}
            setDraftCategory={setDraftCategory}
            setDraftFormats={setDraftFormats}
            setDraftGenders={setDraftGenders}
            setEditingCategoryId={setEditingCategoryId}
            setIsCategoryModalOpen={setIsCategoryModalOpen}
            editCategory={editCategory}
            removeCategory={removeCategory}
            deletingCategoryIds={deletingCategoryIds}
          />
        ) : (
          <PreviewStep
            form={form}
            signupCategories={signupCategories}
            categoryPricingRule={categoryPricingRule}
            whenText={whenText}
            feeText={feeText}
            createdTournamentId={createdTournamentId}
            inviteLink={inviteLink}
            canUseNativeShare={canUseNativeShare}
            handleGenerateInviteLink={handleGenerateInviteLink}
            handleCopyInviteLink={handleCopyInviteLink}
            handleShareInviteLink={handleShareInviteLink}
          />
        )}

        {/* Category modal lives here so it can access the page-level draft state. */}
        <CategoryModal
          open={isCategoryModalOpen}
          onClose={cancelEditCategory}
          editingCategoryId={editingCategoryId}
          draftCategory={draftCategory}
          setDraftCategory={setDraftCategory}
          draftGenders={draftGenders}
          setDraftGenders={setDraftGenders}
          draftFormats={draftFormats}
          setDraftFormats={setDraftFormats}
          categoryPricingRule={categoryPricingRule}
          errorMessage={errorMessage}
          statusMessage={statusMessage}
          onCancel={cancelEditCategory}
          onSave={addCategory}
        />
      </Box>
    </Box>
  );
}
