/** Expenses and accounts for the stories. */
const DAY = 86400000;
const now = Date.now();
export const storyExpenses = [
  { _id: 'e1', type: 'receipt', date: new Date(now - 5 * DAY), memberName: 'Sara Styrgrupp', accountName: 'Keramik', place: 'Bauhaus', amount: 249, status: 'submitted' },
  { _id: 'e2', type: 'invoice', date: new Date(now - 12 * DAY), dueDate: new Date(now + 3 * DAY), memberName: 'Gustav Gruppledare', accountName: 'Keramik', place: 'Lerbolaget', amount: 1200, status: 'confirmed' },
  { _id: 'e3', type: 'receipt', date: new Date(now - 40 * DAY), memberName: 'Maja Medlem', accountName: 'Trä', place: 'Biltema', amount: 89.5, status: 'reimbursed', reimbursedDate: new Date(now - 30 * DAY) },
];
export const storyList = (rows = storyExpenses) => ({ rows, total: rows.length, loading: false, query: { page: 0, pageSize: 25, sort: null, search: '' }, onQueryChange: () => {} });
export const storyGroups = [{ _id: 'g1', name: { sv: 'Styrgrupp Keramik' } }, { _id: 'g2', name: { sv: 'Ekonomigruppen' } }, { _id: 'g3', name: { sv: 'Lokalgruppen' } }];
export const storyAccount = {
  _id: 'a1', name: 'Keramik', explanation: 'Lera, glasyr och brännkostnader.', dimensions: { 6: 'KERAMIK' },
  groupIds: ['g1'], approverMemberIds: ['m1', 'm2'], approverGroupIds: ['g2'],
};
export const storyChoices = {
  candidates: [{ _id: 'm1', name: 'Gustav Gruppledare', groups: ['Styrgrupp Keramik'] }, { _id: 'm2', name: 'Sara Styrgrupp', groups: ['Styrgrupp Keramik'] }],
  activeCounts: { g2: 3 },
  approverGroupMembers: ['m7', 'm8', 'm9'],
};
