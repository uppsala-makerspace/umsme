import { models } from './models';
import SimpleSchema from 'simpl-schema';
SimpleSchema.extendOptions(['autoform']);

export const schemas = {
  member: new SimpleSchema(models.member),
  membership: new SimpleSchema(models.membership)
};