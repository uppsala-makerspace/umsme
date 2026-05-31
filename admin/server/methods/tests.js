import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { TestAttempts } from '/imports/common/collections/testAttempts';
import { Attestations } from '/imports/common/collections/attestations';
import { Certificates } from '/imports/common/collections/certificates';
import { getTestIndex } from '/imports/common/server/tests/loader';

const SYSTEM_CERTIFIER_ID = '__system__';

const requireAdmin = async () => {
  const userId = Meteor.userId();
  if (!userId || !(await Roles.userIsInRoleAsync(userId, 'admin'))) {
    throw new Meteor.Error('not-authorized', 'Admin role required');
  }
};

Meteor.methods({
  'tests.getIndex': async () => {
    await requireAdmin();
    return getTestIndex();
  },

  'tests.resetAttempts': async (memberId, certificateId) => {
    await requireAdmin();
    if (!memberId || !certificateId) {
      throw new Meteor.Error('bad-args', 'memberId and certificateId required');
    }
    const certificate = await Certificates.findOneAsync(certificateId);
    if (!certificate?.test) {
      throw new Meteor.Error('not-test-certificate', 'Certificate is not a test certificate');
    }
    const removedAttempts = await TestAttempts.removeAsync({ memberId, certificateId });
    const removedAttestations = await Attestations.removeAsync({
      memberId,
      certificateId,
      certifierId: SYSTEM_CERTIFIER_ID,
    });
    return { removedAttempts, removedAttestations };
  },

  'tests.listAttemptsForMember': async (memberId) => {
    await requireAdmin();
    return TestAttempts.find({ memberId }).fetchAsync();
  },
});
