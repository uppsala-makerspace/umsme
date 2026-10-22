/**
 * Admin's menu: the sections and their pages, and who sees them. Staff
 * (admin, board, treasurer) see everything; an account with only the
 * storage role sees the storage page.
 */
export const STAFF_ROLES = ['admin', 'board', 'treasurer'];
export const ACCESS_ROLES = [...STAFF_ROLES, 'storage'];

export const MENU = [
  { key: 'members', title: 'Members', items: [['/members', 'All'], ['/history', 'History'], ['/lock', 'Lock'], ['/pending', 'Pending'], ['/reminders', 'Reminders'], ['/excluded', 'Excluded']] },
  { key: 'operation', title: 'Operation', items: [['/workshops', 'Workshops & areas of interest'], ['/groups', 'Groups'], ['/spaces', 'Spaces'], ['/certificates', 'Certificates'], ['/liability', 'Liability'], ['/storage', 'Storage']] },
  { key: 'economy', title: 'Economy', items: [['/payments', 'Payments'], ['/storeitems', 'Store items'], ['/expenses', 'Expenses'], ['/expenses/confirm', 'Confirm expenses'], ['/expenses/reimburse', 'Reimburse expenses'], ['/expenses/accounts', 'Expense accounts'], ['/accounting/bankexport', 'Bank export']] },
  { key: 'messages', title: 'Messages', items: [['/mail', 'Mail'], ['/templates', 'Templates'], ['/announcements', 'Announcements']] },
  { key: 'statistics', title: 'Statistics', items: [['/stats', 'Memberships'], ['/revenue', 'Revenue'], ['/doorunlocks', 'Door unlocks']] },
  { key: 'admin', title: 'Admin', items: [['/users', 'Users'], ['/admin', 'Batch operations']] },
];

/** The menu as someone with these roles sees it. */
export const menuFor = (roles) => {
  if (roles.some((r) => STAFF_ROLES.includes(r))) return MENU;
  if (roles.includes('storage')) return [{ key: 'storage', title: null, items: [['/storage', 'Storage']] }];
  return [];
};
