import React from "react";
import { useTranslation } from "react-i18next";

const TONES = {
  seeking: { classes: "bg-orange-500 text-white", key: "groupSeekingBadge" },
  full: { classes: "bg-gray-700 text-white", key: "groupFullBadge" },
};

/**
 * Whether a group is looking for members or is full (`staffing`, from
 * staffingOf in common/lib/groupRules.js), as a badge right after its member
 * count. Nothing when neither.
 */
const StaffingBadge = ({ staffing }) => {
  const { t } = useTranslation();
  const tone = TONES[staffing];
  if (!tone) return null;
  return (
    <span className={`inline-block text-xs font-semibold rounded-full py-0.5 px-2 ${tone.classes}`}>
      {t(tone.key)}
    </span>
  );
};

export default StaffingBadge;
