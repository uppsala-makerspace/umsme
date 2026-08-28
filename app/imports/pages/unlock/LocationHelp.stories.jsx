import LocationHelp from "./LocationHelp";

export default {
  title: "Pages/Unlock/LocationHelp",
  component: LocationHelp,
};

// Collapsed is what the member sees first; expand it in the preview to read the
// steps. Each story is one reason, since the steps differ per reason.

export const OutOfRange = {
  args: {
    reason: "outOfRange",
    distance: 367,
    onRetry: () => {},
  },
};

export const NoPosition = {
  args: {
    reason: "noPosition",
    onRetry: () => {},
  },
};

// A timeout is the same silent "pending" state, but the guide can name it.
export const TimedOut = {
  args: {
    reason: "noPosition",
    locationError: "timeout",
    onRetry: () => {},
  },
};

export const Retrying = {
  args: {
    reason: "noPosition",
    locating: true,
    onRetry: () => {},
  },
};

export const Denied = {
  args: {
    reason: "denied",
    onRetry: () => {},
  },
};

export const Unavailable = {
  args: {
    reason: "unavailable",
    onRetry: () => {},
  },
};

// Guards the "no problem" case: without a reason the component renders nothing,
// which is what keeps it out of the payment and liability views.
export const NoProblem = {
  args: {
    reason: undefined,
    onRetry: () => {},
  },
};
