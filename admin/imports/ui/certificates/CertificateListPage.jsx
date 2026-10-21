import React from 'react';
import { CertificateList } from './CertificateList';
import { useCertificateList } from './data';
import { useChoices } from '../groups/choices';

export const CertificateListPage = () => {
  const list = useCertificateList();
  const { workshops } = useChoices();
  const workshopName = (id) => workshops.find((w) => w._id === id)?.name?.sv;
  return <CertificateList {...list} workshopName={workshopName} />;
};
