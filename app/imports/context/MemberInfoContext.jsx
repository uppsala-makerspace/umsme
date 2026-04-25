import React, { createContext, useState, useEffect, useCallback, useRef } from "react";
import { useTracker } from "meteor/react-meteor-data";
import { Meteor } from "meteor/meteor";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

export const MemberInfoContext = createContext({
  memberInfo: {},
  loading: true,
  refetch: async () => {},
});

export const MemberInfoProvider = ({ children }) => {
  // Use Meteor.user() instead of Meteor.userId() — userId is available
  // immediately from localStorage cache, but user() only resolves after the
  // DDP login handshake completes, preventing calls before the server knows
  // who we are.
  const { user, loggingIn } = useTracker(() => ({
    user: Meteor.user(),
    loggingIn: Meteor.loggingIn(),
  }));
  const userId = user?._id;
  const [memberInfo, setMemberInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const lastFetchedAtRef = useRef(null);
  const fetchingRef = useRef(false);

  const fetchMemberInfo = useCallback(async ({ background = false } = {}) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!background) {
      setLoading(true);
    }

    try {
      const info = await Meteor.callAsync("findInfoForUser");
      setMemberInfo(info);
      lastFetchedAtRef.current = Date.now();
    } catch (error) {
      console.error("MemberInfoContext: Error fetching member info:", error);
    } finally {
      // Always clear the spinner once any fetch completes — handles the
      // reload race where a background refetch grabs fetchingRef before
      // the userId effect's foreground fetch can start, so the foreground's
      // setLoading(false) would otherwise never run. Same pattern as
      // MessagesContext.
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Public refetch — always foreground (shows loading if no data yet)
  const refetch = useCallback(async () => {
    await fetchMemberInfo({ background: !!memberInfo });
  }, [fetchMemberInfo, memberInfo]);

  // Fetch on login, clear on logout
  useEffect(() => {
    if (userId) {
      fetchMemberInfo();
    } else if (!loggingIn) {
      setMemberInfo({});
      setLoading(false);
      lastFetchedAtRef.current = null;
    }
  }, [userId, loggingIn, fetchMemberInfo]);

  // Visibility-aware staleness check (stale-while-revalidate). Polls every
  // STALE_CHECK_INTERVAL_MS while the tab is visible AND the user is logged
  // in, refetching in the background once CACHE_TTL_MS has elapsed since the
  // last fetch. Pauses entirely while hidden, and refreshes immediately on
  // resume so a user who was away for > TTL sees fresh data without waiting
  // for the next tick.
  useEffect(() => {
    if (!userId) return;
    let interval = null;
    const tickIfStale = () => {
      if (
        lastFetchedAtRef.current &&
        Date.now() - lastFetchedAtRef.current > CACHE_TTL_MS
      ) {
        fetchMemberInfo({ background: true });
      }
    };
    const start = () => {
      if (interval) return;
      interval = setInterval(tickIfStale, STALE_CHECK_INTERVAL_MS);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        tickIfStale();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [userId, fetchMemberInfo]);

  return (
    <MemberInfoContext.Provider value={{ memberInfo, loading, refetch }}>
      {children}
    </MemberInfoContext.Provider>
  );
};
