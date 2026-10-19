import { Template } from 'meteor/templating';
import { CommentsFor } from '/imports/ui/comments/CommentsFor';
import '../../react/ReactSlot';

// The comments on Blaze pages not yet migrated, through the React section:
//   {{> ReactSlot component=commentsComponent props=(commentsAbout id)}}
Template.registerHelper('commentsComponent', () => CommentsFor);
Template.registerHelper('commentsAbout', (about) => ({ about }));
