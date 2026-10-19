import React, { useState } from 'react';
import { SpaceList } from './SpaceList';
import { useSpaceList, importSpaces } from './data';

export const SpaceListPage = () => {
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const onImport = async () => {
    setImporting(true);
    try {
      setImportResult(await importSpaces());
    } finally {
      setImporting(false);
    }
  };
  return <SpaceList {...useSpaceList()} onImport={onImport} importResult={importResult} importing={importing} />;
};
