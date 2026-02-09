import NotificationsList from "./NotificationsList";

export default {
  title: "Pages/NotificationsList",
  component: NotificationsList,
};

export const Empty = {
  args: {
    notifications: [],
    onClearAll: () => console.log("Clear all"),
  },
};

export const WithNotifications = {
  args: {
    notifications: [
      {
        id: 1,
        title: { sv: "Ditt medlemskap löper ut om 7 dagar", en: "Your membership expires in 7 days" },
        body: { sv: "Förnya gärna för att behålla ditt medlemskap!", en: "Please renew to keep your membership!" },
        timestamp: Date.now() - 1000 * 60 * 30,
      },
      {
        id: 2,
        title: { sv: "Testavisering", en: "Test notification" },
        body: { sv: "Detta är en testavisering från UMS.", en: "This is a test notification from UMS." },
        timestamp: Date.now() - 1000 * 60 * 60 * 3,
      },
      {
        id: 3,
        title: { sv: "Ditt medlemskap löper ut idag", en: "Your membership expires today" },
        body: { sv: "Förnya gärna för att behålla ditt medlemskap!", en: "Please renew to keep your membership!" },
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2,
      },
    ],
    onClearAll: () => console.log("Clear all"),
  },
};

export const SingleNotification = {
  args: {
    notifications: [
      {
        id: 1,
        title: { sv: "Ditt medlemskap gick ut för 7 dagar sedan", en: "Your membership expired 7 days ago" },
        body: { sv: "Förnya gärna för att behålla ditt medlemskap!", en: "Please renew to keep your membership!" },
        timestamp: Date.now() - 1000 * 60 * 5,
      },
    ],
    onClearAll: () => console.log("Clear all"),
  },
};
