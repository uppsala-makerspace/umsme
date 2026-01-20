import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { Roles } from "meteor/roles";
import { Certificates } from "/imports/common/collections/certificates";
import { Attestations } from "/imports/common/collections/attestations";
import { Members } from "/imports/common/collections/members";
import { findMemberForUser } from "./utils";

/**
 * Check if a member can certify a given certificate.
 * A member can certify if they are in the certificate's certifiers list
 * or have the certificate's certifierRole.
 */
const canCertify = async (memberId, certificate) => {
  if (!memberId || !certificate) return false;

  // Check if member is in the certifiers list
  if (certificate.certifiers && certificate.certifiers.includes(memberId)) {
    return true;
  }

  // Check if member has the certifier role
  if (certificate.certifierRole) {
    const member = await Members.findOneAsync(memberId);
    if (member) {
      const user = Accounts.findUserByEmail(member.email);
      if (user && Roles.userIsInRole(user._id, certificate.certifierRole)) {
        return true;
      }
    }
  }

  return false;
};

Meteor.methods({
  /**
   * Get all certificate types.
   */
  "certificates.getAll": async () => {
    return await Certificates.find({}).fetchAsync();
  },

  /**
   * Get a single certificate with all related attestations.
   */
  "certificates.getDetails": async (certificateId) => {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("not-found", "Member not found");
    }

    const certificate = await Certificates.findOneAsync(certificateId);
    if (!certificate) {
      throw new Meteor.Error("not-found", "Certificate not found");
    }

    // Check if current user can certify this certificate
    const userCanCertify = await canCertify(member._id, certificate);

    // Get user's own attestation for this certificate
    let myAttestation = await Attestations.findOneAsync({
      certificateId,
      memberId: member._id,
    });

    // If confirmed, enrich with certifier name
    if (myAttestation && myAttestation.certifierId) {
      const certifier = await Members.findOneAsync(myAttestation.certifierId);
      myAttestation = {
        ...myAttestation,
        certifierName: certifier?.name || "Unknown",
      };
    }

    // Get pending requests (for certifiers)
    let pendingRequests = [];
    let recentlyConfirmed = [];

    if (userCanCertify) {
      // Get pending attestations for this certificate
      pendingRequests = await Attestations.find({
        certificateId,
        certifierId: { $exists: false },
      }).fetchAsync();

      // Enrich with requester info
      pendingRequests = await Promise.all(
        pendingRequests.map(async (att) => {
          const requester = await Members.findOneAsync(att.memberId);
          return {
            ...att,
            requesterName: requester?.name || "Unknown",
            isOwnRequest: att.memberId === member._id,
          };
        })
      );

      // Get recently confirmed (within 24 hours) by this certifier
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const confirmedAtts = await Attestations.find({
        certificateId,
        certifierId: member._id,
        $or: [
          { confirmedAt: { $gte: twentyFourHoursAgo } },
          { confirmedAt: { $exists: false }, startDate: { $gte: twentyFourHoursAgo } },
        ],
      }).fetchAsync();

      recentlyConfirmed = await Promise.all(
        confirmedAtts.map(async (att) => {
          const requester = await Members.findOneAsync(att.memberId);
          return {
            ...att,
            requesterName: requester?.name || "Unknown",
          };
        })
      );
    }

    // Remove privateComment from user's own attestation (only visible to certifiers/admins)
    let sanitizedAttestation = null;
    if (myAttestation) {
      const { privateComment, ...rest } = myAttestation;
      sanitizedAttestation = {
        ...rest,
        isConfirmed: !!myAttestation.certifierId,
        isPending: !myAttestation.certifierId,
      };
    }

    return {
      certificate,
      myAttestation: sanitizedAttestation,
      userCanCertify,
      pendingRequests,
      recentlyConfirmed,
    };
  },

  /**
   * Get the current user's attestations (both pending and confirmed).
   */
  "certificates.getMyAttestations": async () => {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("not-found", "Member not found");
    }

    const attestations = await Attestations.find({ memberId: member._id }).fetchAsync();

    // Enrich with certificate info and remove privateComment (only visible to certifiers/admins)
    const enriched = await Promise.all(
      attestations.map(async (att) => {
        const certificate = await Certificates.findOneAsync(att.certificateId);
        const { privateComment, ...rest } = att;
        return {
          ...rest,
          certificate,
        };
      })
    );

    return enriched;
  },

  /**
   * Get pending requests that the current user can confirm (for certifiers).
   * Also returns recently confirmed attestations (within 24 hours) by this certifier.
   */
  "certificates.getPendingToConfirm": async () => {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("not-found", "Member not found");
    }

    // Get all certificates this member can certify
    const allCertificates = await Certificates.find({}).fetchAsync();
    const certifiableCertIds = [];

    for (const cert of allCertificates) {
      if (await canCertify(member._id, cert)) {
        certifiableCertIds.push(cert._id);
      }
    }

    if (certifiableCertIds.length === 0) {
      return null; // Not a certifier
    }

    // Get pending attestations for those certificates
    const pendingAttestations = await Attestations.find({
      certificateId: { $in: certifiableCertIds },
      certifierId: { $exists: false },
    }).fetchAsync();

    // Get recently confirmed attestations (within 24 hours) by this certifier
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentlyConfirmed = await Attestations.find({
      certificateId: { $in: certifiableCertIds },
      certifierId: member._id,
      $or: [
        // Has confirmedAt within 24 hours
        { confirmedAt: { $gte: twentyFourHoursAgo } },
        // Legacy data without confirmedAt: use startDate as fallback
        {
          confirmedAt: { $exists: false },
          startDate: { $gte: twentyFourHoursAgo },
        },
      ],
    }).fetchAsync();

    // Enrich pending with certificate and requester info
    const enrichedPending = await Promise.all(
      pendingAttestations.map(async (att) => {
        const certificate = await Certificates.findOneAsync(att.certificateId);
        const requester = await Members.findOneAsync(att.memberId);
        return {
          ...att,
          certificate,
          requesterName: requester?.name || "Unknown",
          isConfirmed: false,
        };
      })
    );

    // Enrich recently confirmed with certificate and requester info
    const enrichedConfirmed = await Promise.all(
      recentlyConfirmed.map(async (att) => {
        const certificate = await Certificates.findOneAsync(att.certificateId);
        const requester = await Members.findOneAsync(att.memberId);
        return {
          ...att,
          certificate,
          requesterName: requester?.name || "Unknown",
          isConfirmed: true,
        };
      })
    );

    // Return pending first, then recently confirmed
    return [...enrichedPending, ...enrichedConfirmed];
  },

  /**
   * Get a single attestation detail for certifier view.
   */
  "certificates.getRequestDetail": async (attestationId) => {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("not-found", "Member not found");
    }

    const attestation = await Attestations.findOneAsync(attestationId);
    if (!attestation) {
      throw new Meteor.Error("not-found", "Request not found");
    }

    const certificate = await Certificates.findOneAsync(attestation.certificateId);
    if (!certificate) {
      throw new Meteor.Error("not-found", "Certificate not found");
    }

    // Check if user can certify this certificate
    if (!(await canCertify(member._id, certificate))) {
      throw new Meteor.Error("not-authorized", "You are not authorized to view this request");
    }

    // Get requester info
    const requester = await Members.findOneAsync(attestation.memberId);

    return {
      certificate,
      attestation: {
        ...attestation,
        requesterName: requester?.name || "Unknown",
      },
    };
  },

  /**
   * Request a certificate (creates a pending attestation).
   */
  "certificates.request": async (certificateId) => {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("not-found", "Member not found");
    }

    const certificate = await Certificates.findOneAsync(certificateId);
    if (!certificate) {
      throw new Meteor.Error("not-found", "Certificate not found");
    }

    // Check if there's already a pending request for this certificate
    const existingPending = await Attestations.findOneAsync({
      certificateId,
      memberId: member._id,
      certifierId: { $exists: false },
    });

    if (existingPending) {
      throw new Meteor.Error("already-pending", "You already have a pending request for this certificate");
    }

    // Check if already has this certificate (confirmed)
    const existingConfirmed = await Attestations.findOneAsync({
      certificateId,
      memberId: member._id,
      certifierId: { $exists: true },
    });

    // If has valid (non-expired) certificate, don't allow new request
    if (existingConfirmed) {
      const now = new Date();
      if (!existingConfirmed.endDate || existingConfirmed.endDate > now) {
        throw new Meteor.Error("already-certified", "You already have this certificate");
      }
    }

    // Create pending attestation
    const attestationId = await Attestations.insertAsync({
      certificateId,
      memberId: member._id,
      startDate: new Date(),
      attempt: 1,
    });

    return attestationId;
  },

  /**
   * Cancel own pending request.
   */
  "certificates.cancel": async (attestationId) => {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("not-found", "Member not found");
    }

    const attestation = await Attestations.findOneAsync(attestationId);
    if (!attestation) {
      throw new Meteor.Error("not-found", "Attestation not found");
    }

    if (attestation.memberId !== member._id) {
      throw new Meteor.Error("not-authorized", "You can only cancel your own requests");
    }

    if (attestation.certifierId) {
      throw new Meteor.Error("already-confirmed", "Cannot cancel a confirmed certificate");
    }

    await Attestations.removeAsync(attestationId);
    return true;
  },

  /**
   * Re-request a certificate (update startDate, increment attempt).
   */
  "certificates.reRequest": async (attestationId) => {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("not-found", "Member not found");
    }

    const attestation = await Attestations.findOneAsync(attestationId);
    if (!attestation) {
      throw new Meteor.Error("not-found", "Attestation not found");
    }

    if (attestation.memberId !== member._id) {
      throw new Meteor.Error("not-authorized", "You can only re-request your own requests");
    }

    if (attestation.certifierId) {
      throw new Meteor.Error("already-confirmed", "Cannot re-request a confirmed certificate");
    }

    await Attestations.updateAsync(attestationId, {
      $set: { startDate: new Date() },
      $inc: { attempt: 1 },
      $unset: { comment: "" },
    });

    return true;
  },

  /**
   * Confirm a pending request (set certifierId).
   * @param {string} attestationId - The attestation ID
   * @param {string} comment - Public comment visible to the requester
   * @param {string} privateComment - Private comment only visible to certifiers and admins
   */
  "certificates.confirm": async (attestationId, comment, privateComment) => {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("not-found", "Member not found");
    }

    const attestation = await Attestations.findOneAsync(attestationId);
    if (!attestation) {
      throw new Meteor.Error("not-found", "Attestation not found");
    }

    if (attestation.certifierId) {
      throw new Meteor.Error("already-confirmed", "This request is already confirmed");
    }

    const certificate = await Certificates.findOneAsync(attestation.certificateId);
    if (!certificate) {
      throw new Meteor.Error("not-found", "Certificate not found");
    }

    // Check if user can certify this certificate
    if (!(await canCertify(member._id, certificate))) {
      throw new Meteor.Error("not-authorized", "You are not authorized to confirm this certificate");
    }

    // Calculate end date if certificate has validity period
    let endDate = null;
    if (certificate.defaultValidityDays) {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + certificate.defaultValidityDays);
    }

    const updateFields = {
      certifierId: member._id,
      confirmedAt: new Date(),
    };
    if (endDate) {
      updateFields.endDate = endDate;
    }
    if (comment) {
      updateFields.comment = comment;
    }
    if (privateComment) {
      updateFields.privateComment = privateComment;
    }

    await Attestations.updateAsync(attestationId, { $set: updateFields });
    return true;
  },

  /**
   * Add comment to a request (certifier action).
   * @param {string} attestationId - The attestation ID
   * @param {string} comment - Public comment visible to the requester
   * @param {string} privateComment - Private comment only visible to certifiers and admins
   */
  "certificates.addComment": async (attestationId, comment, privateComment) => {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("not-found", "Member not found");
    }

    const attestation = await Attestations.findOneAsync(attestationId);
    if (!attestation) {
      throw new Meteor.Error("not-found", "Attestation not found");
    }

    const certificate = await Certificates.findOneAsync(attestation.certificateId);
    if (!certificate) {
      throw new Meteor.Error("not-found", "Certificate not found");
    }

    // Check if user can certify this certificate
    if (!(await canCertify(member._id, certificate))) {
      throw new Meteor.Error("not-authorized", "You are not authorized to comment on this certificate");
    }

    const updateFields = {};
    if (comment !== undefined) {
      updateFields.comment = comment;
    }
    if (privateComment !== undefined) {
      updateFields.privateComment = privateComment;
    }

    if (Object.keys(updateFields).length > 0) {
      await Attestations.updateAsync(attestationId, { $set: updateFields });
    }
    return true;
  },

  /**
   * Get mandatory certificate status for the current user.
   * Returns the mandatory certificate and whether the user has a valid attestation.
   */
  "certificates.getMandatoryStatus": async () => {
    const member = await findMemberForUser();
    if (!member) {
      return { certificate: null, hasValidAttestation: true };
    }

    const mandatoryCertificate = await Certificates.findOneAsync({ mandatory: true });
    if (!mandatoryCertificate) {
      return { certificate: null, hasValidAttestation: true };
    }

    // Check if member has a confirmed attestation
    const attestation = await Attestations.findOneAsync({
      certificateId: mandatoryCertificate._id,
      memberId: member._id,
      certifierId: { $exists: true },
    });

    if (!attestation) {
      return { certificate: mandatoryCertificate, hasValidAttestation: false };
    }

    // Check if attestation is expired
    if (attestation.endDate && attestation.endDate < new Date()) {
      return { certificate: mandatoryCertificate, hasValidAttestation: false };
    }

    return { certificate: mandatoryCertificate, hasValidAttestation: true };
  },

  /**
   * Remove a commented request (certifier or requester).
   */
  "certificates.remove": async (attestationId) => {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("not-found", "Member not found");
    }

    const attestation = await Attestations.findOneAsync(attestationId);
    if (!attestation) {
      throw new Meteor.Error("not-found", "Attestation not found");
    }

    if (attestation.certifierId) {
      throw new Meteor.Error("already-confirmed", "Cannot remove a confirmed certificate");
    }

    // Requester can always remove their own pending request
    if (attestation.memberId === member._id) {
      await Attestations.removeAsync(attestationId);
      return true;
    }

    // Certifier can remove if they have permission and there's a comment
    const certificate = await Certificates.findOneAsync(attestation.certificateId);
    if (certificate && (await canCertify(member._id, certificate)) && attestation.comment) {
      await Attestations.removeAsync(attestationId);
      return true;
    }

    throw new Meteor.Error("not-authorized", "You are not authorized to remove this request");
  },
});
