import { Meteor } from "meteor/meteor";
import { Certificates } from "/imports/common/collections/certificates";
import { Attestations } from "/imports/common/collections/attestations";
import { TestAttempts } from "/imports/common/collections/testAttempts";
import {
  getTestIndex,
  hasTest,
  getCategoryIds,
  getQuestion,
  sanitizeQuestion,
  pickQuestion,
  isCorrectAnswer,
} from "/imports/common/server/tests/loader";
import { findMemberForUser } from "./utils";
import { findMissingPrerequisites, metCertificateIds } from "/imports/common/lib/rules";

const requirePrerequisites = async (member, certificate) => {
  if (!certificate.prerequisites || certificate.prerequisites.length === 0) return;
  const memberAttestations = await Attestations.find({ memberId: member._id }).fetchAsync();
  const metIds = metCertificateIds(memberAttestations);
  const missing = findMissingPrerequisites(certificate, metIds);
  if (missing.length > 0) {
    throw new Meteor.Error(
      "missing-prerequisites",
      "You need to complete other certificates first",
      { missing }
    );
  }
};

export const SYSTEM_CERTIFIER_ID = "__system__";

const requireMember = async () => {
  const member = await findMemberForUser();
  if (!member) throw new Meteor.Error("not-found", "Member not found");
  return member;
};

const requireTestCertificate = async (certificateId) => {
  const certificate = await Certificates.findOneAsync(certificateId);
  if (!certificate) throw new Meteor.Error("not-found", "Certificate not found");
  if (!certificate.test) {
    throw new Meteor.Error("not-test-certificate", "Certificate is not a test certificate");
  }
  return certificate;
};

const hasValidConfirmedAttestation = async (memberId, certificateId) => {
  const existing = await Attestations.findOneAsync({
    certificateId,
    memberId,
    certifierId: { $exists: true },
  });
  if (!existing) return false;
  if (existing.endDate && new Date(existing.endDate) <= new Date()) return false;
  return true;
};

const computeStatus = async (member, certificate) => {
  const attempts = await TestAttempts.find({
    memberId: member._id,
    certificateId: certificate._id,
  }).fetchAsync();
  const usedCount = attempts.filter(a => a.state !== "active").length;
  const active = attempts.find(a => a.state === "active") || null;
  const maxAttempts = certificate.test.maxAttempts;
  const passed = attempts.some(a => a.state === "passed");
  const isCertified = await hasValidConfirmedAttestation(member._id, certificate._id);
  return {
    attemptsUsed: usedCount,
    attemptsLeft: Math.max(0, maxAttempts - usedCount),
    maxAttempts,
    maxErrors: certificate.test.maxErrors,
    testId: certificate.test.testId,
    isBlocked: !passed && usedCount >= maxAttempts,
    hasActiveSession: !!active,
    activeAttemptId: active?._id || null,
    isCertified,
  };
};

const accumulatedUsedQuestionIds = (attempts) => {
  const out = {};
  for (const a of attempts) {
    if (!a.usedQuestionIds) continue;
    for (const [cat, ids] of Object.entries(a.usedQuestionIds)) {
      if (!out[cat]) out[cat] = new Set();
      for (const id of ids) out[cat].add(id);
    }
  }
  const obj = {};
  for (const [cat, set] of Object.entries(out)) obj[cat] = Array.from(set);
  return obj;
};

