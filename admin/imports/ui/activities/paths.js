const withTab = (path, tab) => `${path}${tab && tab !== 'details' ? `?tab=${tab}` : ''}`;

/** An activity's page, at a tab (details, image, events). */
export const activityPath = (activityId, tab) => withTab(`/activity/${activityId}`, tab);

/** An event's page, at a tab (details, image). */
export const eventPath = (eventId, tab) => withTab(`/event/${eventId}`, tab);

/** A new event, of an activity or free-standing. */
export const addEventPath = (activityId) => (activityId ? `/events/add?activity=${activityId}` : '/events/add');
