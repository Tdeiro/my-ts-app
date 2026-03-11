import * as React from "react";
import { type TournamentCategory } from "../../Utils/tournamentPlanner";
import { type SetupTab } from "./types";

type UseTournamentSetupNavigationArgs = {
  categories: TournamentCategory[];
  searchParams: URLSearchParams;
  setSearchParams: (
    updater: (prev: URLSearchParams) => URLSearchParams,
  ) => void;
  setError: (value: string | null) => void;
  setSelectedCategoryId: (value: string) => void;
  setExpandedOverviewCategoryId: (value: string | null) => void;
  setActiveTab: (value: SetupTab) => void;
};

function isSetupTab(value: string): value is SetupTab {
  return (
    value === "overview" ||
    value === "categories" ||
    value === "teams" ||
    value === "groups" ||
    value === "schedule"
  );
}

export function useTournamentSetupNavigation({
  categories,
  searchParams,
  setSearchParams,
  setError,
  setSelectedCategoryId,
  setExpandedOverviewCategoryId,
  setActiveTab,
}: UseTournamentSetupNavigationArgs) {
  const selectedCategoryIdFromQuery = React.useMemo(
    () => String(searchParams.get("categoryId") ?? "").trim(),
    [searchParams],
  );
  const tabFromQuery = React.useMemo(
    () => String(searchParams.get("tab") ?? "").trim(),
    [searchParams],
  );

  const updateSetupQuery = React.useCallback(
    (categoryId: string | null, tab?: SetupTab) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (categoryId) {
          next.set("categoryId", categoryId);
          if (tab) next.set("tab", tab);
        } else {
          next.delete("categoryId");
          next.delete("tab");
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const openCategorySetup = React.useCallback(
    (categoryId: string, tab: SetupTab = "teams") => {
      const nextTab: SetupTab = tab === "overview" ? "teams" : tab;
      setError(null);
      setSelectedCategoryId(categoryId);
      setExpandedOverviewCategoryId(null);
      setActiveTab(nextTab);
      updateSetupQuery(categoryId, nextTab);
    },
    [setError, setSelectedCategoryId, setExpandedOverviewCategoryId, setActiveTab, updateSetupQuery],
  );

  const backToCategoryList = React.useCallback(() => {
    setSelectedCategoryId("");
    setExpandedOverviewCategoryId(null);
    setActiveTab("overview");
    updateSetupQuery(null);
  }, [setSelectedCategoryId, setExpandedOverviewCategoryId, setActiveTab, updateSetupQuery]);

  React.useEffect(() => {
    if (isSetupTab(tabFromQuery)) {
      if (tabFromQuery === "overview" && selectedCategoryIdFromQuery) {
        setActiveTab("teams");
      } else {
        setActiveTab(tabFromQuery);
      }
    }
  }, [tabFromQuery, selectedCategoryIdFromQuery, setActiveTab]);

  React.useEffect(() => {
    if (!selectedCategoryIdFromQuery) return;
    if (categories.some((category) => category.id === selectedCategoryIdFromQuery)) {
      setSelectedCategoryId(selectedCategoryIdFromQuery);
    }
  }, [categories, selectedCategoryIdFromQuery, setSelectedCategoryId]);

  React.useEffect(() => {
    if (!selectedCategoryIdFromQuery) {
      setSelectedCategoryId("");
      setExpandedOverviewCategoryId(null);
      setActiveTab("overview");
    }
  }, [selectedCategoryIdFromQuery, setSelectedCategoryId, setExpandedOverviewCategoryId, setActiveTab]);

  return {
    selectedCategoryIdFromQuery,
    tabFromQuery,
    openCategorySetup,
    backToCategoryList,
    updateSetupQuery,
  };
}
