/** A certificate's page, at a tab (details, holders, other). */
export const certificatePath = (certificateId, tab) => `/certificate/${certificateId}${tab && tab !== 'details' ? `?tab=${tab}` : ''}`;
