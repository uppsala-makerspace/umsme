export const STORAGE_NOTIFICATION_FROM =
  'Uppsala Makerspace Hyllplats <hyllplats@uppsalamakerspace.se>';
export const STORAGE_NOTIFICATION_REPLY_TO = 'hyllplats@uppsalamakerspace.se';

const date = (value) => value instanceof Date
  ? new Intl.DateTimeFormat('sv-SE', { dateStyle: 'long', timeZone: 'Europe/Stockholm' }).format(value)
  : null;
const unit = (context) => context.unit_name ? ` (${context.unit_name})` : '';
const deadline = (context) => context.deadline_at ? date(context.deadline_at) : null;

const templates = {
  assignment: (c) => ({
    subject: 'Du har fått en hyllplats',
    email: `Hej ${c.owner_name || ''}!\n\nDu är i kö för en hyllplats i Uppsala Makerspace. Du har tilldelats hyllplats${unit(c)}. Om du vill byta låda kan du ställa dig i kö igen i appen. Kontakta oss genom att svara på detta mejl om du har frågor.\n\nVänliga hälsningar\nUppsala Makerspace`,
    sms: `Uppsala Makerspace: Du har tilldelats hyllplats${unit(c)}. Se ditt mejl för mer information.`,
  }),
  move: (c) => ({
    subject: 'Din nya hyllplats är reserverad',
    email: `Hej ${c.owner_name || ''}!\n\nDu står i kö för att byta hyllplats på Uppsala Makerspace. En ny hyllplats${unit(c)} är reserverad åt dig. Flytta dina saker${deadline(c) ? ` senast ${deadline(c)}` : ' inom 14 dagar'}, och bekräfta flytten i appen, eller genom att svara på detta mail. Du kan också ställa frågor genom att svara på detta mail.\n\nVänliga hälsningar\nUppsala Makerspace`,
    sms: `Uppsala Makerspace: Ny hyllplats${unit(c)} är reserverad.${deadline(c) ? ` Flytta senast ${deadline(c)}.` : ''}`,
  }),
  warning: (c) => ({
    subject: 'Din hyllplats kräver aktivt labbmedlemskap',
    email: `Hej!\n\nDu har en hyllplats på Uppsala Makerspace, men ditt labbmedlemskap har gått ut. Du kan:\n\n- Förnya ditt labbmedlemskap och behålla din hyllplats\n- Komma och hämta dina saker\n- Donera dina saker\n\nSvara gärna snabbt, så att vi slipper tvångsomhänderta dina saker. Om du inte agerar ${deadline(c) ? `innan ${deadline(c)}` : 'inom 28 dagar'} så måste vi tyvärr donera eller slänga dina saker.\n\nVänliga hälsningar\nUppsala Makerspace`,
    sms: `Uppsala Makerspace: Förnya ditt labbmedlemskap eller töm hyllplatsen${deadline(c) ? ` senast ${deadline(c)}` : ''}.`,
  }),
  reminder: (c) => ({
    subject: 'Påminnelse om din hyllplats',
    email: `Hej ${c.owner_name || ''}!\n\nDetta är en påminnelse om att förnya ditt labbmedlemskap eller tömma hyllplatsen${deadline(c) ? ` senast ${deadline(c)}` : ''}.\n\nVänliga hälsningar\nUppsala Makerspace`,
    sms: `Uppsala Makerspace: Påminnelse – förnya labbmedlemskapet eller töm hyllplatsen${deadline(c) ? ` senast ${deadline(c)}` : ''}.`,
  }),
  reclamation: (c) => ({
    subject: 'Din hyllplats har markerats för tömning',
    email: `Hej ${c.owner_name || ''}!\n\nDin hyllplats${unit(c)} har markerats för tömning eftersom tidsfristen har passerat. Kontakta oss genom att svara på detta mejl.\n\nDina saker kommer ges bort till andra medlemmar. Kommande fixardag slängs det som ingen har tagit.\n\nVänliga hälsningar\nUppsala Makerspace`,
    sms: `Uppsala Makerspace: Din hyllplats${unit(c)} har markerats för tömning. Se ditt mejl.`,
  }),
  voluntary_release: (c) => ({
    subject: 'Din hyllplats är markerad som återlämnad',
    email: `Hej ${c.owner_name || ''}!\n\nDin hyllplats${unit(c)} är nu markerad som återlämnad. Ta gärna dina saker snarast. Tack!\n\nVänliga hälsningar\nUppsala Makerspace`,
    sms: `Uppsala Makerspace: Din hyllplats${unit(c)} är markerad som återlämnad. Tack!`,
  }),
};

export const renderStorageNotification = (type, context = {}) => {
  const template = templates[type];
  if (!template) return { status: 'missing_template', error: `Missing storage template: ${type}` };
  try {
    const rendered = template(context);
    return {
      status: 'rendered', template_id: `storage_${type}`,
      sender_from: STORAGE_NOTIFICATION_FROM, reply_to: STORAGE_NOTIFICATION_REPLY_TO,
      subject: rendered.subject, email: rendered.email, sms: rendered.sms,
    };
  } catch (error) {
    return { status: 'render_failed', error: error.message };
  }
};
