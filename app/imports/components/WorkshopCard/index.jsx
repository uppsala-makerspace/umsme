import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { localized } from "/imports/common/lib/groupRules";
import { markdownExcerpt } from "/imports/utils/markdown";
import WorkshopStatusBadge from "/imports/pages/workshops/components/WorkshopStatusBadge";

/**
 * Workshop preview card: image banner, localized name with status badge, and
 * a truncated description excerpt. Used by the workshop list and the map's
 * space popup. In `compact` mode the image and excerpt are hidden with
 * tighter padding, matching GroupCard.
 */
const WorkshopCard = ({ workshop, compact = false }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const excerpt = compact ? "" : markdownExcerpt(localized(workshop.description, lang));
  return (
    <li className="mb-4 rounded-lg bg-white border border-gray-200 overflow-hidden list-none">
      <Link
        to={`/workshops/${workshop._id}`}
        className="block no-underline text-inherit transition-colors hover:bg-gray-50"
      >
        {!compact && workshop.imageUrl && (
          <img
            src={workshop.imageUrl}
            alt={localized(workshop.name, lang)}
            className="w-full h-40 object-cover"
          />
        )}
        <div className={compact ? "p-3" : "p-4"}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold leading-snug">
              {localized(workshop.name, lang)}
            </span>
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
