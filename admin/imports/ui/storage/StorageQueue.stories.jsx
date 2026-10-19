import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { StorageQueue } from './StorageQueue';
import { storyQueueRows, storyMembers, storyRequests } from './fixtures';

const Interactive = (props) => {
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState(props.editor);
  return <StorageQueue {...props} query={query} onQueryChange={setQuery} editor={editor} onOpenEditor={setEditor} onCloseEditor={() => setEditor(null)} />;
};

export default {
  title: 'Storage/StorageQueue',
  component: StorageQueue,
  render: (args) => <Interactive {...args} />,
  args: { rows: storyQueueRows, members: storyMembers, onSaveRequest: fn(), onTogglePause: fn(), onCancel: fn() },
};

export const Queue = {};
export const Empty = { args: { rows: [] } };
export const AddingAMember = { args: { editor: { mode: 'add' } } };
export const EditingARequest = { args: { editor: { mode: 'edit', request: storyRequests[0], memberName: 'Kim Kö (130) — kim@example.org' } } };
