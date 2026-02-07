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
    <button className="flex items-center text-black cursor-pointer border-none font-mono text-lg p-0 bg-transparent" onClick={handleLanguageSwitch}>
      <span className={i18n.language === "sv" ? "text-gray-500 cursor-default" : "text-black cursor-pointer hover:text-black"}>
        SV
      </span>
      <div className="w-px h-[25px] bg-black mx-2.5"></div>
      <span className={i18n.language === "en" ? "text-gray-500 cursor-default" : "text-black cursor-pointer hover:text-black"}>
        ENG
      </span>
    </button>
  );
};
