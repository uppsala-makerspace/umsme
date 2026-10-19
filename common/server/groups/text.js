/** Trimmed text, '' for anything else. */
export const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** { sv, en } with the empty languages left out, or null if both are empty. */
export const bilingual = (value) => {
  const sv = text(value?.sv);
  const en = text(value?.en);
  return sv || en ? { ...(sv ? { sv } : {}), ...(en ? { en } : {}) } : null;
};

/** Put each field in $set if it has a value, in $unset if not. */
export const setOrUnset = (target, entries) => {
  for (const [field, value] of Object.entries(entries)) {
    const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) target.$unset[field] = ''; else target.$set[field] = value;
  }
};
