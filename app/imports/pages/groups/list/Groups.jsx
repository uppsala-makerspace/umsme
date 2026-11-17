import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { localized } from "/imports/common/lib/groupRules";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Input from "../../../components/Input";
import GroupCard from "../../../components/GroupCard";
import {
  ViewToggle, FilterButton, FilterSection, FilterDropdown, filterSummary, toggled,
} from "../../../components/ListFilters";

// One flat list: function groups first, and last the workshop-bound groups
// (steering groups and their responsibility subgroups). Each row carries a
// type tag instead of section headings.
const TYPE_ORDER = ["function", "steering", "responsibility"];

// The filter's options: "mine" sits on top, apart from the three types, because
// it works differently — see the filter predicate below. Steering groups are
// off by default: they are workshop-bound and reached naturally through the
// workshop, so they mostly just take up room here.
const FILTER_KEYS = ["mine", ...TYPE_ORDER];
const DEFAULT_FILTER = FILTER_KEYS.filter((key) => key !== "steering");

// Type labels come from the same i18n keys the type tag uses, so a tag and its
// filter option can never disagree.
const TYPE_LABEL_KEYS = {
  function: "groupTypeFunction",
  steering: "groupTypeSteering",
  responsibility: "groupTypeResponsibility",
};

// Remembered detailed/compact choice (see the toggle next to the search box).
const COMPACT_KEY = "groupsListCompact";
// The filter is remembered too — the toggle beside it is, and losing the choice
// every time you visit a group and come back would be its own annoyance.
const FILTER_KEY = "groupsListFilter";
const CATEGORY_FILTER_KEY = "groupsListCategories";

const readCategories = () => {
  if (typeof localStorage === "undefined") return [];
  return (localStorage.getItem(CATEGORY_FILTER_KEY) || "").split(",").filter(Boolean);
};

// The categories the groups have, each once, in the order admin keeps them.
const categoriesOf = (groups, lang) => {
  const byId = new Map();
  for (const group of groups) {
    for (const category of group.categories || []) byId.set(category._id, category);
  }
  return [...byId.values()].sort(
    (a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity)
      || localized(a.name, lang).localeCompare(localized(b.name, lang), lang)
  );
};

const readFilter = () => {
  if (typeof localStorage === "undefined") return DEFAULT_FILTER;
  const stored = localStorage.getItem(FILTER_KEY);
  // Deselecting everything is a legitimate choice, so an empty string must not
  // fall back to the default — only a missing entry does.
  if (stored === null) return DEFAULT_FILTER;
  // Filter against the known keys so a value stored before a rename (the type
  // "workshop" became "steering") doesn't linger.
  return stored.split(",").filter((key) => FILTER_KEYS.includes(key));
};

