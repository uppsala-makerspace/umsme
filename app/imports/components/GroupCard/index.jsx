import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import GroupTypeTag from "/imports/components/GroupTypeTag";
import { localized } from "/imports/common/lib/groupRules";
import { markdownExcerpt } from "/imports/utils/markdown";

export const MembershipChip = ({ myState, myIsResponsible }) => {
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

/**
 * Group preview card: image banner, name with type tag (and membership chip
 * when the caller's state is known), member count, and a truncated
 * description excerpt in detailed mode. Used by the group list and the map's
 * space popup.
 */
const GroupCard = ({ group, compact = false }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const excerpt = compact ? "" : markdownExcerpt(localized(group.description, lang), 110);
  return (
    <li className="mb-3 rounded-lg bg-white border border-gray-200 overflow-hidden list-none">
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
            {typeof group.memberCount === "number" && (
              <span className="block text-xs text-gray-500 mt-0.5">
                {group.memberCount}{" "}
                {group.memberCount === 1 ? t("memberSingular") : t("memberPlural")}
              </span>
            )}
            {excerpt && (
              <span className="block text-sm text-gray-500 mt-1">{excerpt}</span>
            )}
          </div>
          <span className="text-gray-400 text-xl ml-2">&rarr;</span>
        </div>
      </Link>
    </li>
  );
};

export default GroupCard;
