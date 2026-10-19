import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { sortRevisions } from '/imports/common/lib/expenseBudget';
import { todayIso } from '/imports/expenses/expenseFilters';
import { useNavigate } from '../navigation';
import { useEditor } from '../components/useEditor';
import { useChoices, memberNames } from '../groups/choices';
import { ExpenseAccountList } from './ExpenseAccountList';
import { ExpenseAccountForm } from './ExpenseAccountForm';
import {
  useExpenseAccounts, useExpenseAccount, accountValues, saveExpenseAccount, removeExpenseAccount, expenseAccountUse,
  approverChoices, accountingConfig, addBudget, removeBudget,
} from './data';

/** Admin and board change accounts; the treasurer sees them and sets budgets. */
const useCanEdit = () => useTracker(() => !!Meteor.userId() && Roles.userIsInRole(Meteor.userId(), ['admin', 'board']), []);

export const ExpenseAccountListPage = () => {
  const { loading, accounts } = useExpenseAccounts();
  const { groupName } = useChoices();
  return <ExpenseAccountList loading={loading} accounts={accounts} groupName={groupName} canAdd={useCanEdit()} />;
};

const isoDate = (d) => new Date(d).toLocaleDateString('sv-SE');

/** /expenses/accounts/add without an id, /expenseaccount/:_id with one. */
export const ExpenseAccountEditPage = ({ _id }) => {
  const navigate = useNavigate();
  const canEdit = useCanEdit();
  const { loading, account, budgets, accounts } = useExpenseAccount(_id);
  const { groups, loading: choicesLoading } = useChoices();
  const { values, setField, loaded, run, busy, error, setError, notice, setNotice } = useEditor({ doc: account, loading, toValues: accountValues });
  const [config, setConfig] = useState(null);
  const [choices, setChoices] = useState(null);
  const [use, setUse] = useState(null);
  const [names, setNames] = useState({});
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => { accountingConfig().then(setConfig, () => setConfig({ dimensions: [] })); }, []);
  const groupKey = `${values.groupIds.join(',')}|${values.approverGroupIds.join(',')}`;
  useEffect(() => {
    let current = true;
    approverChoices(values.groupIds, values.approverGroupIds).then((c) => { if (current) setChoices(c); }, (e) => setError(e.reason || e.message));
    return () => { current = false; };
  }, [groupKey]);
  const savedVersion = account?.updatedAt?.getTime();
  useEffect(() => { if (_id) expenseAccountUse(_id).then(setUse, () => {}); }, [_id, savedVersion, budgets.length]);
  // Who the budget setters and approvers are.
  const setters = [...new Set([...budgets.map((b) => b.setBy), ...values.approverMemberIds].filter(Boolean))].filter((id) => !names[id]);
  useEffect(() => {
    if (setters.length) memberNames(setters).then((found) => setNames((n) => ({ ...n, ...Object.fromEntries(found.map((m) => [m._id, m.name])) })));
  }, [setters.join(',')]);

  if (loading || choicesLoading || !config) return <Typography color="text.secondary">Loading…</Typography>;
  if (_id && !account) return <Typography color="text.secondary">There is no such expense account.</Typography>;

  const dimensions = (config.dimensions || []).map((d) => ({
    nr: String(d.nr), name: d.name,
    suggestions: [...new Set(accounts.map((a) => a.dimensions?.[String(d.nr)]).filter(Boolean))].sort(),
  }));
  // Approvers outside the account's groups go when it is saved; the form says so beforehand.
  const toSave = () => {
    const eligible = new Set((choices?.candidates || []).map((c) => c._id));
    return { ...values, approverMemberIds: choices ? values.approverMemberIds.filter((id) => eligible.has(id)) : values.approverMemberIds };
  };
  const common = { values, onChange: setField, busy, error, canEdit, groups, dimensions, choices, memberName: (id) => names[id] };

  if (!_id) {
    return <ExpenseAccountForm isNew {...common} onSave={() => run(() => saveExpenseAccount(toSave(), null), { then: (id) => navigate(`/expenseaccount/${id}`) })} />;
  }

  const years = [...new Set([new Date().getFullYear(), new Date().getFullYear() + 1, ...budgets.map((b) => b.year)])].sort((a, b) => b - a);
  const revisions = sortRevisions(budgets.filter((b) => b.year === year))
    .map((r) => ({ ...r, dateText: isoDate(r.setAt), setByName: r.setBy ? names[r.setBy] || r.setBy : null }));
  const asIs = { keep: null };
  return (
    <ExpenseAccountForm
      isNew={false} {...common} account={account} notice={notice} use={use}
      onSave={() => run(() => saveExpenseAccount(toSave(), loaded), { keep: 'all', then: () => setNotice('Saved.') })}
      onDelete={() => run(() => removeExpenseAccount(_id), { then: () => navigate('/expenses/accounts') })}
      budget={{
        year, years, onYear: setYear, revisions, today: todayIso(), canEdit: true,
        onAdd: (b, done) => run(() => addBudget({ accountId: _id, year, ...b }), { ...asIs, then: done }),
        onRemove: (budgetId) => run(() => removeBudget(budgetId), asIs),
      }}
    />
  );
};
