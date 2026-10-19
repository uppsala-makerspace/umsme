import { CertificateList } from './CertificateList';

const workshops = { w1: 'Keramikverkstaden', w2: 'Träverkstaden' };
const certificates = [
  { _id: 'c1', name: { sv: 'Introduktion', en: 'Introduction' }, mandatory: true, certifierRole: 'board' },
  { _id: 'c2', name: { sv: 'Laserskärare', en: 'Laser cutter' }, workshopId: 'w2', defaultValidityDays: 730 },
  { _id: 'c3', name: { sv: 'Keramikugn' }, workshopId: 'w1', test: { testId: 'kiln-safety' } },
];

export default {
  title: 'Certificates/CertificateList',
  component: CertificateList,
  args: { loading: false, certificates, workshopName: (id) => workshops[id] },
};

export const Certificates = {};
export const Loading = { args: { loading: true, certificates: [] } };
export const NoCertificates = { args: { certificates: [] } };
