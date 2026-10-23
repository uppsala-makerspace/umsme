/** The tabs of a member's page, as the URL names them; details is the page without one. */
export const MEMBER_TABS = ['details', 'family', 'memberships', 'messages', 'comments', 'certificates'];

/** A member's page, at a tab. */
export const memberPath = (memberId, tab) => `/member/${memberId}${tab && tab !== 'details' ? `?tab=${tab}` : ''}`;

/** A membership's page, at a tab (details, messages, comments). */
export const membershipPath = (membershipId, tab) => `/membership/${membershipId}${tab && tab !== 'details' ? `?tab=${tab}` : ''}`;
