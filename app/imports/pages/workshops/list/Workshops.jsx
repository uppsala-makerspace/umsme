import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { QueueListIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Input from "../../../components/Input";
import WorkshopCard from "../../../components/WorkshopCard";

// Remembered detailed/compact choice (see the toggle next to the search box).
const COMPACT_KEY = "workshopsListCompact";

// Case-insensitive match against both languages of name and description.
const matchesSearch = (workshop, needle) => {
  if (!needle) return true;
  const haystack = [
    workshop.name?.sv,
    workshop.name?.en,
    workshop.description?.sv,
    workshop.description?.en,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  return haystack.includes(needle);
};

const Workshops = ({ loading, workshops }) => {
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
  const visibleWorkshops = workshops.filter((w) => matchesSearch(w, needle));

  // Trial workshops go last, in both views: the established ones are what a
  // member is usually looking for. sort is stable, so the two groups keep
  // their incoming order.
  const ordered = [...visibleWorkshops].sort(
    (a, b) => (a.status === "trial" ? 1 : 0) - (b.status === "trial" ? 1 : 0)
  );

  return (
    <MainContent>
      <div className="flex items-center gap-2 mb-4">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchWorkshops")}
          aria-label={t("searchWorkshops")}
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

      {workshops.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">{t("noWorkshops")}</p>
      ) : visibleWorkshops.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">{t("noWorkshopsFound")}</p>
      ) : (
        <ul className={`list-none p-0 m-0 ${compact ? "grid grid-cols-2 gap-3" : ""}`}>
          {ordered.map((workshop) => (
            <WorkshopCard key={workshop._id} workshop={workshop} compact={compact} />
          ))}
        </ul>
      )}
    </MainContent>
  );
};

Workshops.propTypes = {
  loading: PropTypes.bool,
  workshops: PropTypes.array,
};

Workshops.defaultProps = {
  loading: false,
  workshops: [],
};

export default Workshops;
