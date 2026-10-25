import { Attestations } from '/imports/common/collections/attestations';
import { metCertificateIds } from '/imports/common/lib/rules';

/** Whether a member holds a certificate now: granted, and not run out (see metCertificateIds). */
export const hasValidCertificate = async (memberId, certificateId, now = new Date()) =>
  metCertificateIds(await Attestations.find({ memberId, certificateId }).fetchAsync(), now).has(certificateId);
