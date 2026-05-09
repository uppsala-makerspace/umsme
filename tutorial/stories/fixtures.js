// Single source of truth for the fictional member shown across every tutorial
// screenshot. Change a name or date here and every story re-renders with the
// new value, so all generated screens stay coherent.

export const member = {
  name: "Sven Svensson",
  firstName: "Sven",
  email: "sven@example.com",
  phone: "0701234567",
  rfid: "A1B2C3D4",
  mid: 12345,
  _id: "sven-id",
  family: false,
};

export const partnerMember = {
  name: "The_Partner",
  firstName: "The_Partner",
  email: "the-partner@example.com",
  mid: 25322,
  _id: "partner-id",
  family: false,
  infamily: "sven-id",
};

const today = new Date();
const inAyear = new Date();
inAyear.setFullYear(inAyear.getFullYear() + 1);

export const dates = {
  memberStart: today,
  memberEnd: inAyear,
  labEnd: inAyear,
  liabilityApprovedDate: today,
  liabilityDocumentDate: new Date("2024-01-15"),
};

// Active "yearly lab" membership status that Home.jsx and similar pages expect.
export const activeLabStatus = {
  memberStart: dates.memberStart,
  memberEnd: dates.memberEnd,
  labEnd: dates.labEnd,
  type: "labandmember",
};

// Status with an end date 12 days out, used for the renewal-reminder home.
const renewalEnd = new Date();
renewalEnd.setDate(renewalEnd.getDate() + 12);
export const renewalStatus = {
  memberStart: dates.memberStart,
  memberEnd: renewalEnd,
  labEnd: renewalEnd,
  type: "labandmember",
};

// Messages card defaults — one personal message, no announcements.
export const messages = {
  announcementCount: 0,
  messageCount: 1,
  hasNewMessages: false,
  hasNewMessage: false,
  hasNewAnnouncement: false,
  latestMessageDate: dates.memberStart,
  latestAnnouncementDate: null,
};

// Family payer fixtures — used by family-account, family-related home variants.
export const familyMember = { ...member, family: true };

export const familyInvites = [
  { email: "the-small-one@example.com" },
  { email: "the-partner@example.com" },
];

export const familyMembersAccepted = []; // none accepted yet for family-account screenshot

export const familyLabStatus = {
  memberStart: dates.memberStart,
  memberEnd: dates.memberEnd,
  labEnd: dates.labEnd,
  type: "labandmember",
  family: true,
};

// Membership history rows that show under My Account → Membership history.
export const labMembershipHistory = [
  {
    _id: "current",
    type: "labandmember",
    start: dates.memberStart,
    memberend: dates.memberEnd,
    labend: dates.labEnd,
  },
];

export const familyLabMembershipHistory = [
  {
    _id: "current",
    type: "labandmember",
    start: dates.memberStart,
    memberend: dates.memberEnd,
    labend: dates.labEnd,
    family: true,
  },
];

// Liability agreement text — sample, mirrors the real document structure.
export const liabilityText = {
  en: `## 1. General

By approving this liability agreement, I confirm that I understand and accept the terms and conditions for the use of Uppsala Makerspace facilities and equipment.

## 2. Safety

- I commit to following all safety rules and instructions.
- I will use appropriate protective equipment when required.
- I will report any damages or safety risks to the board.

## 3. Liability

I am aware that the use of tools and machines is at my own risk. Uppsala Makerspace is not responsible for personal injury or property damage arising from the use of the premises or equipment.

## 4. Equipment

- I commit to treating all equipment with care.
- I will clean up after myself and leave the workspace in good condition.
- I will report broken or faulty equipment.`,
  sv: `## 1. Allmänt

Genom att godkänna denna ansvarsförbindelse bekräftar jag att jag förstår och accepterar de villkor som gäller för användning av Uppsala Makerspace lokaler och utrustning.

## 2. Säkerhet

- Jag förbinder mig att följa alla säkerhetsregler och instruktioner.
- Jag kommer att använda lämplig skyddsutrustning när så krävs.
- Jag kommer att rapportera eventuella skador eller säkerhetsrisker till styrelsen.

## 3. Ansvar

Jag är medveten om att användning av verktyg och maskiner sker på egen risk. Uppsala Makerspace ansvarar inte för personskador eller skador på egendom som uppstår genom användning av lokalen eller utrustningen.

## 4. Utrustning

- Jag förbinder mig att behandla all utrustning med omsorg.
- Jag kommer att städa efter mig och lämna arbetsplatsen i gott skick.
- Jag kommer att rapportera trasig eller felaktig utrustning.`,
};

// Membership selection options (the four pricing tiers).
export const membershipOptions = [
  {
    paymentType: "memberBase",
    amount: 200,
    period: "year",
    label: { en: "Yearly Basic membership", sv: "Årligt Medlemskap Bas" },
    description: {
      en: "Access during open evenings and Saturday workshops.",
      sv: "Tillgång under öppna kvällar och lördagskurser.",
    },
  },
  {
    paymentType: "memberDiscountedBase",
    amount: 100,
    period: "year",
    label: {
      en: "Yearly Basic membership (discounted)",
      sv: "Årligt Medlemskap Bas (rabatterat)",
    },
    description: {
      en: "For students, pensioners, or unemployed.",
      sv: "För studenter, pensionärer eller arbetslösa.",
    },
    discountedOnly: true,
  },
  {
    paymentType: "memberLab",
    amount: 1600,
    period: "year",
    label: { en: "Yearly Lab Membership", sv: "Årligt Medlemskap Labb" },
    description: {
      en: "24/7 access to the Makerspace.",
      sv: "24/7 tillgång till Makerspace.",
    },
  },
  {
    paymentType: "memberDiscountedLab",
    amount: 1200,
    period: "year",
    label: {
      en: "Yearly Lab Membership (discounted)",
      sv: "Årligt Medlemskap Labb (rabatterat)",
    },
    description: {
      en: "24/7 access at a reduced price.",
      sv: "24/7 tillgång till reducerat pris.",
    },
    discountedOnly: true,
  },
  {
    paymentType: "memberQuarterlyLab",
    amount: 450,
    period: "quarter",
    label: { en: "Quarterly Lab Access", sv: "Kvartalsvis Labbåtkomst" },
    description: {
      en: "24/7 access for three months.",
      sv: "24/7 tillgång i tre månader.",
    },
  },
];

// Payment selection: terms-of-purchase markdown + a representative paymentOption.
export const termsContent = {
  en: `# Terms of Purchase\n\n## Membership\nBy purchasing a membership you agree to follow the rules and regulations of Uppsala Makerspace.`,
  sv: `# Köpvillkor\n\n## Medlemskap\nGenom att köpa ett medlemskap åtar du dig att följa Uppsala Makerspace regler.`,
};

export const otherPaymentOptionsUrl =
  "https://www.uppsalamakerspace.se/bli-medlem/";

// Doors list for the doors screen (out-of-range so distance label appears).
export const doorsList = [
  {
    id: "outerDoor",
    labelKey: "outerDoor",
    location: { lat: 59.858, long: 17.639 },
  },
  {
    id: "upperFloor",
    labelKey: "upperFloor",
    location: { lat: 59.858, long: 17.639 },
  },
  {
    id: "lowerFloor",
    labelKey: "lowerFloor",
    location: { lat: 59.858, long: 17.639 },
  },
];

// Far-away user position (~196 km from Uppsala) so the doors page shows the
// "you are far away" state with the distance label that the manual screenshot
// was captured in.
export const userFarAway = { lat: 58.0, long: 16.0 };
