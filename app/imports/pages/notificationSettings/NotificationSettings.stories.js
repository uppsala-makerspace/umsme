import NotificationSettings from "./NotificationSettings";

export default {
  title: "Pages/NotificationSettings",
  component: NotificationSettings,
};

export const Default = {
  args: {
    prefs: { membershipExpiry: true },
    loading: false,
    pushPermission: "granted",
    isAdmin: false,
    onToggle: (key) => console.log("Toggle:", key),
    onSendTest: () => console.log("Send test"),
  },
};

export const Loading = {
  args: {
    prefs: { membershipExpiry: true },
    loading: true,
    pushPermission: "default",
    isAdmin: false,
    onToggle: (key) => console.log("Toggle:", key),
    onSendTest: () => console.log("Send test"),
  },
};

export const PushDefault = {
  args: {
    prefs: { membershipExpiry: true },
    loading: false,
    pushPermission: "default",
    isAdmin: false,
    onToggle: (key) => console.log("Toggle:", key),
    onSendTest: () => console.log("Send test"),
    onRequestPermission: () => console.log("Request permission"),
  },
};

export const PushUnsupported = {
  args: {
    prefs: { membershipExpiry: true },
    loading: false,
    pushPermission: "unsupported",
    isAdmin: false,
    onToggle: (key) => console.log("Toggle:", key),
    onSendTest: () => console.log("Send test"),
  },
};

export const PushDenied = {
  args: {
    prefs: { membershipExpiry: true },
    loading: false,
    pushPermission: "denied",
    isAdmin: false,
    onToggle: (key) => console.log("Toggle:", key),
    onSendTest: () => console.log("Send test"),
  },
};

export const AdminView = {
  args: {
    prefs: { membershipExpiry: true, testNotification: true },
    loading: false,
    pushPermission: "granted",
    isAdmin: true,
    onToggle: (key) => console.log("Toggle:", key),
    onSendTest: () => console.log("Send test"),
  },
};

export const AllTogglesOff = {
  args: {
    prefs: { membershipExpiry: false, testNotification: false },
    loading: false,
    pushPermission: "granted",
    isAdmin: true,
    onToggle: (key) => console.log("Toggle:", key),
    onSendTest: () => console.log("Send test"),
  },
};
