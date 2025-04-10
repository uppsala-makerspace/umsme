import React, { useState } from "react";
import { useTranslation } from "react-i18next";

export const LogRegSwitcher = ({ setFormType, formType, onClick }) => {
  const { t } = useTranslation();
  const handleSwitch = () => {
    const newType = formType === "login" ? "register" : "login";
    setFormType(newType);
    onClick();
  };

  return (
    <button className="logreg-switcher" onClick={handleSwitch}>
      <span className={formType === "login" ? "active" : ""}>{t("login")}</span>
      <div className="divider"></div>
      <span className={formType === "register" ? "active" : ""}>
        {t("register")}
      </span>
    </button>
  );
};
