/** A store item's page, at a tab (details, image, purchases). */
export const storeItemPath = (itemId, tab) => `/storeitem/${itemId}${tab && tab !== 'details' ? `?tab=${tab}` : ''}`;
