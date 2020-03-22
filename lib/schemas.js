import { models } from './models';
import SimpleSchema from 'simpl-schema';
SimpleSchema.extendOptions(['autoform']);

export const schemas = {
  member: new SimpleSchema(models.member),
  message: new SimpleSchema(models.message),
  membership: new SimpleSchema(models.membership),
  template: new SimpleSchema(models.template),
  payment: new SimpleSchema(models.payment),
  lockusers: new SimpleSchema(models.lockusers),
  mails: new SimpleSchema(models.mail),
};