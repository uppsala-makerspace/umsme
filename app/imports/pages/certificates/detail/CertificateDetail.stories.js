import CertificateDetail from "./CertificateDetail";

// Sample certificate with markdown description
const sampleCertificate = {
  _id: "cert1",
  name: { sv: "Laserskärare", en: "Laser Cutter" },
  description: {
    sv: `## Säkerhetsregler

Innan du använder laserskäraren måste du:

- Ha genomgått säkerhetsutbildning
- Använda skyddsglasögon
- Aldrig lämna maskinen obevakad

**Viktigt:** Kontakta alltid en handledare om du är osäker.`,
    en: `## Safety Rules

Before using the laser cutter you must:

- Have completed safety training
- Wear safety glasses
- Never leave the machine unattended

**Important:** Always contact a supervisor if you are unsure.`,
  },
  defaultValidityDays: 365,
};

const sampleCertificateNoExpiry = {
  _id: "cert2",
  name: { sv: "3D-skrivare", en: "3D Printer" },
  description: {
    sv: "Certifikat för att använda 3D-skrivaren. Ingen tidsbegränsning.",
    en: "Certificate to use the 3D printer. No time limit.",
  },
};

// Sample attestations
const validAttestation = {
  _id: "att1",
  certificateId: "cert1",
  memberId: "member1",
  certifierId: "certifier1",
  certifierName: "Maria Johansson",
  startDate: new Date("2024-01-15"),
  confirmedAt: new Date("2024-01-15"),
  endDate: new Date("2025-01-15"),
  isConfirmed: true,
  isPending: false,
};

const validAttestationWithComment = {
  ...validAttestation,
  _id: "att1b",
  comment: "Excellent understanding of safety procedures. Approved for independent use.",
};

const validAttestationNoExpiry = {
  _id: "att2",
  certificateId: "cert2",
  memberId: "member1",
  certifierId: "certifier1",
  certifierName: "Erik Svensson",
  startDate: new Date("2024-03-10"),
  confirmedAt: new Date("2024-03-10"),
  isConfirmed: true,
  isPending: false,
};

const expiredAttestation = {
  _id: "att3",
  certificateId: "cert1",
  memberId: "member1",
  certifierId: "certifier1",
  certifierName: "Maria Johansson",
  startDate: new Date("2023-01-15"),
  confirmedAt: new Date("2023-01-15"),
  endDate: new Date("2024-01-15"),
  isConfirmed: true,
  isPending: false,
};

const pendingAttestation = {
  _id: "att4",
  certificateId: "cert1",
  memberId: "member1",
  startDate: new Date(),
  attempt: 1,
  isConfirmed: false,
  isPending: true,
};

const pendingAttestationWithComment = {
  ...pendingAttestation,
  _id: "att5",
  attempt: 2,
  comment: "Please review the safety manual and try again next week.",
};

const noop = () => {};

export default {
  title: "Pages/CertificateDetail",
  component: CertificateDetail,
  parameters: {
    layout: "fullscreen",
  },
};

export const Loading = {
  args: {
    loading: true,
    error: null,
    data: null,
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
  },
};

export const Error = {
  args: {
    loading: false,
    error: "Certificate not found",
    data: null,
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
  },
};

export const ValidCertificate = {
  args: {
    loading: false,
    error: null,
    data: {
      certificate: sampleCertificate,
      myAttestation: validAttestation,
    },
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
  },
};

export const ValidCertificateWithComment = {
  args: {
    loading: false,
    error: null,
    data: {
      certificate: sampleCertificate,
      myAttestation: validAttestationWithComment,
    },
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
  },
};

export const ValidCertificateNoExpiration = {
  args: {
    loading: false,
    error: null,
    data: {
      certificate: sampleCertificateNoExpiry,
      myAttestation: validAttestationNoExpiry,
    },
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
  },
};

export const ExpiredCertificate = {
  args: {
    loading: false,
    error: null,
    data: {
      certificate: sampleCertificate,
      myAttestation: expiredAttestation,
    },
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
  },
};

export const PendingRequest = {
  args: {
    loading: false,
    error: null,
    data: {
      certificate: sampleCertificate,
      myAttestation: pendingAttestation,
    },
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
  },
};

export const PendingRequestWithComment = {
  args: {
    loading: false,
    error: null,
    data: {
      certificate: sampleCertificate,
      myAttestation: pendingAttestationWithComment,
    },
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
  },
};

export const CanRequest = {
  args: {
    loading: false,
    error: null,
    data: {
      certificate: sampleCertificate,
      myAttestation: null,
    },
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
  },
};

export const MarkdownDescription = {
  name: "With Markdown Description",
  args: {
    loading: false,
    error: null,
    data: {
      certificate: {
        _id: "cert3",
        name: { sv: "CNC-fräs", en: "CNC Mill" },
        description: {
          sv: `## Introduktion

CNC-fräsen är en avancerad maskin som kräver noggrann utbildning.

### Krav för certifiering

1. Genomförd grundkurs
2. Praktisk övning under handledning
3. Godkänt teoretiskt prov

### Säkerhet

> **Varning:** Använd alltid hörselskydd och skyddsglasögon.

Mer information finns på [vår wiki](https://wiki.example.com).

\`\`\`
G-kod exempel:
G00 X0 Y0
G01 Z-5 F100
\`\`\``,
          en: `## Introduction

The CNC mill is an advanced machine that requires careful training.

### Certification Requirements

1. Completed basic course
2. Practical training under supervision
3. Passed theoretical test

### Safety

> **Warning:** Always use hearing protection and safety glasses.

More information is available on [our wiki](https://wiki.example.com).

\`\`\`
G-code example:
G00 X0 Y0
G01 Z-5 F100
\`\`\``,
        },
        defaultValidityDays: 180,
      },
      myAttestation: null,
    },
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
  },
};
