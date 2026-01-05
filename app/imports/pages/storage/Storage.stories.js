import Storage from "./Storage";

export default {
  title: "Pages/Storage",
  component: Storage,
};

export const Loading = {
  args: {
    storage: null,
    storagequeue: null,
    storagerequest: null,
    hasLabMembership: false,
    loading: true,
    onQueueForBox: () => console.log("Queue for box"),
    onSubmitRequest: (request) => console.log("Submit request:", request),
    onCancelQueue: () => console.log("Cancel queue"),
  },
};

export const NoLabMembership = {
  args: {
    storage: null,
    storagequeue: null,
    storagerequest: null,
    hasLabMembership: false,
    loading: false,
    onQueueForBox: () => console.log("Queue for box"),
    onSubmitRequest: (request) => console.log("Submit request:", request),
    onCancelQueue: () => console.log("Cancel queue"),
  },
};

export const HasStorageBox = {
  args: {
    storage: 42,
    storagequeue: null,
    storagerequest: null,
    hasLabMembership: true,
    loading: false,
    onQueueForBox: () => console.log("Queue for box"),
    onSubmitRequest: (request) => console.log("Submit request:", request),
    onCancelQueue: () => console.log("Cancel queue"),
  },
};

export const HasStorageBoxWithPendingRequest = {
  args: {
    storage: 42,
    storagequeue: null,
    storagerequest: "floor1L",
    hasLabMembership: true,
    loading: false,
    onQueueForBox: () => console.log("Queue for box"),
    onSubmitRequest: (request) => console.log("Submit request:", request),
    onCancelQueue: () => console.log("Cancel queue"),
  },
};

export const HasStorageBoxRequestingToGiveUp = {
  args: {
    storage: 42,
    storagequeue: null,
    storagerequest: "none",
    hasLabMembership: true,
    loading: false,
    onQueueForBox: () => console.log("Queue for box"),
    onSubmitRequest: (request) => console.log("Submit request:", request),
    onCancelQueue: () => console.log("Cancel queue"),
  },
};

export const InQueueForBox = {
  args: {
    storage: null,
    storagequeue: true,
    storagerequest: null,
    hasLabMembership: true,
    loading: false,
    onQueueForBox: () => console.log("Queue for box"),
    onSubmitRequest: (request) => console.log("Submit request:", request),
    onCancelQueue: () => console.log("Cancel queue"),
  },
};

export const InQueueWithPreference = {
  args: {
    storage: null,
    storagequeue: true,
    storagerequest: "floor2U",
    hasLabMembership: true,
    loading: false,
    onQueueForBox: () => console.log("Queue for box"),
    onSubmitRequest: (request) => console.log("Submit request:", request),
    onCancelQueue: () => console.log("Cancel queue"),
  },
};

export const NoBoxNotInQueue = {
  args: {
    storage: null,
    storagequeue: false,
    storagerequest: null,
    hasLabMembership: true,
    loading: false,
    onQueueForBox: () => console.log("Queue for box"),
    onSubmitRequest: (request) => console.log("Submit request:", request),
    onCancelQueue: () => console.log("Cancel queue"),
  },
};
