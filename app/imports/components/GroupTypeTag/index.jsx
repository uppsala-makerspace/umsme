import React from "react";
import { useTranslation } from "react-i18next";

/**
 * Colored tag showing a group's type, shared by the groups list and the
 * workshop page. The colors deliberately avoid green and amber, which the
 * membership chips (member/responsible and pending) use.
 */
const tags = {
  interest: { labelKey: "groupTypeInterest", classes: "bg-purple-100 text-purple-800" },
  function: { labelKey: "groupTypeFunction", classes: "bg-gray-200 text-gray-700" },
  workshop: { labelKey: "groupTypeWorkshop", classes: "bg-rose-100 text-rose-800" },
  responsibility: { labelKey: "groupTypeActivity", classes: "bg-blue-100 text-blue-800" },
};

const GroupTypeTag = ({ type }) => {
  const { t } = useTranslation();
  const tag = tags[type];
  if (!tag) return null;
  return (
    <span className={`inline-block text-xs font-semibold rounded-full py-0.5 px-2 ${tag.classes}`}>
      {t(tag.labelKey)}
    </span>
  );
};

export default GroupTypeTag;
