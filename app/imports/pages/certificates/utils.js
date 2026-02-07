export const getLocalized = (obj, lang) => {
  if (!obj) return "";
  return obj[lang] || obj.sv || obj.en || "";
};

export const formatDate = (date, lang) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US");
};

export const formatDateTime = (date, lang) => {
  if (!date) return "";
  const locale = lang === "sv" ? "sv-SE" : "en-US";
  return new Date(date).toLocaleString(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });
};
