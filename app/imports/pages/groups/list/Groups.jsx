import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { FunnelIcon, QueueListIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Input from "../../../components/Input";
import GroupCard from "../../../components/GroupCard";
import CheckboxDropdown from "../../../components/CheckboxDropdown";

// One flat list: interest groups first, then function groups, and last the
// workshop-bound groups (steering groups and their responsibility subgroups).
// Each row carries a type tag instead of section headings.
const TYPE_ORDER = ["interest", "function", "steering", "responsibility"];

// The filter's options: "mine" sits on top, apart from the four types, because
// it works differently — see the filter predicate below. Steering groups are
// off by default: they are workshop-bound and reached naturally through the
// workshop, so they mostly just take up room here.
const FILTER_KEYS = ["mine", ...TYPE_ORDER];
const DEFAULT_FILTER = FILTER_KEYS.filter((key) => key !== "steering");

// Type labels come from the same i18n keys the type tag uses, so a tag and its
// filter option can never disagree.
const TYPE_LABEL_KEYS = {
  interest: "groupTypeInterest",
  function: "groupTypeFunction",
  steering: "groupTypeSteering",
  responsibility: "groupTypeResponsibility",
};

// Remembered detailed/compact choice (see the toggle next to the search box).
const COMPACT_KEY = "groupsListCompact";
// The filter is remembered too — the toggle beside it is, and losing the choice
// every time you visit a group and come back would be its own annoyance.
const FILTER_KEY = "groupsListFilter";

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
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [compact, setCompact] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem(COMPACT_KEY) === "true"
  );
  const [filter, setFilter] = useState(readFilter);

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
  const ToggleIcon = compact ? Squares2X2Icon : QueueListIcon;

  const toggleFilter = (key) => {
    const next = filter.includes(key)
      ? filter.filter((k) => k !== key)
      : [...filter, key];
    setFilter(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(FILTER_KEY, next.join(","));
    }
  };

  // The member's own relation to a group. Wider than isJoined below: a pending
  // application counts, because silencing your own application just because it
  // happens to be for a steering group is worse than a slightly loose label.
  const isRelatedToMe = (g) =>
    g.myState === "active" || g.myState === "pending" || g.myIsResponsible;

  // "mine" adds to the selection rather than narrowing it: a group shows if its
  // type is ticked OR the member has a relation to it. That is what lets the
  // default hide steering groups while keeping the ones you are part of.
  const matchesFilter = (g) =>
    filter.includes(g.type) || (filter.includes("mine") && isRelatedToMe(g));

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
        <button
          onClick={toggleCompact}
          aria-label={compact ? t("moreInfo") : t("lessInfo")}
          title={compact ? t("moreInfo") : t("lessInfo")}
          className="flex-shrink-0 p-2.5 rounded bg-white border border-gray-200 cursor-pointer text-gray-600 hover:bg-gray-50"
        >
          <ToggleIcon className="w-6 h-6" aria-hidden="true" />
        </button>
        {/* align="right": the trigger sits at the right edge, so a left-aligned
            panel would hang off the screen. */}
        <CheckboxDropdown
          options={FILTER_KEYS.map((key) => ({
            key,
            label: key === "mine" ? t("groupFilterMine") : t(TYPE_LABEL_KEYS[key]),
            divider: key === "mine",
          }))}
          selected={filter}
          onToggle={toggleFilter}
          align="right"
          renderTrigger={({ open, toggle }) => (
            <button
              onClick={toggle}
              aria-expanded={open}
              aria-label={t("groupFilter")}
              title={t("groupFilter")}
              className="flex-shrink-0 p-2.5 rounded bg-white border border-gray-200 cursor-pointer text-gray-600 hover:bg-gray-50"
            >
              <FunnelIcon className="w-6 h-6" aria-hidden="true" />
            </button>
          )}
        />
      </div>

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
