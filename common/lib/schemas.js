import { models } from './models';
import SimpleSchema from "meteor/aldeed:simple-schema";

//import SimpleSchema from 'simpl-schema';
SimpleSchema.extendOptions(['autoform']);

models.member.email.regEx = SimpleSchema.RegEx.Email;
models.invites.email.regEx = SimpleSchema.RegEx.Email;

export const schemas = {
  member: new SimpleSchema(models.member),
  message: new SimpleSchema(models.message),
  membership: new SimpleSchema(models.membership),
  template: new SimpleSchema(models.template),
  payment: new SimpleSchema(models.payment),
  lockusers: new SimpleSchema(models.lockusers),
  mails: new SimpleSchema(models.mail),
  comments: new SimpleSchema(models.comment),
  unlocks: new SimpleSchema(models.unlocks),
  users: new SimpleSchema(models.users),
  initiatedPayments: new SimpleSchema(models.initiatedPayments),
  liabilityDocument: new SimpleSchema(models.liabilityDocument),
  certificate: new SimpleSchema(models.certificate),
  attestation: new SimpleSchema(models.attestation),
};