import React from "react";
import { useTranslation } from "react-i18next";

/**
 * The join requests waiting for the reader's approval in a group
 * (`myRequestsToApprove` of a group summary), as a red badge beside their
 * membership chip: "1 request", "2 requests". Nothing when there are none.
 */
const RequestsBadge = ({ count }) => {
  const { t } = useTranslation();
  if (!(count > 0)) return null;
  return (
    <span className="inline-block text-xs font-semibold rounded-full py-0.5 px-2 bg-red-600 text-white">
      {count === 1 ? t("groupRequestsOne") : t("groupRequestsMany", { n: count })}
    </span>
  );
};

export default RequestsBadge;
