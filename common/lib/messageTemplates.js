import { template as compile } from 'underscore';
import { models } from './models';

/**
 * Message templates: the variables a template can use, sample data to try a
 * template with, and checking that a template compiles. One source for the
 * admin form's "Test templates", its documentation and the server's check
 * before saving. The variables follow common/lib/message.js → messageData().
 *
 * Templates use underscore: <%= name %> inserts a value, <% if (family) { %>
 * … <% } %> runs code.
 */

/** The template types, membership types and member types, as models.js lists them. */
const optionsOf = (field) => Object.entries(models.template[field].autoform.options)
  .map(([value, label]) => ({ value, label }));
export const TEMPLATE_TYPES = optionsOf('type');
export const MEMBERSHIP_TYPES = optionsOf('membershiptype');
export const MEMBER_TYPES = optionsOf('membertype');

/** The variables, by the templates they are available in. */
export const TEMPLATE_VARIABLE_GROUPS = [
  {
    title: 'Every template',
    variables: [
      { name: 'name', type: 'string', sample: 'Sample Member', description: "The member's name." },
      { name: 'id', type: 'string', sample: 'sample-id', description: "The member's unique id in the system." },
      { name: 'mid', type: 'string', sample: 'M-001', description: "The member's short member number." },
      { name: 'email', type: 'string', sample: 'sample@example.com', description: "The member's email address." },
      { name: 'family', type: 'boolean', sample: false, description: 'True if the member is part of a family.' },
      { name: 'familyMembers', type: 'string', sample: '', description: 'The family members this member pays for, comma separated.' },
      { name: 'youth', type: 'boolean', sample: false, description: 'True if the member is under 16.' },
      { name: 'liability', type: 'boolean', sample: true, description: 'True if the member has approved the liability agreement.' },
      { name: 'pending', type: 'boolean', sample: false, description: 'True if the member is waiting for board approval.' },
      { name: 'memberStartDate', type: 'date', sample: '2025-05-11', description: 'When the member last renewed the membership.' },
      { name: 'memberEndDate', type: 'date', sample: '2026-05-11', description: 'When the membership ends.' },
      { name: 'labStartDate', type: 'date', sample: '2025-05-11', description: 'When the member last renewed the lab membership.' },
      { name: 'labEndDate', type: 'date', sample: '2026-05-11', description: 'When the lab membership ends.' },
    ],
  },
  {
    title: 'Welcome and confirmation templates',
    note: 'Rendered for a particular membership payment, so not in reminders.',
    variables: [
      { name: 'amount', type: 'integer', sample: 1600, description: 'The amount paid.' },
      { name: 'type', type: 'member | lab | labandmember', sample: 'lab', description: 'What the payment bought.' },
      { name: 'discount', type: 'boolean', sample: false, description: 'True if the member got a discount.' },
      { name: 'startPeriod', type: 'date', sample: '2026-05-11', description: 'When the paid period starts.' },
      { name: 'endMemberPeriod', type: 'date', sample: '2027-05-11', description: 'When the membership paid for ends; empty for type lab.' },
      { name: 'endLabPeriod', type: 'date', sample: '2027-05-11', description: 'When the lab membership paid for ends; empty for type member.' },
    ],
  },
  {
    title: 'Purchase receipts',
    note: 'Rendered for a web shop purchase.',
    variables: [
      { name: 'amount', type: 'integer', sample: 1600, description: 'The amount paid.' },
      { name: 'itemName', type: 'string', sample: 'Lera, 5 kg', description: 'The name of the item bought.' },
      { name: 'itemCode', type: 'string', sample: 'lera', description: "The item's code." },
      { name: 'comment', type: 'string', sample: 'Anna Andersson', description: "The buyer's comment, if the item asks for one." },
      { name: 'purchaseDate', type: 'date', sample: '2026-05-11', description: 'When the purchase was paid.' },
    ],
  },
  {
    title: 'Storage templates',
    note: 'Sent automatically when an administrator confirms a storage decision. One non-deprecated '
      + 'template per storage type is expected; one marked Automatic is preferred. Write the Swedish '
      + 'text first and the English second.',
    variables: [
      { name: 'unitName', type: 'string', sample: '1001', description: 'The storage unit the message is about; empty when there is none.' },
      { name: 'deadline', type: 'date', sample: '2026-06-08', description: 'When a move must be done or a warned member must act; empty when there is none.' },
    ],
  },
];

/** Every variable with its sample value. */
export const SAMPLE_DATA = Object.fromEntries(
  TEMPLATE_VARIABLE_GROUPS.flatMap(({ variables }) => variables.map(({ name, sample }) => [name, sample])),
);

const TEMPLATE_FIELDS = ['subject', 'messagetext', 'sms'];

/**
 * Compile and render each non-empty template field of `doc` with the sample
 * data. Never throws.
 *
 * @returns {{ errors: string[], renders: Array<{ field: string, output: string }> }}
 */
export const renderTemplates = (doc) => {
  const errors = [];
  const renders = [];
  for (const field of TEMPLATE_FIELDS) {
    const source = doc?.[field];
    if (!source) continue;
    try {
      renders.push({ field, output: compile(source)(SAMPLE_DATA) });
    } catch (error) {
      errors.push(`${field}: ${error.message}`);
    }
  }
  return { errors, renders };
};

/**
 * renderTemplates() as one verdict: `{ hasError, message }`, the message
 * being the errors or the rendered fields.
 */
export const testTemplates = (doc) => {
  const { errors, renders } = renderTemplates(doc);
  if (errors.length) return { hasError: true, message: `Errors:\n\n${errors.join('\n\n')}` };
  if (renders.length === 0) return { hasError: true, message: 'No template fields are set — nothing to test.' };
  return {
    hasError: false,
    message: `All templates rendered with sample data.\n\n${renders.map(({ field, output }) => `--- ${field} ---\n${output}`).join('\n\n')}`,
  };
};
