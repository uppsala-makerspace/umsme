import React, { createContext, useState, useEffect, useCallback } from "react";
import { getUnreadCount } from "/imports/lib/notificationStore";

export const NotificationContext = createContext({
  unreadCount: 0,
  refreshUnreadCount: () => {},
});

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (e) {
      // IndexedDB may not be available
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();

    let channel;
    try {
      channel = new BroadcastChannel("notifications");
      channel.onmessage = (event) => {
        if (event.data?.type === "NEW_NOTIFICATION") {
          refreshUnreadCount();
        }
      };
    } catch (e) {
      // BroadcastChannel may not be supported
    }

    return () => {
      if (channel) channel.close();
    };
  }, [refreshUnreadCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
