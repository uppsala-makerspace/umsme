import { template as _template } from 'underscore';

// Mirrors every variable surfaced by common/lib/message.js → messageData().
// Used by the "Test templates" button and as a validity gate before saving,
// so the admin can render and verify a template's underscore syntax without
// sending a real message.
export const SAMPLE_DATA = {
  id: 'sample-id',
  mid: 'M-001',
  name: 'Sample Member',
  email: 'sample@example.com',
  family: false,
  familyMembers: '',
  youth: false,
  liability: true,
  pending: false,
  memberStartDate: '2025-05-11',
  memberEndDate: '2026-05-11',
  labStartDate: '2025-05-11',
  labEndDate: '2026-05-11',
  amount: 1600,
  type: 'lab',
  discount: false,
  startPeriod: '2026-05-11',
  endMemberPeriod: '2027-05-11',
  endLabPeriod: '2027-05-11',
};

const TEMPLATE_FIELDS = ['subject', 'messagetext', 'sms'];

/**
 * Compile and render each non-empty template field on `doc` against
 * SAMPLE_DATA. Returns the per-field rendered output and any compile /
 * render errors. Doesn't throw.
 */
export const renderTemplates = (doc) => {
  const errors = [];
  const renders = [];
  for (const field of TEMPLATE_FIELDS) {
    const src = doc?.[field];
    if (!src) continue;
    try {
      const out = _template(src)(SAMPLE_DATA);
      renders.push(`--- ${field} ---\n${out}`);
    } catch (err) {
      errors.push(`${field}: ${err.message}`);
    }
  }
  return { errors, renders };
};

/**
 * Same as renderTemplates() but folds the result into the shape used by
 * the inline test-result panel: `{ hasError, message }`.
 */
export const testTemplates = (doc) => {
  const { errors, renders } = renderTemplates(doc);
  if (errors.length) {
    return { hasError: true, message: `Errors:\n\n${errors.join('\n\n')}` };
  }
  if (renders.length === 0) {
    return { hasError: true, message: 'No template fields are set — nothing to test.' };
  }
  return {
    hasError: false,
    message: `All templates rendered with sample data.\n\n${renders.join('\n\n')}`,
  };
};
