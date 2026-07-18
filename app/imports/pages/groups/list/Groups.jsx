import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { QueueListIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Input from "../../../components/Input";
import GroupTypeTag from "../../../components/GroupTypeTag";
import { localized } from "/imports/common/lib/groupRules";
import { markdownExcerpt } from "/imports/utils/markdown";

// One flat list: interest groups first, then function groups, and last the
// workshop-bound groups (workshop groups and their responsibility subgroups).
// Each row carries a type tag instead of section headings.
const TYPE_ORDER = ["interest", "function", "workshop", "responsibility"];

// Remembered detailed/compact choice (see the toggle next to the search box).
const COMPACT_KEY = "groupsListCompact";

const MembershipChip = ({ myState, myIsResponsible }) => {
  const { t } = useTranslation();
  if (myIsResponsible) {
    return (
      <span className="inline-block text-xs font-semibold rounded-full py-0.5 px-2 bg-green-100 text-green-800">
        {t("groupResponsible")}
      </span>
    );
  }
  if (myState === "active") {
    return (
      <span className="inline-block text-xs font-semibold rounded-full py-0.5 px-2 bg-green-100 text-green-800">
        {t("memberChip")}
      </span>
    );
  }
  if (myState === "pending") {
    return (
      <span className="inline-block text-xs font-semibold rounded-full py-0.5 px-2 bg-amber-100 text-amber-800">
        {t("pendingChip")}
      </span>
    );
  }
  return null;
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
  const visibleGroups = TYPE_ORDER.flatMap((type) =>
    groups.filter((g) => g.type === type && matchesSearch(g, needle))
  );

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
          {visibleGroups.map((group) => {
            const excerpt = compact ? "" : markdownExcerpt(localized(group.description, lang), 110);
            return (
              <li key={group._id} className="mb-3 rounded-lg bg-white border border-gray-200 overflow-hidden">
                <Link
                  to={`/groups/${group._id}`}
                  className="block no-underline text-inherit transition-colors hover:bg-gray-50"
                >
                  {!compact && group.imageUrl && (
                    <img
                      src={group.imageUrl}
                      alt={localized(group.name, lang)}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className={`flex justify-between items-center ${compact ? "p-3" : "p-4"}`}>
                    <div className="flex-1">
                      <span className="flex items-center gap-2 font-semibold leading-snug">
                        {localized(group.name, lang)}
                        <GroupTypeTag type={group.type} />
                        <MembershipChip myState={group.myState} myIsResponsible={group.myIsResponsible} />
                      </span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        {group.memberCount}{" "}
                        {group.memberCount === 1 ? t("memberSingular") : t("memberPlural")}
                      </span>
                      {excerpt && (
                        <span className="block text-sm text-gray-500 mt-1">{excerpt}</span>
                      )}
                    </div>
                    <span className="text-gray-400 text-xl ml-2">&rarr;</span>
                  </div>
                </Link>
              </li>
            );
          })}
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
