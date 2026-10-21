import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { CertificateForm } from './CertificateForm';

const workshops = [{ _id: 'w1', name: { sv: 'Keramikverkstaden' }, kind: 'workshop' }, { _id: 'w2', name: { sv: 'Retrodatorer' }, kind: 'areaOfInterest' }];
const roleOptions = [{ value: 'board', label: 'board' }, { value: 'certifier', label: 'certifier' }];
const prerequisiteOptions = [{ value: 'c1', label: 'Introduktion' }, { value: 'c3', label: 'Drejskiva' }];
const sara = { _id: 'm1', name: 'Sara Styrgrupp', mid: '1002' };
const people = [sara, { _id: 'm2', name: 'Maja Medlem', mid: '1003' }, { _id: 'm3', name: 'Astrid Admin', mid: '1001' }];
const searchMembers = async (query) => people.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
const kiln = { _id: 'c2', name: { sv: 'Keramikugn', en: 'Ceramics kiln' }, workshopId: 'w1', certifiers: ['m1'], prerequisites: ['c1'], defaultValidityDays: 365 };
const values = (c) => ({
  nameSv: c.name?.sv || '', nameEn: c.name?.en || '', descriptionSv: '', descriptionEn: '',
  defaultValidityDays: c.defaultValidityDays ?? '', certifierRole: c.certifierRole || '', workshopId: c.workshopId || '',
  certifiers: c.certifiers || [], prerequisites: c.prerequisites || [],
  testId: c.test?.testId || '', maxAttempts: c.test?.maxAttempts ?? 3, maxErrors: c.test?.maxErrors ?? 1,
});
const holders = [
  { _id: 'a1', memberId: 'm2', memberName: 'Maja Medlem', memberMid: '1003', certifierId: 'm1', certifierName: 'Sara Styrgrupp', startDate: new Date(2026, 8, 20), endDate: new Date(2027, 8, 20), comment: null, pending: false },
  { _id: 'a2', memberId: 'm4', memberName: 'Bo Basmedlem', memberMid: '1004', certifierId: null, certifierName: null, startDate: new Date(2026, 9, 18), endDate: null, comment: 'Vill gärna bränna raku', pending: true },
];

/** Keeps the values and the certifiers, as the page does. */
const Editable = ({ values: initial, certifiers: picked, ...props }) => {
  const [current, setCurrent] = useState(initial);
  const [certifiers, setCertifiers] = useState(picked);
  return (
    <CertificateForm {...props} values={current} certifiers={certifiers}
      onChange={(field, value) => setCurrent((v) => ({ ...v, [field]: value }))}
      onAddCertifier={(m) => { setCertifiers((list) => [...list, m]); setCurrent((v) => ({ ...v, certifiers: [...v.certifiers, m._id] })); }}
      onRemoveCertifier={(id) => { setCertifiers((list) => list.filter((m) => m._id !== id)); setCurrent((v) => ({ ...v, certifiers: v.certifiers.filter((c) => c !== id) })); }} />
  );
};

export default {
  title: 'Certificates/CertificateForm',
  component: CertificateForm,
  render: (args) => <Editable {...args} />,
  args: {
    isNew: false, certificate: kiln, values: values(kiln), workshops, roleOptions, prerequisiteOptions,
    certificateName: (id) => ({ c1: 'Introduktion', c3: 'Drejskiva' }[id] || id),
    certifiers: [sara], searchMembers, tests: [{ testId: 'kiln-safety', categoryCount: 3 }],
    canMarkMandatory: true, holders, defaultCertifier: people[2],
    onSave: fn(), onDelete: fn(), onMarkMandatory: fn(), onGrant: fn(async () => true), onRevoke: fn(),
  },
};

export const NewCertificate = { args: { isNew: true, certificate: null, values: values({}), certifiers: [], holders: null } };

/** Certifiers, a prerequisite, holders and a pending request. */
export const Kiln = {};

export const Mandatory = {
  args: (() => {
    const intro = { _id: 'c1', name: { sv: 'Introduktion', en: 'Introduction' }, mandatory: true, certifierRole: 'board' };
    return { certificate: intro, values: values(intro), certifiers: [], canMarkMandatory: false, holders: [] };
  })(),
};

/** Awarded by a test; a board member may not choose the test. */
export const TestForBoard = {
  args: (() => {
    const tested = { ...kiln, test: { testId: 'kiln-safety', maxAttempts: 3, maxErrors: 1 } };
    return { certificate: tested, values: values(tested), tests: null };
  })(),
};
