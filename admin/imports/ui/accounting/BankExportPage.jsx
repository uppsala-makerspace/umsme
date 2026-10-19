import React, { useState } from 'react';
import { BankExport } from './BankExport';
import { processBankFile, downloadBase64 } from './data';

export const BankExportPage = () => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (file) => {
    setResult(null);
    setError(null);
    setBusy(true);
    try {
      setResult(await processBankFile(file));
    } catch (e) {
      setError(e.reason || e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <BankExport
      onFile={onFile} busy={busy} error={error} result={result}
      onDownloadSie={() => downloadBase64(result.sieBase64, result.suggestedNames.sie)}
      onDownloadRemaining={() => downloadBase64(result.remainingCsvBase64, result.suggestedNames.remaining)}
    />
  );
};
