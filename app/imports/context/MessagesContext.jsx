import React, { createContext, useState, useEffect, useCallback, useRef } from "react";
import { useTracker } from "meteor/react-meteor-data";
import { Meteor } from "meteor/meteor";

const LAST_SEEN_KEY = "messagesLastSeen";
// "Stale-after" horizon. Used by refetchIfStale to decide whether to refresh
// on tab-resume or page mount. Polling on /messages happens independently in
// the page itself.
const CACHE_TTL_MS = 5 * 60 * 1000;

export const MessagesContext = createContext({
  messages: [],
  announcements: [],
  loading: true,
  hasNew: false,
  latestDate: null,
  markAsSeen: () => {},
  refetch: async () => {},
  refetchIfStale: () => {},
});

export const MessagesProvider = ({ children }) => {
  const { user, loggingIn } = useTracker(() => ({
    user: Meteor.user(),
    loggingIn: Meteor.loggingIn(),
  }));
  const userId = user?._id;
  const [messages, setMessages] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState(() => {
    const stored = localStorage.getItem(LAST_SEEN_KEY);
    return stored ? new Date(stored) : null;
  });
  const lastFetchedAtRef = useRef(null);
  const fetchingRef = useRef(false);

  const fetch = useCallback(async ({ background = false } = {}) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (!background) setLoading(true);
    try {
      const res = await Meteor.callAsync("getMessagesAndAnnouncements");
      setMessages(res.messages || []);
      setAnnouncements(res.announcements || []);
      lastFetchedAtRef.current = Date.now();
    } catch (err) {
      console.error("MessagesContext: Error fetching:", err);
    } finally {
      // Always clear the spinner once any fetch completes — handles the
      // reload-on-/messages race where the page's background refetchIfStale
      // grabs fetchingRef before the userId effect's foreground fetch can
      // start, so the foreground's setLoading(false) would otherwise never run.
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const refetchIfStale = useCallback(() => {
    if (fetchingRef.current) return;
    const last = lastFetchedAtRef.current;
    if (last == null || Date.now() - last > CACHE_TTL_MS) {
      fetch({ background: true });
    }
  }, [fetch]);

  useEffect(() => {
    if (userId) {
      fetch();
    } else if (!loggingIn) {
      setMessages([]);
      setAnnouncements([]);
      setLoading(false);
      lastFetchedAtRef.current = null;
    }
  }, [userId, loggingIn, fetch]);

  // Refresh eagerly when the service worker reports a new push notification.
  useEffect(() => {
    if (!userId) return;
    let channel;
    try {
      channel = new BroadcastChannel("notifications");
      channel.onmessage = (event) => {
        if (event.data?.type === "NEW_NOTIFICATION") {
          fetch({ background: true });
        }
      };
    } catch (e) {
      // BroadcastChannel may not be supported.
    }
    return () => {
      if (channel) channel.close();
    };
  }, [userId, fetch]);

  // Refresh when the tab/app becomes visible again, but only if stale.
  // Catches the "user denied notifications, came back after a while" case
  // without polling while we're hidden.
  useEffect(() => {
    if (!userId) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetchIfStale();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [userId, refetchIfStale]);

  const allDates = [
    ...messages.map((m) => m.senddate),
    ...announcements.map((a) => a.sentAt),
  ].filter(Boolean).map((d) => new Date(d));

  const latestDate = allDates.length > 0
    ? new Date(Math.max(...allDates.map((d) => d.getTime())))
    : null;

  const hasNew = latestDate && (!lastSeen || latestDate > lastSeen);

  const markAsSeen = useCallback(() => {
    const now = new Date();
    localStorage.setItem(LAST_SEEN_KEY, now.toISOString());
    setLastSeen(now);
  }, []);

  return (
    <MessagesContext.Provider
      value={{ messages, announcements, loading, hasNew, latestDate, lastSeen, markAsSeen, refetch: fetch, refetchIfStale }}
    >
      {children}
    </MessagesContext.Provider>
  );
};
