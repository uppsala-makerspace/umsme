import React, { useState } from 'react';
import Typography from '@mui/material/Typography';
import { DateField } from './DateField';

const Editable = ({ initial, ...props }) => {
  const [value, setValue] = useState(initial);
  return (
    <>
      <DateField {...props} value={value} onChange={setValue} />
      <Typography variant="body2" sx={{ mt: 2 }}>Value: “{value}”</Typography>
    </>
  );
};

export default { title: 'Components/DateField', component: DateField, render: (args) => <Editable {...args} />, args: { label: 'Start date', initial: '2026-10-23' } };

export const WithDay = {};
export const Empty = { args: { initial: '', helperText: 'Empty: no end' } };
export const Required = { args: { initial: '', required: true } };
