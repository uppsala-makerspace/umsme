import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { SendMessage } from './SendMessage';

const Editable = ({ values: initial, ...props }) => {
  const [values, setValues] = useState(initial);
  return <SendMessage {...props} values={values} onChange={(f, v) => setValues((c) => ({ ...c, [f]: v }))} />;
};

export default {
  title: 'Messages/SendMessage',
  component: SendMessage,
  render: (args) => <Editable {...args} />,
  args: {
    memberId: 'm1', draft: { memberName: 'Nora Ny', templateType: 'welcome' }, onSend: fn(),
    values: { to: 'newcomer@example.org', subject: 'Välkommen till Uppsala Makerspace', messagetext: 'Hej Nora!\n\nDitt medlemsnummer är 125.' },
  },
};

export const Welcome = {};
export const Refused = { args: { error: 'Flag deliverMail in settings not set, cannot send mail to newcomer@example.org' } };
