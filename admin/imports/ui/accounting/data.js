import { Meteor } from 'meteor/meteor';

/** Send a bank report (a File) to be matched; resolves to the summary and the files. */
export const processBankFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read the file.'));
  reader.onload = () => Meteor.callAsync('accounting.processBankFile', String(reader.result).split(',')[1] || '').then(resolve, reject);
  reader.readAsDataURL(file);
});

/**
 * Save a generated file. The files carry exact encodings (SIE is CP437, the
 * remaining CSV CP1252), so they are built from the raw bytes: a UTF-8 data
 * URI would corrupt them.
 */
export const downloadBase64 = (base64, filename) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
