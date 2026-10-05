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
// Remembered choice between workshops and areas of interest (the switch on top).
const KIND_KEY = "workshopsListKind";
const KINDS = ["workshop", "areaOfInterest"];

// A document without a kind predates areas of interest and is a workshop.
const kindOf = (workshop) => workshop.kind || "workshop";

const readStored = (key) => {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch (e) {
    return null;
  }
};

const writeStored = (key, value) => {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch (e) {
    // Private mode or blocked storage: the choice just isn't remembered.
  }
};

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

const Workshops = ({ loading, workshops, initialKind }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [compact, setCompact] = useState(() => readStored(COMPACT_KEY) === "true");
  const [kind, setKind] = useState(() => {
    const stored = initialKind || readStored(KIND_KEY);
    return KINDS.includes(stored) ? stored : "workshop";
  });

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
    writeStored(COMPACT_KEY, String(next));
  };
  const ToggleIcon = compact ? Squares2X2Icon : QueueListIcon;

  const chooseKind = (next) => {
    setKind(next);
    writeStored(KIND_KEY, next);
  };

  const ofKind = workshops.filter((w) => kindOf(w) === kind);
  const needle = search.trim().toLowerCase();
  const visibleWorkshops = ofKind.filter((w) => matchesSearch(w, needle));
  const isAreasOfInterest = kind === "areaOfInterest";

  // Trial workshops go last, in both views: the established ones are what a
  // member is usually looking for. sort is stable, so the two groups keep
  // their incoming order.
  const ordered = [...visibleWorkshops].sort(
    (a, b) => (a.status === "trial" ? 1 : 0) - (b.status === "trial" ? 1 : 0)
  );

  return (
    <MainContent>
      <div className="flex mb-3 rounded-lg border border-gray-300 overflow-hidden text-sm" role="group">
        {KINDS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => chooseKind(option)}
            aria-pressed={kind === option}
            className={`flex-1 px-3 py-2 border-none cursor-pointer font-semibold ${
              kind === option ? "bg-brand-green text-white" : "bg-white text-gray-600"
            }`}
          >
            {t(option === "workshop" ? "workshops" : "areasOfInterest")}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(isAreasOfInterest ? "searchAreasOfInterest" : "searchWorkshops")}
          aria-label={t(isAreasOfInterest ? "searchAreasOfInterest" : "searchWorkshops")}
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

      {ofKind.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">
          {t(isAreasOfInterest ? "noAreasOfInterest" : "noWorkshops")}
        </p>
      ) : visibleWorkshops.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">
          {t(isAreasOfInterest ? "noAreasOfInterestFound" : "noWorkshopsFound")}
        </p>
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
  // Forces the switch (stories); otherwise the remembered choice is used.
  initialKind: PropTypes.oneOf(KINDS),
};

Workshops.defaultProps = {
  loading: false,
  workshops: [],
};

export default Workshops;
