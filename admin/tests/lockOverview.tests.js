import assert from 'assert';
import { memberLockRows } from '/server/lock/overview';

const d = (iso) => new Date(iso);
const now = d('2026-06-01T12:00:00Z');
const status = {
  users: [
    { id: 'u1', username: 'Right@Example.org', role: 'user' },
    { id: 'u2', username: 'wrong@example.org', role: 'user' },
    { id: 'u3', username: 'nocal@example.org', role: 'user' },
    { id: 'u4', username: 'boss@example.org', role: 'administrator' },
  ],
  links: [
    { id: 'l1', user_id: 'u1', calendar_id: 'c1' },
    { id: 'l2', user_id: 'u2', calendar_id: 'c2' },
    { id: 'l3', user_id: 'u3', calendar_id: null },
  ],
  calendars: [
    { id: 'c1', rule_sets: [{ end_time: '2026-09-01T00:00:00Z' }] },
    { id: 'c2', rule_sets: [{ end_time: '2026-08-01T00:00:00Z' }] },
  ],
};
const lab = d('2026-09-01T00:00:00Z');
const members = [
  { _id: 'a', name: 'A', lab, lock: 'right@example.org' },
  { _id: 'b', name: 'B', lab, lock: 'wrong@example.org' },
  { _id: 'c', name: 'C', lab, lock: 'nocal@example.org' },
  { _id: 'd', name: 'D', lab, lock: 'boss@example.org' },
  { _id: 'e', name: 'E', lab, lock: 'gone@example.org' },
  { _id: 'f', name: 'F', lab },
  { _id: 'g', name: 'G', lab: d('2025-01-01'), lock: 'left@example.org' },
  { _id: 'h', name: 'H' },
];

describe('lock overview', function () {
  it('compares the lock with the lab end dates', function () {
    const rows = memberLockRows(status, members, now);
    assert.deepStrictEqual(rows.map((r) => [r._id, r.status, r.fix]), [
      ['a', 'correct', false], ['b', 'wrong', true], ['c', 'wrong', true], ['d', 'admin', false],
      ['e', 'invited', false], ['f', 'noaccount', false], ['g', 'old', false],
    ]);
    assert.strictEqual(rows[1].lockEnd, '2026-08-01');
  });
});
