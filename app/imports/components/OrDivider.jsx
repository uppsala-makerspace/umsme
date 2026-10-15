import React from "react";
import { useTranslation } from "react-i18next";

/** A rule with a short text in the middle; "or" unless a `label` is given. */
const OrDivider = ({ label }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-gray-300" />
      <span className="text-sm text-gray-400 text-center">{label || t("or")}</span>
      <div className="flex-1 h-px bg-gray-300" />
    </div>
  );
};

export default OrDivider;
