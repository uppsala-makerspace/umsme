import React from "react";
import { useTranslation } from "react-i18next";

/**
 * Tag marking an area of interest (intresseområde) where it appears next to
 * workshops and groups, e.g. in the map's space popup. Purple, the color the
 * interest group tag used before areas of interest replaced interest groups.
 */
const AreaOfInterestTag = () => {
  const { t } = useTranslation();
  return (
    <span className="inline-block text-xs font-semibold rounded-full py-0.5 px-2 bg-purple-100 text-purple-800">
      {t("areaOfInterest")}
    </span>
  );
};

export default AreaOfInterestTag;
