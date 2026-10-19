import { fn } from 'storybook/test';
import { CommentsSection } from './Comments';

export default {
  title: 'Comments/CommentsSection',
  component: CommentsSection,
  args: {
    comments: [
      { _id: 'c1', text: 'Har frågat om att lägga till ett tredje barn i familjen.', created: new Date(2026, 9, 2) },
      { _id: 'c2', text: 'Betalade via Swish, väntar på att styrelsen godkänner.', created: new Date(2026, 8, 20), modified: new Date(2026, 8, 22) },
    ],
    onAdd: fn(async () => true), onUpdate: fn(async () => true), onRemove: fn(),
  },
};

export const Comments = {};
export const None = { args: { comments: [] } };
