/**
 * Format a date according to the current locale
 * @param {Date} date - The date to format
 * @param {string} language - The i18n language code (e.g., 'sv', 'en')
 * @returns {string} The formatted date string
 */
export const formatDate = (date, language) => {
  const locale = language === 'sv' ? 'sv-SE' : 'en-US';
  return new Date(date).toLocaleDateString(locale);
};
