import React from "react";
import { useTranslation } from "react-i18next";

export const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();

  const handleLanguageSwitch = () => {
    const newLang = i18n.language === "sv" ? "en" : "sv";
    i18n.changeLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  return (
    <button className="flex items-center cursor-pointer border-none font-mono text-sm px-3 py-1 bg-gray-100 rounded-full" onClick={handleLanguageSwitch}>
      <span className={i18n.language === "sv" ? "text-brand-green font-bold" : "text-gray-500 cursor-pointer"}>
        SV
      </span>
      <div className="w-px h-4 bg-gray-300 mx-2"></div>
      <span className={i18n.language === "en" ? "text-brand-green font-bold" : "text-gray-500 cursor-pointer"}>
        ENG
      </span>
    </button>
  );
};
