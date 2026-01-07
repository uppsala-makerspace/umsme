import Liability from "./Liability";

const sampleLiabilityTextSv = `## 1. Allmänt

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
- Jag kommer att rapportera trasig eller felaktig utrustning.`;

const sampleLiabilityTextEn = `## 1. General

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
- I will report broken or faulty equipment.`;

const sampleLiabilityText = {
  sv: sampleLiabilityTextSv,
  en: sampleLiabilityTextEn,
};

const documentDate = new Date("2024-01-15");
const olderApprovedDate = new Date("2023-06-01");

export default {
  title: "Pages/Liability",
  component: Liability,
};

export const Loading = {
  args: {
    documentDate: null,
    text: null,
    approvedDate: null,
    loading: true,
    approving: false,
    onApprove: () => console.log("Approve"),
  },
};

export const NotFound = {
  args: {
    documentDate: null,
    text: null,
    approvedDate: null,
    loading: false,
    approving: false,
    onApprove: () => console.log("Approve"),
  },
};

export const NotApproved = {
  args: {
    documentDate: documentDate,
    text: sampleLiabilityText,
    approvedDate: null,
    loading: false,
    approving: false,
    onApprove: () => console.log("Approve"),
  },
};

export const Approved = {
  args: {
    documentDate: documentDate,
    text: sampleLiabilityText,
    approvedDate: documentDate,
    loading: false,
    approving: false,
    onApprove: () => console.log("Approve"),
  },
};

export const OutdatedApproval = {
  args: {
    documentDate: documentDate,
    text: sampleLiabilityText,
    approvedDate: olderApprovedDate,
    loading: false,
    approving: false,
    onApprove: () => console.log("Approve"),
  },
};

export const Approving = {
  args: {
    documentDate: documentDate,
    text: sampleLiabilityText,
    approvedDate: null,
    loading: false,
    approving: true,
    onApprove: () => console.log("Approve"),
  },
};