Meteor.methods({
  "tests.getStatus": async (certificateId) => {
    const member = await requireMember();
    const certificate = await requireTestCertificate(certificateId);
    return computeStatus(member, certificate);
  },

  "tests.start": async (certificateId) => {
    const member = await requireMember();
    const certificate = await requireTestCertificate(certificateId);

    if (await hasValidConfirmedAttestation(member._id, certificate._id)) {
      throw new Meteor.Error("already-certified", "You already have this certificate");
    }

    await requirePrerequisites(member, certificate);

    const existingActive = await TestAttempts.findOneAsync({
      memberId: member._id,
      certificateId: certificate._id,
      state: "active",
    });
    if (existingActive) {
      const questions = existingActive.session.items.map(item => ({
        ...sanitizeQuestion(getQuestion(certificate.test.testId, item.categoryId, item.questionId)),
        categoryId: item.categoryId,
        answeredOptionId: item.answeredOptionId || null,
      }));
      return { attemptId: existingActive._id, questions };
    }

    if (!hasTest(certificate.test.testId)) {
      throw new Meteor.Error("test-not-loaded", "Test questions not available");
    }

    const priorAttempts = await TestAttempts.find({
      memberId: member._id,
      certificateId: certificate._id,
    }).fetchAsync();
    const usedCount = priorAttempts.filter(a => a.state !== "active").length;
    if (usedCount >= certificate.test.maxAttempts) {
      throw new Meteor.Error("no-attempts-left", "No attempts remaining");
    }

    const used = accumulatedUsedQuestionIds(priorAttempts);
    const categoryIds = getCategoryIds(certificate.test.testId);
    if (categoryIds.length === 0) {
      throw new Meteor.Error("test-empty", "Test has no categories");
    }

    const items = [];
    for (const categoryId of categoryIds) {
      const q = pickQuestion(certificate.test.testId, categoryId, used[categoryId] || []);
      if (!q) {
        throw new Meteor.Error("test-empty", `Category ${categoryId} has no questions`);
      }
      items.push({ categoryId, questionId: q.id });
    }

    const attemptId = await TestAttempts.insertAsync({
      memberId: member._id,
      certificateId: certificate._id,
      testId: certificate.test.testId,
      attemptNumber: usedCount + 1,
      state: "active",
      startedAt: new Date(),
      usedQuestionIds: {},
      session: { items },
    });

    const questions = items.map(item => ({
      ...sanitizeQuestion(getQuestion(certificate.test.testId, item.categoryId, item.questionId)),
      categoryId: item.categoryId,
      answeredOptionId: null,
    }));
    return { attemptId, questions };
  },

  "tests.resume": async (certificateId) => {
    const member = await requireMember();
    const certificate = await requireTestCertificate(certificateId);
    await requirePrerequisites(member, certificate);
    const active = await TestAttempts.findOneAsync({
      memberId: member._id,
      certificateId: certificate._id,
      state: "active",
    });
    if (!active) return null;
    const questions = active.session.items.map(item => ({
      ...sanitizeQuestion(getQuestion(certificate.test.testId, item.categoryId, item.questionId)),
      categoryId: item.categoryId,
      answeredOptionId: item.answeredOptionId || null,
    }));
    return { attemptId: active._id, questions };
  },

  "tests.answer": async (attemptId, questionId, optionId) => {
    const member = await requireMember();
    const attempt = await TestAttempts.findOneAsync(attemptId);
    if (!attempt) throw new Meteor.Error("not-found", "Attempt not found");
    if (attempt.memberId !== member._id) {
      throw new Meteor.Error("not-authorized", "Not your attempt");
    }
    if (attempt.state !== "active") {
      throw new Meteor.Error("not-active", "Attempt not active");
    }
    const items = attempt.session.items.map(it =>
      it.questionId === questionId ? { ...it, answeredOptionId: optionId } : it
    );
    await TestAttempts.updateAsync(attemptId, { $set: { "session.items": items } });
    return true;
  },

  "tests.submit": async (attemptId) => {
    const member = await requireMember();
    const attempt = await TestAttempts.findOneAsync(attemptId);
    if (!attempt) throw new Meteor.Error("not-found", "Attempt not found");
    if (attempt.memberId !== member._id) {
      throw new Meteor.Error("not-authorized", "Not your attempt");
    }
    if (attempt.state !== "active") {
      throw new Meteor.Error("not-active", "Attempt not active");
    }
    const certificate = await Certificates.findOneAsync(attempt.certificateId);
    if (!certificate?.test) {
      throw new Meteor.Error("not-test-certificate", "Certificate is not a test certificate");
    }

    const items = attempt.session.items;
    let correct = 0;
    let errors = 0;
    const usedThisAttempt = {};
    for (const item of items) {
      if (!usedThisAttempt[item.categoryId]) usedThisAttempt[item.categoryId] = [];
      usedThisAttempt[item.categoryId].push(item.questionId);
      const answered = item.answeredOptionId;
      if (answered && isCorrectAnswer(attempt.testId, item.categoryId, item.questionId, answered)) {
        correct += 1;
      } else {
        errors += 1;
      }
    }

    const passed = errors <= certificate.test.maxErrors;
    const state = passed ? "passed" : "failed";
    const result = { correct, total: items.length, errors };

    await TestAttempts.updateAsync(attemptId, {
      $set: {
        state,
        completedAt: new Date(),
        usedQuestionIds: usedThisAttempt,
        result,
      },
      $unset: { session: "" },
    });

    if (passed) {
      let endDate = null;
      if (certificate.defaultValidityDays) {
        endDate = new Date();
        endDate.setDate(endDate.getDate() + certificate.defaultValidityDays);
      }
      const comment =
        `Godkänt via test: ${correct} av ${items.length} rätt` +
        ` / Passed via test: ${correct} of ${items.length} correct`;
      const insertDoc = {
        certificateId: certificate._id,
        memberId: member._id,
        certifierId: SYSTEM_CERTIFIER_ID,
        startDate: new Date(),
        confirmedAt: new Date(),
        comment,
        attempt: attempt.attemptNumber,
      };
      if (endDate) insertDoc.endDate = endDate;
      await Attestations.insertAsync(insertDoc);
    }

    return { passed, result };
  },
});
