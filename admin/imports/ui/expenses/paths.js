/** An expense account's page, at a tab (details, budget). */
export const expenseAccountPath = (accountId, tab) => `/expenseaccount/${accountId}${tab && tab !== 'details' ? `?tab=${tab}` : ''}`;
