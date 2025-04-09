import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './labels/en.json';
import svTranslations from './labels/sv.json';

i18n.use(initReactI18next) 
  .init({
    resources: {
      en: { translation: enTranslations },
      sv: { translation: svTranslations },
    },
    lng: "en", // Standard språk
    fallbackLng: "en", // Om översättning saknas, använd engelska
    interpolation: {
      escapeValue: false, // React gör redan HTML-escapingen
    },
  });

export default i18n;
