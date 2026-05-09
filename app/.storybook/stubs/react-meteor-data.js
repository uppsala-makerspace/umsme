// Storybook stub for `meteor/react-meteor-data`. The real useTracker
// re-runs the supplied function whenever any reactive Meteor source it
// reads changes; in Storybook there are no reactive sources, so we just
// invoke the function once and return its result.

export const useTracker = (fn) => fn();
export const withTracker = () => (Component) => Component;
