export const STORAGE_NOTIFICATION_FROM =
  'Uppsala Makerspace Hyllplats <hyllplats@uppsalamakerspace.se>';
export const STORAGE_NOTIFICATION_REPLY_TO = 'hyllplats@uppsalamakerspace.se';

const date = (value, locale = 'sv-SE') => value instanceof Date
  ? new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'Europe/Stockholm' }).format(value)
  : null;
const unit = (context) => context.unit_name ? ` (${context.unit_name})` : '';
const deadline = (context, locale) => date(context.deadline_at, locale);
const bilingual = (swedish, english, separator = '\n\n---\n\n') =>
  `${swedish}${separator}${english}`;

const templates = {
  assignment: (c) => ({
    subject: bilingual('Du har fått en hyllplats', 'You have been assigned a storage unit', ' — '),
    email: bilingual(
      `Hej ${c.owner_name || ''}!\n\nDu är i kö för en hyllplats i Uppsala Makerspace. Du har tilldelats hyllplats${unit(c)}. Om du vill byta låda kan du ställa dig i kö igen i appen. Kontakta oss genom att svara på detta mejl om du har frågor.\n\nVänliga hälsningar\nUppsala Makerspace`,
      `Hello ${c.owner_name || ''}!\n\nYou are in the queue for a storage unit at Uppsala Makerspace. You have been assigned storage unit${unit(c)}. If you would like a different unit, you can join the queue again in the app. Contact us by replying to this email if you have any questions.\n\nKind regards\nUppsala Makerspace`,
    ),
  }),
  move: (c) => ({
    subject: bilingual('Din nya hyllplats är reserverad', 'Your new storage unit is reserved', ' — '),
    email: bilingual(
      `Hej ${c.owner_name || ''}!\n\nDu står i kö för att byta hyllplats på Uppsala Makerspace. En ny hyllplats${unit(c)} är reserverad åt dig. Flytta dina saker${deadline(c) ? ` senast ${deadline(c)}` : ' inom 14 dagar'}, och bekräfta flytten i appen, eller genom att svara på detta mail. Du kan också ställa frågor genom att svara på detta mail.\n\nVänliga hälsningar\nUppsala Makerspace`,
      `Hello ${c.owner_name || ''}!\n\nYou are in the queue to change storage units at Uppsala Makerspace. A new storage unit${unit(c)} has been reserved for you. Move your belongings${deadline(c, 'en-GB') ? ` no later than ${deadline(c, 'en-GB')}` : ' within 14 days'}, and confirm the move in the app or by replying to this email. You can also ask questions by replying to this email.\n\nKind regards\nUppsala Makerspace`,
    ),
  }),
  warning: (c) => ({
    subject: bilingual('Din hyllplats kräver aktivt labbmedlemskap', 'Your storage unit requires an active lab membership', ' — '),
    email: bilingual(
      `Hej!\n\nDu har en hyllplats på Uppsala Makerspace, men ditt labbmedlemskap har gått ut. Du kan:\n\n- Förnya ditt labbmedlemskap och behålla din hyllplats\n- Komma och hämta dina saker\n- Donera dina saker\n\nSvara gärna snabbt, så att vi slipper tvångsomhänderta dina saker. Om du inte agerar ${deadline(c) ? `innan ${deadline(c)}` : 'inom 28 dagar'} så måste vi tyvärr donera eller slänga dina saker.\n\nVänliga hälsningar\nUppsala Makerspace`,
      `Hello!\n\nYou have a storage unit at Uppsala Makerspace, but your lab membership has expired. You can:\n\n- Renew your lab membership and keep your storage unit\n- Come and collect your belongings\n- Donate your belongings\n\nPlease reply promptly so that we do not have to take possession of your belongings. If you do not act ${deadline(c, 'en-GB') ? `before ${deadline(c, 'en-GB')}` : 'within 28 days'}, we will unfortunately have to donate or discard them.\n\nKind regards\nUppsala Makerspace`,
    ),
  }),
  reminder: (c) => ({
    subject: bilingual('Påminnelse om din hyllplats', 'Reminder about your storage unit', ' — '),
    email: bilingual(
      `Hej ${c.owner_name || ''}!\n\nDetta är en påminnelse om att förnya ditt labbmedlemskap eller tömma hyllplatsen${deadline(c) ? ` senast ${deadline(c)}` : ''}.\n\nVänliga hälsningar\nUppsala Makerspace`,
      `Hello ${c.owner_name || ''}!\n\nThis is a reminder to renew your lab membership or empty your storage unit${deadline(c, 'en-GB') ? ` no later than ${deadline(c, 'en-GB')}` : ''}.\n\nKind regards\nUppsala Makerspace`,
    ),
  }),
  reclamation: (c) => ({
    subject: bilingual('Din hyllplats har markerats för tömning', 'Your storage unit has been marked for clearance', ' — '),
    email: bilingual(
      `Hej ${c.owner_name || ''}!\n\nDin hyllplats${unit(c)} har markerats för tömning eftersom tidsfristen har passerat. Kontakta oss genom att svara på detta mejl.\n\nDina saker kommer ges bort till andra medlemmar. Kommande fixardag slängs det som ingen har tagit.\n\nVänliga hälsningar\nUppsala Makerspace`,
      `Hello ${c.owner_name || ''}!\n\nYour storage unit${unit(c)} has been marked for clearance because the deadline has passed. Contact us by replying to this email.\n\nYour belongings will be given away to other members. At the next fix day, anything that nobody has taken will be discarded.\n\nKind regards\nUppsala Makerspace`,
    ),
  }),
  voluntary_release: (c) => ({
    subject: bilingual('Din hyllplats är markerad som återlämnad', 'Your storage unit is marked as returned', ' — '),
    email: bilingual(
      `Hej ${c.owner_name || ''}!\n\nDin hyllplats${unit(c)} är nu markerad som återlämnad. Ta gärna dina saker snarast. Tack!\n\nVänliga hälsningar\nUppsala Makerspace`,
      `Hello ${c.owner_name || ''}!\n\nYour storage unit${unit(c)} is now marked as returned. Please collect your belongings as soon as possible. Thank you!\n\nKind regards\nUppsala Makerspace`,
    ),
  }),
};

export const renderStorageNotification = (type, context = {}) => {
  const template = templates[type];
  if (!template) return { status: 'missing_template', error: `Missing storage template: ${type}` };
  try {
    const rendered = template(context);
    return {
      status: 'rendered',
      sender_from: STORAGE_NOTIFICATION_FROM, reply_to: STORAGE_NOTIFICATION_REPLY_TO,
      subject: rendered.subject, email: rendered.email,
    };
  } catch (error) {
    return { status: 'render_failed', error: error.message };
  }
};
