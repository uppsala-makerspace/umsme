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

// User position ~2.3 km north of the makerspace (across town), so the doors
// page shows grey door tiles with a plausible distance label and the
// "door won't turn green?" help panel underneath.
export const userAcrossTown = { lat: 59.8787, long: 17.639 };

// --- Expenses -------------------------------------------------------------

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const daysAhead = (n) => daysAgo(-n);
const isoDay = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// A fake receipt drawn as SVG, so expense screenshots show a document without
// using anyone's real receipt.
export const receiptImage = ({ shop, address, date, lines, total }) => {
  const rows = lines
    .map(([item, price], i) =>
      `<text x="24" y="${170 + i * 30}">${item}</text><text x="336" y="${170 + i * 30}" text-anchor="end">${price}</text>`)
    .join("");
  const end = 170 + lines.length * 30;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="${end + 120}" font-family="monospace" font-size="17" fill="#222">
<rect width="100%" height="100%" fill="#fffdf7"/>
<text x="180" y="50" text-anchor="middle" font-size="24" font-weight="bold">${shop}</text>
<text x="180" y="80" text-anchor="middle">${address}</text>
<text x="180" y="110" text-anchor="middle">${date}</text>
<line x1="24" y1="135" x2="336" y2="135" stroke="#999" stroke-dasharray="4 4"/>
${rows}
<line x1="24" y1="${end}" x2="336" y2="${end}" stroke="#999" stroke-dasharray="4 4"/>
<text x="24" y="${end + 35}" font-weight="bold">TOTALT</text><text x="336" y="${end + 35}" text-anchor="end" font-weight="bold">${total}</text>
<text x="180" y="${end + 80}" text-anchor="middle" font-size="14">Kortbetalning · Tack för ditt köp!</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const sandpaperReceipt = receiptImage({
  shop: "JÄRNHANDELN",
  address: "Storgatan 12, Uppsala",
  // Same day as the expense it belongs to (myExpenses[1], three days ago).
  date: `${isoDay(daysAgo(3))} 15:42`,
  lines: [["Slippapper K120 x10", "89,00"], ["Slippapper K240 x10", "89,00"], ["Träskruv 4x40 200st", "129,00"], ["Trälim 0,75 l", "105,00"]],
  total: "412,00",
});

// Anna's expense waiting for approval (toApprove[0]), two days ago.
export const bandsawReceipt = receiptImage({
  shop: "JÄRNHANDELN",
  address: "Storgatan 12, Uppsala",
  date: `${isoDay(daysAgo(2))} 10:15`,
  lines: [["Bandsågsblad 2240 mm", "349,00"], ["Slipband K80 x5", "119,00"], ["Slipband K120 x5", "100,00"]],
  total: "568,00",
});

export const expenseAccounts = [
  {
    _id: "acc-wood",
    name: "Träverkstadens konto",
    explanation: "Förbrukningsmaterial, verktyg och reservdelar till träverkstaden.",
    canSpend: true,
    groupNames: [{ sv: "Träverkstaden", en: "Wood workshop" }],
  },
  {
    _id: "acc-textile",
    name: "Textilverkstadens konto",
    explanation: "Tråd, nålar, tyg och tillbehör till symaskinerna.",
    canSpend: true,
    groupNames: [{ sv: "Textilverkstaden", en: "Textile workshop" }],
  },
];

const WOOD = "Träverkstadens konto";
const TEXTILE = "Textilverkstadens konto";

// Sven's own expenses, one in each state the tutorial talks about.
export const myExpenses = [
  {
    _id: "e-draft", status: "pending", type: "receipt", date: daysAgo(1),
    amount: 249, accountName: WOOD, note: "Nya stämjärn till hyvelbänken",
  },
  {
    _id: "e-sub", status: "submitted", type: "receipt", date: daysAgo(3), submittedAt: daysAgo(3),
    amount: 412, accountName: WOOD, note: "Sandpapper, skruv och trälim",
  },
  {
    _id: "e-inv", status: "confirmed", type: "invoice", date: daysAgo(6), dueDate: daysAhead(24),
    submittedAt: daysAgo(6), confirmedAt: daysAgo(4),
    amount: 3150, accountName: WOOD, note: "Ny sågklinga till bordsågen",
  },
  {
    _id: "e-paid", status: "reimbursed", type: "receipt", date: daysAgo(30), submittedAt: daysAgo(30),
    confirmedAt: daysAgo(28), reimbursedDate: daysAgo(25),
    amount: 185, accountName: TEXTILE, note: "Symaskinsnålar och tråd",
  },
];

// Waiting for Sven as approver of the wood workshop's account.
export const toApprove = [
  {
    _id: "a-1", status: "submitted", type: "receipt", date: daysAgo(2), submittedAt: daysAgo(2),
    amount: 568, accountName: WOOD, note: "Bandsågsblad och slipband", submitterName: "Anna Andersson",
  },
  {
    _id: "a-2", status: "submitted", type: "invoice", date: daysAgo(1), submittedAt: daysAgo(1), dueDate: daysAhead(29),
    amount: 1890, accountName: WOOD, note: "Dammsugare till verkstaden", submitterName: "Bo Berg",
  },
];

export const recentlyReviewed = [
  {
    _id: "a-3", status: "confirmed", type: "receipt", date: daysAgo(9), submittedAt: daysAgo(9), confirmedAt: daysAgo(8),
    amount: 980, accountName: WOOD, note: "Bandsågsblad", submitterName: "Cecilia Carlsson",
  },
];

const totals = (submitted, confirmed, reimbursed) => ({ submitted, confirmed, reimbursed });

// The wood workshop's account this year. The budget view's card and the
// account page are built from the same expenses, so their figures agree:
// reimbursed 2310 + 2250 + 4100 = 8660, confirmed 980 + 3150 = 4130,
// submitted 412.
const woodExpenses = [
  {
    _id: "w-1", memberName: "Anna Andersson", isMine: false, status: "reimbursed", type: "receipt",
    date: daysAgo(40), amount: 2310, place: "Järnhandeln", note: "Slippapper och skruv i storpack",
    submittedAt: daysAgo(40), confirmedAt: daysAgo(38), confirmedByName: "Sven Svensson",
    bookkeepingAccount: "5460", bookkeepingAccountName: "Förbrukningsmaterial", reimbursedDate: daysAgo(35),
  },
  {
    _id: "w-2", memberName: "Bo Berg", isMine: false, status: "reimbursed", type: "invoice",
    date: daysAgo(32), dueDate: daysAgo(2), amount: 4100, place: "Verktygsgrossisten", note: "Bandslipmaskin",
    submittedAt: daysAgo(32), confirmedAt: daysAgo(31), confirmedByName: "Sven Svensson",
    bookkeepingAccount: "5410", bookkeepingAccountName: "Förbrukningsinventarier", reimbursedDate: daysAgo(10),
  },
  {
    _id: "w-3", memberName: "Sven Svensson", isMine: true, status: "reimbursed", type: "receipt",
    date: daysAgo(20), amount: 2250, place: "Byggvaruhuset", note: "Trälim, tvingar och maskeringstejp",
    submittedAt: daysAgo(20), confirmedAt: daysAgo(18), confirmedByName: "Anna Andersson",
    bookkeepingAccount: "5460", bookkeepingAccountName: "Förbrukningsmaterial", reimbursedDate: daysAgo(15),
  },
  {
    _id: "w-4", memberName: "Cecilia Carlsson", isMine: false, status: "confirmed", type: "receipt",
    date: daysAgo(9), amount: 980, place: "Järnhandeln", note: "Bandsågsblad",
    submittedAt: daysAgo(9), confirmedAt: daysAgo(8), confirmedByName: "Sven Svensson",
  },
  {
    _id: "w-5", memberName: "Sven Svensson", isMine: true, status: "confirmed", type: "invoice",
    date: daysAgo(6), dueDate: daysAhead(24), amount: 3150, place: "Verktygsgrossisten", note: "Ny sågklinga till bordsågen",
    submittedAt: daysAgo(6), confirmedAt: daysAgo(4), confirmedByName: "Anna Andersson",
  },
  {
    _id: "w-6", memberName: "Sven Svensson", isMine: true, status: "submitted", type: "receipt",
    date: daysAgo(3), amount: 412, place: "Järnhandeln", note: "Sandpapper, skruv och trälim",
    submittedAt: daysAgo(3),
  },
];

// Budget view: the accounts Sven has access to, with this year's figures.
export const budgetOverview = {
  loading: false,
  error: null,
  year: new Date().getFullYear(),
  availableYears: [new Date().getFullYear(), new Date().getFullYear() - 1],
  bookkeeping: [
    { account: "5410", name: "Förbrukningsinventarier", amount: 4100 },
    { account: "5460", name: "Förbrukningsmaterial", amount: 5810 },
  ],
  accounts: [
    {
      _id: "acc-wood", name: WOOD, groupNames: [{ sv: "Träverkstaden", en: "Wood workshop" }],
      budget: 15000, lastRevision: { setAt: daysAgo(60), comment: "Utökad för ny bordsåg", count: 2 },
      totals: totals(412, 4130, 8660),
      bookkeeping: [
        { account: "5410", name: "Förbrukningsinventarier", amount: 4100 },
        { account: "5460", name: "Förbrukningsmaterial", amount: 4560 },
      ],
    },
    {
      _id: "acc-textile", name: TEXTILE, groupNames: [{ sv: "Textilverkstaden", en: "Textile workshop" }],
      budget: 6000, lastRevision: { setAt: daysAgo(200), comment: null, count: 1 },
      totals: totals(0, 650, 1250),
      bookkeeping: [{ account: "5460", name: "Förbrukningsmaterial", amount: 1250 }],
    },
  ],
};

// One account's page: the wood workshop's account.
export const woodAccountPage = {
  account: { _id: "acc-wood", name: WOOD, explanation: expenseAccounts[0].explanation },
  year: new Date().getFullYear(),
  availableYears: [new Date().getFullYear(), new Date().getFullYear() - 1],
  budget: { amount: 15000, setAt: daysAgo(60), comment: "Utökad för ny bordsåg", setByName: null, count: 2 },
  expenses: woodExpenses,
};
