import React, { useRef } from "react";
import { useTranslation } from "react-i18next";

export const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const longPressTimer = useRef(null);
  const didLongPress = useRef(false);

  const toggleCimode = () => {
    const newLang = i18n.language === "cimode" ? (localStorage.getItem("language") || "sv") : "cimode";
    i18n.changeLanguage(newLang);
  };

  const handleClick = (e) => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    if (e.shiftKey || e.ctrlKey) {
      toggleCimode();
      return;
    }
    const newLang = i18n.language === "sv" ? "en" : "sv";
    i18n.changeLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const handleTouchStart = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      toggleCimode();
    }, 2000);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const buttonClass = "flex items-center cursor-pointer border-none font-mono text-sm px-3 py-1 bg-gray-100 rounded-full";

  if (i18n.language === "cimode") {
    return (
      <button className={buttonClass} onClick={handleClick} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <span className="text-brand-green font-bold">i18n</span>
      </button>
    );
  }

  return (
    <button className={buttonClass} onClick={handleClick} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
