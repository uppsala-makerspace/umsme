import { Template } from 'meteor/templating';
import { Spaces } from '/imports/common/collections/spaces';
import './EntitySpaces.html';

/**
 * Shared "Spaces" section for the workshop and group admin pages: pick one
 * primary space and any number of secondary spaces.
 *
 * Usage: {{> entitySpaces collection=Workshops entityId=someId}}
 * (the enclosing view must subscribe to 'spaces').
 */
const entity = (data) => data?.entityId && data.collection.findOne(data.entityId);

Template.entitySpaces.helpers({
  allSpaces() {
    return Spaces.find({}, { sort: { 'name.sv': 1 } });
  },
  primarySpace() {
    const doc = entity(Template.currentData());
    return doc?.primarySpaceId ? Spaces.findOne(doc.primarySpaceId) : null;
  },
  primarySelected(id) {
    return entity(Template.currentData())?.primarySpaceId === id ? 'selected' : '';
  },
  noPrimarySelected() {
    return entity(Template.currentData())?.primarySpaceId ? '' : 'selected';
  },
  secondarySpaces() {
    const ids = entity(Template.currentData())?.secondarySpaceIds || [];
    return Spaces.find({ _id: { $in: ids } }, { sort: { 'name.sv': 1 } });
  },
  hasSecondarySpaces() {
    return (entity(Template.currentData())?.secondarySpaceIds || []).length > 0;
  },
  addableSpaces() {
    const doc = entity(Template.currentData());
    const taken = [...(doc?.secondarySpaceIds || [])];
    if (doc?.primarySpaceId) taken.push(doc.primarySpaceId);
    return Spaces.find({ _id: { $nin: taken } }, { sort: { 'name.sv': 1 } });
  },
});

Template.entitySpaces.events({
  'click .savePrimarySpace': function (event, template) {
    const { collection, entityId } = template.data;
    const value = template.find('.primarySpaceSelect').value;
    const modifier = value
      ? { $set: { primarySpaceId: value } }
      : { $unset: { primarySpaceId: '' } };
    collection.update(entityId, modifier, (err) => {
      if (err) alert('Update failed: ' + err.message);
    });
  },
  'click .addSecondarySpace': function (event, template) {
    const { collection, entityId } = template.data;
    const value = template.find('.secondarySpaceSelect').value;
    if (!value) return;
    collection.update(entityId, { $addToSet: { secondarySpaceIds: value } }, (err) => {
      if (err) alert('Update failed: ' + err.message);
    });
  },
  'click .removeSecondarySpace': function (event, template) {
    const { collection, entityId } = template.data;
    collection.update(entityId, { $pull: { secondarySpaceIds: event.currentTarget.dataset.id } }, (err) => {
      if (err) alert('Update failed: ' + err.message);
    });
  },
});
