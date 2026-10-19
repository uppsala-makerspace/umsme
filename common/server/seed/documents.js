import { LiabilityDocuments } from '/imports/common/collections/liabilityDocuments';

/** A version of the liability agreement, in both languages. */
export const makeLiabilityDocument = ({ title, date, sv, en }) =>
  LiabilityDocuments.insertAsync({ title, date, text: { sv, en } });
