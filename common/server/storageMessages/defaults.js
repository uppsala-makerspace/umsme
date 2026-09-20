import { MessageTemplates } from '/imports/common/collections/templates';
import { STORAGE_TEMPLATE_TYPES } from './templates';

const bilingual = (swedish, english, separator = '\n\n---\n\n') => `${swedish}${separator}${english}`;
const unit = '<% if (unitName) { %> (<%= unitName %>)<% } %>';

/**
 * The texts the storage messages shipped with. They are inserted as editable
 * templates the first time admin starts against a database that has no
 * template of the type at all, so an administrator who deprecates or rewrites
 * a template is never overruled by the code.
 */
export const STORAGE_DEFAULT_TEMPLATES = [
  {
    type: STORAGE_TEMPLATE_TYPES.assignment,
    name: 'Storage: assignment',
    subject: bilingual('Du har fått en hyllplats', 'You have been assigned a storage unit', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\nDu är i kö för en hyllplats i Uppsala Makerspace. Du har tilldelats hyllplats${unit}. Om du vill byta hyllplats kan du ställa dig i kö igen i appen. Kontakta oss genom att svara på detta mejl om du har frågor.\n\nVänliga hälsningar\nUppsala Makerspace`,
      `Hello <%= name %>!\n\nYou are in the queue for a storage unit at Uppsala Makerspace. You have been assigned storage unit${unit}. If you would like a different unit, you can join the queue again in the app. Contact us by replying to this email if you have any questions.\n\nKind regards\nUppsala Makerspace`,
    ),
  },
  {
    type: STORAGE_TEMPLATE_TYPES.move,
    name: 'Storage: move offer',
    subject: bilingual('Din nya hyllplats är reserverad', 'Your new storage unit is reserved', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\nDu står i kö för att byta hyllplats på Uppsala Makerspace. En ny hyllplats${unit} är reserverad åt dig. Flytta dina saker<% if (deadline) { %> senast <%= deadline %><% } else { %> inom 14 dagar<% } %>, och bekräfta flytten i appen, eller genom att svara på detta mail. Du kan också ställa frågor genom att svara på detta mail.\n\nVänliga hälsningar\nUppsala Makerspace`,
      `Hello <%= name %>!\n\nYou are in the queue to change storage units at Uppsala Makerspace. A new storage unit${unit} has been reserved for you. Move your belongings<% if (deadline) { %> no later than <%= deadline %><% } else { %> within 14 days<% } %>, and confirm the move in the app or by replying to this email. You can also ask questions by replying to this email.\n\nKind regards\nUppsala Makerspace`,
    ),
  },
  {
    type: STORAGE_TEMPLATE_TYPES.warning,
    name: 'Storage: warning',
    subject: bilingual('Din hyllplats kräver aktivt labbmedlemskap', 'Your storage unit requires an active lab membership', ' — '),
    messagetext: bilingual(
      `Hej!\n\nDu har en hyllplats på Uppsala Makerspace, men ditt labbmedlemskap har gått ut. Du kan:\n\n- Förnya ditt labbmedlemskap och behålla din hyllplats\n- Komma och hämta dina saker\n- Donera dina saker\n\nSvara gärna snabbt, så att vi slipper tvångsomhänderta dina saker. Om du inte agerar <% if (deadline) { %>innan <%= deadline %><% } else { %>inom 28 dagar<% } %> så måste vi tyvärr donera eller slänga dina saker.\n\nVänliga hälsningar\nUppsala Makerspace`,
      `Hello!\n\nYou have a storage unit at Uppsala Makerspace, but your lab membership has expired. You can:\n\n- Renew your lab membership and keep your storage unit\n- Come and collect your belongings\n- Donate your belongings\n\nPlease reply promptly so that we do not have to take possession of your belongings. If you do not act <% if (deadline) { %>before <%= deadline %><% } else { %>within 28 days<% } %>, we will unfortunately have to donate or discard them.\n\nKind regards\nUppsala Makerspace`,
    ),
  },
  {
    type: STORAGE_TEMPLATE_TYPES.reminder,
    name: 'Storage: reminder',
    subject: bilingual('Påminnelse om din hyllplats', 'Reminder about your storage unit', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\nDetta är en påminnelse om att förnya ditt labbmedlemskap eller tömma hyllplatsen<% if (deadline) { %> senast <%= deadline %><% } %>.\n\nVänliga hälsningar\nUppsala Makerspace`,
      `Hello <%= name %>!\n\nThis is a reminder to renew your lab membership or empty your storage unit<% if (deadline) { %> no later than <%= deadline %><% } %>.\n\nKind regards\nUppsala Makerspace`,
    ),
  },
  {
    type: STORAGE_TEMPLATE_TYPES.reclamation,
    name: 'Storage: reclamation',
    subject: bilingual('Din hyllplats har markerats för tömning', 'Your storage unit has been marked for clearance', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\nDin hyllplats${unit} har markerats för tömning eftersom tidsfristen har passerat. Kontakta oss genom att svara på detta mejl.\n\nDina saker kommer ges bort till andra medlemmar. Kommande fixardag slängs det som ingen har tagit.\n\nVänliga hälsningar\nUppsala Makerspace`,
      `Hello <%= name %>!\n\nYour storage unit${unit} has been marked for clearance because the deadline has passed. Contact us by replying to this email.\n\nYour belongings will be given away to other members. At the next fix day, anything that nobody has taken will be discarded.\n\nKind regards\nUppsala Makerspace`,
    ),
  },
  {
    type: STORAGE_TEMPLATE_TYPES.voluntary_release,
    name: 'Storage: voluntary release',
    subject: bilingual('Din hyllplats är markerad som återlämnad', 'Your storage unit is marked as returned', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\nDin hyllplats${unit} är nu markerad som återlämnad. Ta gärna dina saker snarast. Tack!\n\nVänliga hälsningar\nUppsala Makerspace`,
      `Hello <%= name %>!\n\nYour storage unit${unit} is now marked as returned. Please collect your belongings as soon as possible. Thank you!\n\nKind regards\nUppsala Makerspace`,
    ),
  },
];

/**
 * Insert the default template for every storage type that has no template
 * yet, deprecated or not. Idempotent and cheap once every type exists.
 * Returns the types that were seeded.
 */
export const ensureStorageMessageTemplates = async ({ now = new Date() } = {}) => {
  const seeded = [];
  for (const defaults of STORAGE_DEFAULT_TEMPLATES) {
    const existing = await MessageTemplates.findOneAsync({ type: defaults.type }, { fields: { _id: 1 } });
    if (existing) continue;
    await MessageTemplates.insertAsync({
      ...defaults, membershiptype: 'lab', auto: true, deprecated: false, created: now, modified: now,
    });
    seeded.push(defaults.type);
  }
  if (seeded.length) console.log(`[storage] seeded message templates: ${seeded.join(', ')}`);
  return seeded;
};
