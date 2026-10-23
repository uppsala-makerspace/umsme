/** A group's page, at a tab (details, image, members, references). */
export const groupPath = (groupId, tab) => `/group/${groupId}${tab && tab !== 'details' ? `?tab=${tab}` : ''}`;
