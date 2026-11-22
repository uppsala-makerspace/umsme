import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import GroupTypeTag from "/imports/components/GroupTypeTag";
import StaffingBadge from "/imports/components/StaffingBadge";
import RequestsBadge from "/imports/components/RequestsBadge";
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
 * Group preview card: image banner, name with type tag, member count and
 * categories, and a truncated description excerpt in detailed mode. The
 * membership chip, when the caller's state is known, sits at the bottom
 * right, with a red badge before it for requests waiting for their approval: beside the excerpt's last line, or on the member count's line when
 * there is no excerpt. Used by the group list and the map's space popup.
 */
const GroupCard = ({ group, compact = false }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const excerpt = compact ? "" : markdownExcerpt(localized(group.description, lang), 110);
  // One's relation to the group, and the requests waiting for one's approval in red.
  const chip = (group.myState || group.myIsResponsible) && (
    <span className="ml-auto flex-shrink-0 flex items-center gap-1.5">
      <RequestsBadge count={group.myRequestsToApprove} />
      <MembershipChip myState={group.myState} myIsResponsible={group.myIsResponsible} />
    </span>
  );
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
            </span>
            {(typeof group.memberCount === "number" || group.categories?.length > 0 || (!excerpt && chip)) && (
              <span className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                {typeof group.memberCount === "number" && (
                  <span>
                    {group.memberCount}{" "}
                    {group.memberCount === 1 ? t("memberSingular") : t("memberPlural")}
                  </span>
                )}
                <StaffingBadge staffing={group.staffing} />
                {(group.categories || []).map((category) => (
                  <span
                    key={category._id}
                    className="inline-block rounded-full py-0.5 px-2 bg-gray-100 text-gray-700"
                  >
                    {localized(category.name, lang)}
                  </span>
                ))}
                {/* One's own relation to the group, at the bottom right: here when
                    there is no description below. */}
                {!excerpt && chip}
              </span>
            )}
            {excerpt && (
              <span className="flex items-end gap-2 mt-1">
                <span className="text-sm text-gray-500 flex-1">{excerpt}</span>
                {chip}
              </span>
            )}
          </div>
          <span className="text-gray-400 text-xl ml-2">&rarr;</span>
        </div>
      </Link>
    </li>
  );
};

export default GroupCard;
