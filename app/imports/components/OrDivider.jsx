import React from "react";
import { useTranslation } from "react-i18next";

const OrDivider = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-gray-300" />
      <span className="text-sm text-gray-400">{t("or")}</span>
      <div className="flex-1 h-px bg-gray-300" />
    </div>
  );
};

export default OrDivider;
