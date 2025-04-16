import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "./labels/en.json";
import svTranslations from "./labels/sv.json";

// Läs det sparade språket från localStorage, eller använd "sv" som standard
const savedLanguage = localStorage.getItem("language") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslations },
    sv: { translation: svTranslations },
  },
  lng: savedLanguage, // Standard språk
  fallbackLng: "sv",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