// Case-insensitive match against both languages of name and description.
const matchesSearch = (group, needle) => {
  if (!needle) return true;
  const haystack = [
    group.name?.sv,
    group.name?.en,
    group.description?.sv,
    group.description?.en,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  return haystack.includes(needle);
};

const Groups = ({ loading, groups }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const [search, setSearch] = useState("");
  const [compact, setCompact] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem(COMPACT_KEY) === "true"
  );
  const [filter, setFilter] = useState(readFilter);
  const [chosenCategories, setChosenCategories] = useState(readCategories);
  const [filtersOpen, setFiltersOpen] = useState(false);

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  const toggleCompact = () => {
    const next = !compact;
    setCompact(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(COMPACT_KEY, String(next));
    }
  };

  const toggleFilter = (key) => {
    const next = toggled(filter, key);
    setFilter(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(FILTER_KEY, next.join(","));
    }
  };

  const toggleCategory = (id) => {
    const next = toggled(chosenCategories, id);
    setChosenCategories(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CATEGORY_FILTER_KEY, next.join(","));
    }
  };

  // Only the categories some group has can be chosen; one remembered from
  // before that no group has any longer is left out, rather than hiding all.
  const categories = categoriesOf(groups, lang);
  const activeCategories = chosenCategories.filter((id) => categories.some((c) => c._id === id));
  // What differs from the standard filter, shown on the closed filter button:
  // each type ticked or unticked against the default, and each chosen category.
  const filtered = activeCategories.length > 0
    || FILTER_KEYS.some((key) => filter.includes(key) !== DEFAULT_FILTER.includes(key));

  const clearFilters = () => {
    setFilter(DEFAULT_FILTER);
    setChosenCategories([]);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(FILTER_KEY);
      localStorage.removeItem(CATEGORY_FILTER_KEY);
    }
  };

  const typeOptions = FILTER_KEYS.map((key) => ({
    key,
    label: key === "mine" ? t("groupFilterMine") : t(TYPE_LABEL_KEYS[key]),
    divider: key === "mine",
  }));
  const categoryOptions = categories.map((c) => ({ key: c._id, label: localized(c.name, lang) }));

  // The member's own relation to a group. Wider than isJoined below: a pending
  // application counts, because silencing your own application just because it
  // happens to be for a steering group is worse than a slightly loose label.
  const isRelatedToMe = (g) =>
    g.myState === "active" || g.myState === "pending" || g.myIsResponsible;

  // "mine" adds to the selection rather than narrowing it: a group shows if its
  // type is ticked OR the member has a relation to it. That is what lets the
  // default hide steering groups while keeping the ones you are part of.
  // Categories narrow it down: with some chosen, a group shows if it has any of them.
  const matchesCategories = (g) =>
    activeCategories.length === 0
    || (g.categories || []).some((c) => activeCategories.includes(c._id));
  const matchesFilter = (g) =>
    (filter.includes(g.type) || (filter.includes("mine") && isRelatedToMe(g)))
    && matchesCategories(g);

  const needle = search.trim().toLowerCase();
  const typeOrdered = TYPE_ORDER.flatMap((type) =>
    groups.filter((g) => g.type === type && matchesSearch(g, needle) && matchesFilter(g))
  );
  // Groups the member has joined come first (keeping the type order within
  // each partition); the member chip on the card already marks them. Only
  // active membership sorts to the top — a pending application has not been
  // granted yet.
  const isJoined = (g) => g.myState === "active";
  const visibleGroups = [
    ...typeOrdered.filter(isJoined),
    ...typeOrdered.filter((g) => !isJoined(g)),
  ];

  return (
    <MainContent>
      <div className="flex items-center gap-2 mb-4">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchGroups")}
          aria-label={t("searchGroups")}
          className="mb-0 flex-1"
        />
        <ViewToggle compact={compact} onToggle={toggleCompact} />
        <FilterButton
          open={filtersOpen} onToggle={() => setFiltersOpen(!filtersOpen)} filtered={filtered}
          controls="group-filters" label={t("groupFilter")} activeLabel={t("groupFilterActive")}
        />
      </div>

      {filtersOpen && (
        <FilterSection id="group-filters" filtered={filtered} onClear={clearFilters}>
          <FilterDropdown
            id="group-filter-types"
            label={t("groupFilterTypes")}
            summary={filterSummary(typeOptions, filter, { all: t("filterAll"), none: t("filterNone") })}
            options={typeOptions}
            selected={filter}
            onToggle={toggleFilter}
          />
          {categoryOptions.length > 0 && (
            <FilterDropdown
              id="group-filter-categories"
              label={t("filterCategories")}
              summary={filterSummary(categoryOptions, activeCategories, { none: t("filterAll") })}
              options={categoryOptions}
              selected={activeCategories}
              onToggle={toggleCategory}
            />
          )}
        </FilterSection>
      )}

      {groups.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">{t("noGroups")}</p>
      ) : visibleGroups.length === 0 ? (
        /* Distinguish "the search found nothing" from "the filter hides it
           all" — otherwise a deselected filter looks like missing data. */
        <p className="text-center text-gray-500 p-8 italic">
          {needle ? t("noGroupsFound") : t("noGroupsForFilter")}
        </p>
      ) : (
        <ul className="list-none p-0 m-0">
          {visibleGroups.map((group) => (
            <GroupCard key={group._id} group={group} compact={compact} />
          ))}
        </ul>
      )}
    </MainContent>
  );
};

Groups.propTypes = {
  loading: PropTypes.bool,
  groups: PropTypes.array,
};

Groups.defaultProps = {
  loading: false,
  groups: [],
};

export default Groups;
