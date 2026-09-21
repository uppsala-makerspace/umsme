import React from "react";
import Unlock from "/imports/pages/unlock/Unlock";
import NotificationSettings from "/imports/pages/notificationSettings/NotificationSettings";
import { withLayout } from "./decorators";
import { dates, doorsList } from "./fixtures";

export default {
  title: "Tutorial/Permissions",
  decorators: [withLayout],
};

// Filename: doors-denied-{lang}.png — the doors page after the member has
// refused location access: grey tiles, the red "denied" box linking to the
// permissions guide, and the help panel underneath.
export const DoorsDenied = {
  render: (args) => <Unlock {...args} />,
  args: {
    doors: doorsList,
    opening: { outerDoor: false, upperFloor: false, lowerFloor: false },
    onOpenDoor: () => {},
    registered: true,
    liabilityDate: dates.liabilityApprovedDate,
    liabilityOutdated: false,
    locationPermission: "denied",
    userPosition: null,
    proximityRange: 100,
    isAdmin: false,
  },
  parameters: { tutorial: { path: "/unlock", file: "doors-denied", isPWA: true } },
};

// Filename: notifications-ask-{lang}.png — Notification Settings before the
// member has answered the push prompt, with the "Allow notifications" button.
export const NotificationsAsk = {
  render: (args) => <NotificationSettings {...args} />,
  args: {
    prefs: { membershipReminders: true, accountAndPayments: true, announcements: true },
    loading: false,
    pushPermission: "default",
    isAdmin: false,
    onToggle: () => {},
    onSendTest: () => {},
    onRequestPermission: () => {},
  },
  parameters: {
    tutorial: { path: "/notification-settings", file: "notifications-ask", notificationPermission: "default" },
  },
};
