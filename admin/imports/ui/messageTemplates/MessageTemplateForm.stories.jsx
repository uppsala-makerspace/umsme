import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { testTemplates } from '/imports/common/lib/messageTemplates';
import { MessageTemplateForm } from './MessageTemplateForm';

const existing = {
  name: 'Påminnelse', type: 'reminder', membershiptype: 'labandmember', membertype: 'family',
  subject: 'Dags att förnya, <%= name %>',
  messagetext: 'Hej <%= name %>!\n\nDitt medlemskap går ut <%= memberEndDate %>.',
  auto: false, deprecated: false,
};
const empty = { name: '', type: '', membershiptype: '', membertype: '', subject: '', messagetext: '', auto: false, deprecated: false };

/** Keeps the values and runs the test, as the page does. */
const Editable = ({ values: initial, testResult: initialResult, ...props }) => {
  const [values, setValues] = useState(initial);
  const [testResult, setTestResult] = useState(initialResult);
  return (
    <MessageTemplateForm
      {...props}
      values={values}
      testResult={testResult}
      onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
      onTest={() => setTestResult(testTemplates(values))}
    />
  );
};

export default {
  title: 'Message templates/MessageTemplateForm',
  component: MessageTemplateForm,
  render: (args) => <Editable {...args} />,
  args: { isNew: false, values: existing, onSave: fn(), onDelete: fn(), busy: false },
};

export const NewTemplate = { args: { isNew: true, values: empty } };

export const ExistingTemplate = {};

export const TestedWithSampleData = { args: { testResult: testTemplates(existing) } };

export const DoesNotCompile = {
  args: {
    values: { ...existing, messagetext: 'Hej <%= name + %>' },
    testResult: testTemplates({ ...existing, messagetext: 'Hej <%= name + %>' }),
  },
};

export const SaveRefused = { args: { error: 'Someone else changed this template; reload it and try again' } };

export const ConfirmDelete = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
  },
};
