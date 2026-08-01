import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { QueueListIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Input from "../../../components/Input";
import GroupCard from "../../../components/GroupCard";

// One flat list: interest groups first, then function groups, and last the
// workshop-bound groups (steering groups and their responsibility subgroups).
// Each row carries a type tag instead of section headings.
const TYPE_ORDER = ["interest", "function", "steering", "responsibility"];

// Remembered detailed/compact choice (see the toggle next to the search box).
const COMPACT_KEY = "groupsListCompact";

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

  const needle = search.trim().toLowerCase();
  const typeOrdered = TYPE_ORDER.flatMap((type) =>
    groups.filter((g) => g.type === type && matchesSearch(g, needle))
  );
  // Groups the member has joined come first (keeping the type order within
  // each partition); the member chip on the card already marks them.
  const isMine = (g) => g.myState === "active";
  const visibleGroups = [
    ...typeOrdered.filter(isMine),
    ...typeOrdered.filter((g) => !isMine(g)),
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
      </div>

      {groups.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">{t("noGroups")}</p>
      ) : visibleGroups.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">{t("noGroupsFound")}</p>
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
