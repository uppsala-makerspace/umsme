import Certificates from "./Certificates";

// Sample certificates
const sampleCertificates = [
  {
    _id: "cert1",
    name: { sv: "Laserskärare", en: "Laser Cutter" },
    description: { sv: "Certifikat för att använda laserskäraren", en: "Certificate to use the laser cutter" },
    defaultValidityDays: 365,
  },
  {
    _id: "cert2",
    name: { sv: "3D-skrivare", en: "3D Printer" },
    description: { sv: "Certifikat för att använda 3D-skrivaren", en: "Certificate to use the 3D printer" },
  },
  {
    _id: "cert3",
    name: { sv: "CNC-fräs", en: "CNC Mill" },
    description: { sv: "Certifikat för att använda CNC-fräsen", en: "Certificate to use the CNC mill" },
    defaultValidityDays: 180,
  },
];

// Sample attestations
const myValidAttestation = {
  _id: "att1",
  certificateId: "cert1",
  memberId: "member1",
  certifierId: "certifier1",
  startDate: new Date("2024-01-15"),
  endDate: new Date("2025-01-15"),
  certificate: sampleCertificates[0],
};

const myExpiredAttestation = {
  _id: "att2",
  certificateId: "cert2",
  memberId: "member1",
  certifierId: "certifier1",
  startDate: new Date("2023-01-15"),
  endDate: new Date("2023-06-15"),
  certificate: sampleCertificates[1],
};

const myPendingAttestation = {
  _id: "att3",
  certificateId: "cert3",
  memberId: "member1",
  startDate: new Date(),
  attempt: 1,
  certificate: sampleCertificates[2],
};

const myPendingWithComment = {
  _id: "att4",
  certificateId: "cert2",
  memberId: "member1",
  startDate: new Date(),
  attempt: 2,
  comment: "Please schedule a training session",
  certificate: sampleCertificates[1],
};

// Sample pending requests to confirm (for certifiers)
const pendingToConfirm = [
  {
    _id: "att5",
    certificateId: "cert1",
    memberId: "member2",
    startDate: new Date(),
    attempt: 1,
    certificate: sampleCertificates[0],
    requesterName: "Anna Andersson",
  },
  {
    _id: "att6",
    certificateId: "cert2",
    memberId: "member3",
    startDate: new Date(),
    attempt: 3,
    comment: "Ready for re-evaluation",
    certificate: sampleCertificates[1],
    requesterName: "Erik Eriksson",
  },
];

const noop = () => {};

export default {
  title: "Pages/Certificates",
  component: Certificates,
};

export const Loading = {
  args: {
    loading: true,
    certificates: [],
    myAttestations: [],
    pendingToConfirm: [],
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
    onConfirm: noop,
    onAddComment: noop,
    onRemove: noop,
  },
};

export const NoCertificates = {
  args: {
    loading: false,
    certificates: sampleCertificates,
    myAttestations: [],
    pendingToConfirm: [],
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
    onConfirm: noop,
    onAddComment: noop,
    onRemove: noop,
  },
};

export const WithCertificates = {
  args: {
    loading: false,
    certificates: sampleCertificates,
    myAttestations: [myValidAttestation, myExpiredAttestation],
    pendingToConfirm: [],
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
    onConfirm: noop,
    onAddComment: noop,
    onRemove: noop,
  },
};

export const WithPendingRequest = {
  args: {
    loading: false,
    certificates: sampleCertificates,
    myAttestations: [myValidAttestation, myPendingAttestation],
    pendingToConfirm: [],
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
    onConfirm: noop,
    onAddComment: noop,
    onRemove: noop,
  },
};

export const WithPendingRequestAndComment = {
  args: {
    loading: false,
    certificates: sampleCertificates,
    myAttestations: [myValidAttestation, myPendingWithComment],
    pendingToConfirm: [],
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
    onConfirm: noop,
    onAddComment: noop,
    onRemove: noop,
  },
};

export const CertifierView = {
  args: {
    loading: false,
    certificates: sampleCertificates,
    myAttestations: [myValidAttestation],
    pendingToConfirm: pendingToConfirm,
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
    onConfirm: noop,
    onAddComment: noop,
    onRemove: noop,
  },
};

export const FullExample = {
  args: {
    loading: false,
    certificates: sampleCertificates,
    myAttestations: [myValidAttestation, myExpiredAttestation, myPendingAttestation],
    pendingToConfirm: pendingToConfirm,
    onRequest: noop,
    onCancel: noop,
    onReRequest: noop,
    onConfirm: noop,
    onAddComment: noop,
    onRemove: noop,
  },
};
