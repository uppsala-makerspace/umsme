import React from "react";
import { useTranslation } from "react-i18next";
import './languageSwitcher.css';

export const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();

  const handleLanguageSwitch = () => {
    const newLang = i18n.language === "en" ? "sv" : "en";
    i18n.changeLanguage(newLang);
    localStorage.setItem("language", newLang); // Spara det nya språket i localStorage
  };

  return (
    <button className="language-switcher" onClick={handleLanguageSwitch}>
      <span className={i18n.language === "sv" ? "language.active" : "language"}>
        SV
      </span>
      <div className="divider"></div>
      <span className={i18n.language === "en" ? "language.active" : "language"}>
        ENG
      </span>
    </button>
  );
};
