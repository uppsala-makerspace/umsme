/** Normalize Swedish mobile numbers to E.164. Non-mobile/ambiguous input is rejected. */
export const normalizeSwedishMobile = (input) => {
  if (!input) return null;
  let digits = String(input).trim().replace(/[\s().-]/g, '');
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
  else if (digits.startsWith('0')) digits = `+46${digits.slice(1)}`;
  else if (digits.startsWith('46')) digits = `+${digits}`;
  if (!/^\+467\d{8}$/.test(digits)) return null;
  return digits;
};
