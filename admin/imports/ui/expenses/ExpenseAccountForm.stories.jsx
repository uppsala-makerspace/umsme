import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { ExpenseAccountForm } from './ExpenseAccountForm';
import { storyAccount, storyGroups, storyChoices } from './fixtures';

const values = (a) => ({ name: a.name || '', explanation: a.explanation || '', dimensions: { ...(a.dimensions || {}) }, groupIds: a.groupIds || [], approverMemberIds: a.approverMemberIds || [], approverGroupIds: a.approverGroupIds || [] });
const budget = {
  year: 2026, years: [2027, 2026, 2025], onYear: fn(), today: '2026-10-20', canEdit: true, onAdd: fn(), onRemove: fn(),
  revisions: [
    { _id: 'b2', amount: 10000, dateText: '2026-06-01', comment: 'Ny brännugn', setBy: 'm3', setByName: 'Kerstin Kassör' },
    { _id: 'b1', amount: 8000, dateText: '2026-01-15', setBy: null },
  ],
};

const Editable = ({ values: initial, initialTab = 'details', ...props }) => {
  const [tab, setTab] = useState(initialTab);
  const [current, setCurrent] = useState(initial);
  return <ExpenseAccountForm {...props} tab={tab} onTab={setTab} values={current} onChange={(f, v) => setCurrent((c) => ({ ...c, [f]: v }))} />;
};

export default {
  title: 'Expenses/ExpenseAccountForm',
  component: ExpenseAccountForm,
  render: (args) => <Editable {...args} />,
  args: {
    isNew: false, account: storyAccount, values: values(storyAccount), canEdit: true, groups: storyGroups, choices: storyChoices,
    dimensions: [{ nr: '1', name: 'Kostnadsställe', suggestions: ['MEDLEM'] }, { nr: '6', name: 'Projekt', suggestions: ['KERAMIK', 'TRA'] }],
    use: { expenses: 12, budgets: 2 }, budget, onSave: fn(), onDelete: fn(), memberName: () => null,
  },
};

export const InUse = {};
export const BudgetTab = { args: { initialTab: 'budget' } };
export const NewAccount = { args: { isNew: true, account: null, values: values({}), use: null, budget: null, choices: { candidates: [], activeCounts: {}, approverGroupMembers: [] } } };
export const ForTheTreasurer = { args: { canEdit: false } };
export const LosingAnApprover = { args: { values: { ...values(storyAccount), approverMemberIds: ['m1', 'm4'] }, memberName: (id) => (id === 'm4' ? 'Olle Utanför' : null) } };
