import React, { createContext, useState, useEffect, useCallback, useRef } from "react";
import { useTracker } from "meteor/react-meteor-data";
import { Meteor } from "meteor/meteor";

const LAST_SEEN_KEY = "messagesLastSeen";
const CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_CHECK_INTERVAL_MS = 30 * 1000;

export const MessagesContext = createContext({
  messages: [],
  announcements: [],
  loading: true,
  hasNew: false,
  latestDate: null,
  markAsSeen: () => {},
  refetch: async () => {},
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
      if (!background) setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

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

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      if (
        lastFetchedAtRef.current &&
        Date.now() - lastFetchedAtRef.current > CACHE_TTL_MS
      ) {
        fetch({ background: true });
      }
    }, STALE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId, fetch]);

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
      value={{ messages, announcements, loading, hasNew, latestDate, lastSeen, markAsSeen, refetch: fetch }}
    >
      {children}
    </MessagesContext.Provider>
  );
};
