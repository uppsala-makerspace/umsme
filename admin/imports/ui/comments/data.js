import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { Comments } from '/imports/common/collections/comments';

export const useComments = (about) => useTracker(() => {
  const handle = Meteor.subscribe('admin.comments.about', about);
  return { loading: !handle.ready(), comments: Comments.find({ about }, { sort: { created: -1 } }).fetch() };
}, [about]);

export const addComment = (about, text) => Meteor.callAsync('comments.add', about, text);
export const updateComment = (docId, text) => Meteor.callAsync('comments.update', docId, text);
export const removeComment = (docId) => Meteor.callAsync('comments.remove', docId);
