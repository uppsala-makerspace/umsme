import CertifierRequestDetail from "./CertifierRequestDetail";

// Sample certificate
const sampleCertificate = {
  _id: "cert1",
  name: { sv: "Laserskärare", en: "Laser Cutter" },
  description: {
    sv: `## Säkerhetsregler

Innan du använder laserskäraren måste du:

- Ha genomgått säkerhetsutbildning
- Använda skyddsglasögon
- Aldrig lämna maskinen obevakad`,
    en: `## Safety Rules

Before using the laser cutter you must:

- Have completed safety training
- Wear safety glasses
- Never leave the machine unattended`,
  },
  defaultValidityDays: 365,
};

// Sample attestations
const pendingAttestation = {
  _id: "att1",
  certificateId: "cert1",
  memberId: "member2",
  requesterName: "Anna Andersson",
  startDate: new Date("2024-06-15T10:30:00"),
  attempt: 1,
};

const pendingAttestationSecondAttempt = {
  _id: "att2",
  certificateId: "cert1",
  memberId: "member2",
  requesterName: "Erik Eriksson",
  startDate: new Date("2024-06-18T14:15:00"),
  attempt: 3,
  comment: "Please review the safety manual and try again.",
  privateComment: "Had difficulty with the emergency stop procedure.",
};

const confirmedAttestation = {
  _id: "att3",
  certificateId: "cert1",
  memberId: "member2",
  certifierId: "certifier1",
  requesterName: "Maria Johansson",
  startDate: new Date("2024-06-10T09:00:00"),
  confirmedAt: new Date("2024-06-15T11:00:00"),
  endDate: new Date("2025-06-15"),
  comment: "Excellent understanding of safety procedures.",
  privateComment: "Very experienced, works professionally with laser cutting.",
};

const noop = () => {};

export default {
  title: "Pages/CertifierRequestDetail",
  component: CertifierRequestDetail,
  parameters: {
    layout: "fullscreen",
  },
};

export const Loading = {
  args: {
    loading: true,
    error: null,
    data: null,
    onConfirm: noop,
    onDeny: noop,
    onSaveComments: noop,
  },
};

export const Error = {
  args: {
    loading: false,
    error: "Request not found",
    data: null,
    onConfirm: noop,
    onDeny: noop,
    onSaveComments: noop,
  },
};

export const PendingRequest = {
  args: {
    loading: false,
    error: null,
    data: {
      certificate: sampleCertificate,
      attestation: pendingAttestation,
    },
    onConfirm: noop,
    onDeny: noop,
    onSaveComments: noop,
  },
};

export const PendingRequestMultipleAttempts = {
  args: {
    loading: false,
    error: null,
    data: {
      certificate: sampleCertificate,
      attestation: pendingAttestationSecondAttempt,
    },
    onConfirm: noop,
    onDeny: noop,
    onSaveComments: noop,
  },
};

export const ConfirmedRequest = {
  args: {
    loading: false,
    error: null,
    data: {
      certificate: sampleCertificate,
      attestation: confirmedAttestation,
    },
    onConfirm: noop,
    onDeny: noop,
    onSaveComments: noop,
  },
};
