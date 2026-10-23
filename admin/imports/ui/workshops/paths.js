/** A workshop's page, at a tab (details, image, references). */
export const workshopPath = (workshopId, tab) => `/workshop/${workshopId}${tab && tab !== 'details' ? `?tab=${tab}` : ''}`;
