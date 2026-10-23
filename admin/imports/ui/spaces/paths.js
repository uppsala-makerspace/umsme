/** A space's page, at a tab (details, icon, references). */
export const spacePath = (spaceId, tab) => `/space/${spaceId}${tab && tab !== 'details' ? `?tab=${tab}` : ''}`;
