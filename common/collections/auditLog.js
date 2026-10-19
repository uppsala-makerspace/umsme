import { Mongo } from 'meteor/mongo';

/**
 * Who changed what: one document per write made through a domain function.
 * Written on the server only (see common/server/auditLog.js); no allow rules,
 * so no client can write it. Kept for a year.
 */
export const AuditLog = new Mongo.Collection('auditLog');
