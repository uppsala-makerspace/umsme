import Storage from "./Storage";

export default {
  title: "Pages/Storage",
  component: Storage,
};

const actions = {
  onRetry: async () => {},
  onUpsertRequest: async () => {},
  onCancelRequest: async () => {},
  onConfirmOffer: async () => {},
};
const unit = (name, availability_status = "occupied") => ({
  _id: `unit-${name}`,
  name,
  floor: "floor1",
  height: "low",
  availability_status,
});
const baseState = {
  member: "member-1",
  owner: "member-1",
  family_read_only: false,
  has_active_lab_membership: true,
  request: null,
  unit: null,
  awaiting_clearance: null,
  offer: null,
  warning: null,
};

export const Loading = { args: { ...actions, loading: true, state: null } };
export const LoadFailure = { args: { ...actions, loading: false, state: null, error: "Storage information could not be loaded." } };
export const EligibleWithoutStorage = { args: { ...actions, loading: false, state: baseState } };
export const NoActiveLabMembership = {
  args: { ...actions, loading: false, state: { ...baseState, has_active_lab_membership: false } },
};
export const WaitingForStorage = {
  args: {
    ...actions,
    loading: false,
    state: {
      ...baseState,
      request: {
        _id: "request-allocation",
        request_type: "allocation",
        request_status: "waiting",
        requested_at: new Date("2026-05-04"),
        preference: { floor: "floor2", height: "high" },
      },
    },
  },
};
export const PausedRequest = {
  args: {
    ...actions,
    loading: false,
    state: {
      ...baseState,
      has_active_lab_membership: false,
      request: {
        _id: "request-paused",
        request_type: "allocation",
        request_status: "paused_ineligible",
        requested_at: new Date("2026-05-04"),
      },
    },
  },
};
export const Occupied = {
  args: {
    ...actions,
    loading: false,
    state: { ...baseState, unit: { ...unit("A-12"), assigned_at: new Date("2025-03-01") } },
  },
};
export const MoveRequested = {
  args: {
    ...actions,
    loading: false,
    state: {
      ...baseState,
      unit: { ...unit("A-12"), assigned_at: new Date("2025-03-01") },
      request: {
        _id: "request-move",
        request_type: "move",
        request_status: "waiting",
        requested_at: new Date("2026-08-20"),
        preference: { floor: "floor2", height: "low" },
      },
    },
  },
};
export const ReleaseRequested = {
  args: {
    ...actions,
    loading: false,
    state: {
      ...baseState,
      unit: { ...unit("A-12"), assigned_at: new Date("2025-03-01") },
      request: { _id: "request-release", request_type: "release", request_status: "waiting", requested_at: new Date("2026-08-20") },
    },
  },
};
export const MovePendingConfirmation = {
  args: {
    ...actions,
    loading: false,
    state: {
      ...baseState,
      unit: { ...unit("A-12"), assigned_at: new Date("2025-03-01") },
      request: { _id: "request-move", request_type: "move", request_status: "in_progress", requested_at: new Date("2026-08-20") },
      offer: {
        _id: "offer-1",
        deadline_at: new Date("2026-09-24"),
        requires_inspection: true,
        destination: unit("B-04", "reserved"),
      },
    },
  },
};
export const OverdueWarning = {
  args: {
    ...actions,
    loading: false,
    state: {
      ...baseState,
      has_active_lab_membership: false,
      unit: { ...unit("A-12"), assigned_at: new Date("2025-03-01") },
      warning: { _id: "warning-1", warned_at: new Date("2026-09-01"), deadline_at: new Date("2026-09-29") },
    },
  },
};
export const AwaitingClearance = {
  args: { ...actions, loading: false, state: { ...baseState, has_active_lab_membership: false, awaiting_clearance: unit("A-12", "awaiting_clearance") } },
};
export const FamilyDependentReadOnly = {
  args: {
    ...actions,
    loading: false,
    state: {
      ...baseState,
      member: "dependent-1",
      owner: "member-1",
      family_read_only: true,
      unit: { ...unit("A-12"), assigned_at: new Date("2025-03-01") },
      request: { _id: "request-move", request_type: "move", request_status: "waiting", requested_at: new Date("2026-08-20") },
    },
  },
};

// The locale toolbar renders every lifecycle story in Swedish or English.
export const MovePendingConfirmationEnglish = {
  ...MovePendingConfirmation,
  globals: { locale: "en" },
};
