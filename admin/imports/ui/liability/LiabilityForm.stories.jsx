import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { LiabilityForm } from './LiabilityForm';

const existing = {
  title: 'Ansvarsförbindelse 2025',
  date: '2025-09-14',
  sv: '# Ansvarsförbindelse\n\nJag använder lokalen och maskinerna på egen risk.\n\n1. Var försiktig\n2. Städa efter dig',
  en: '# Liability agreement\n\nI use the premises and machines at my own risk.\n\n1. Be careful\n2. Clean up after yourself',
};

/** The form is controlled; this keeps its values so the fields can be typed in. */
const Editable = ({ values: initial, ...props }) => {
  const [values, setValues] = useState(initial);
  return (
    <LiabilityForm
      {...props}
      values={values}
      onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
    />
  );
};

export default {
  title: 'Liability/LiabilityForm',
  component: LiabilityForm,
  render: (args) => <Editable {...args} />,
  args: {
    isNew: false,
    values: existing,
    onSave: fn(),
    onDelete: fn(),
    busy: false,
  },
};

export const NewVersion = { args: { isNew: true, values: { title: '', date: '', sv: '', en: '' } } };

export const ExistingVersion = {};

/** What the editor sees when someone else saved the version first. */
export const SaveRefused = {
  args: { error: 'Someone else changed this document; reload it and try again' },
};

export const Saving = { args: { busy: true } };

/** Delete asks first; confirming calls onDelete. */
export const ConfirmDelete = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
  },
};
