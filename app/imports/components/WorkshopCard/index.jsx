import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { localized } from "/imports/common/lib/groupRules";
import { markdownExcerpt } from "/imports/utils/markdown";
import WorkshopStatusBadge from "/imports/pages/workshops/components/WorkshopStatusBadge";

/**
 * Workshop preview card for the workshop list — its only user.
 *
 * Two rather different cards: the detailed one is a full-width banner with
 * image, name, status and excerpt; the compact one is a narrow tile with the
 * space icon above the name and nothing else, two to a row. The list supplies
 * the grid and the ordering (see Workshops.jsx).
 */
const WorkshopCard = ({ workshop, compact = false }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const name = localized(workshop.name, lang);

  if (compact) {
    return (
      <li className="list-none">
        <Link
          to={`/workshops/${workshop._id}`}
          className="relative overflow-hidden flex flex-col items-center justify-start h-full p-3 text-center rounded-lg bg-white border border-gray-200 no-underline text-inherit transition-colors hover:bg-gray-50"
        >
          {/* A tile has no room for the status badge, so trial workshops get a
              corner ribbon instead. It is clipped by the card's overflow-hidden,
              which is what makes the ends disappear off the edges. */}
          {workshop.status === "trial" && (
            <span className="absolute -right-8 top-4 w-28 rotate-45 bg-amber-100 text-amber-800 text-[10px] font-semibold text-center py-0.5">
              {t("workshopStatusTrial")}
            </span>
          )}
          {/* Fixed-height slot whether or not there is an icon, so the names
              line up across the row. */}
          <span className="flex items-center justify-center h-16">
            {workshop.spaceIconUrl && (
              <img src={workshop.spaceIconUrl} alt="" className="w-16 h-16 object-contain" />
            )}
          </span>
          {/* break-words: a tile is narrow enough that a single long name
              ("Mörkrumsverkstad") would otherwise spill past the padding, and
              normal wrapping can't break a word. */}
          <span className="mt-2 text-sm font-semibold leading-snug break-words max-w-full">
            {name}
          </span>
        </Link>
      </li>
    );
  }

  const excerpt = markdownExcerpt(localized(workshop.description, lang));
  return (
    <li className="mb-4 rounded-lg bg-white border border-gray-200 overflow-hidden list-none">
      <Link
        to={`/workshops/${workshop._id}`}
        className="block no-underline text-inherit transition-colors hover:bg-gray-50"
      >
        {workshop.imageUrl && (
          <img src={workshop.imageUrl} alt={name} className="w-full h-40 object-cover" />
        )}
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold leading-snug">{name}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <WorkshopStatusBadge status={workshop.status} />
              {workshop.spaceIconUrl && (
                <img
                  src={workshop.spaceIconUrl}
                  alt=""
                  className="w-10 h-10 object-contain"
                />
              )}
            </div>
          </div>
          {excerpt && (
            <p className="text-sm text-gray-500 mt-1 mb-0">{excerpt}</p>
          )}
        </div>
      </Link>
    </li>
  );
};

export default WorkshopCard;
