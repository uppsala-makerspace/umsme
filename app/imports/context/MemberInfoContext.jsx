import React, { createContext, useState, useEffect, useCallback, useRef } from "react";
import { useTracker } from "meteor/react-meteor-data";
import { Meteor } from "meteor/meteor";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

export const MemberInfoContext = createContext({
  memberInfo: null,
  loading: true,
  refetch: async () => {},
});

export const MemberInfoProvider = ({ children }) => {
  // Use Meteor.user() instead of Meteor.userId() — userId is available
  // immediately from localStorage cache, but user() only resolves after the
  // DDP login handshake completes, preventing calls before the server knows
  // who we are.
  const user = useTracker(() => Meteor.user());
  const userId = user?._id;
  const [memberInfo, setMemberInfo] = useState(null);
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
      if (!background) {
        setLoading(false);
      }
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
    } else {
      setMemberInfo(null);
      setLoading(false);
      lastFetchedAtRef.current = null;
    }
  }, [userId, fetchMemberInfo]);

  // Periodic staleness check (stale-while-revalidate)
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      if (
        lastFetchedAtRef.current &&
        Date.now() - lastFetchedAtRef.current > CACHE_TTL_MS
      ) {
        fetchMemberInfo({ background: true });
      }
    }, STALE_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [userId, fetchMemberInfo]);

  return (
    <MemberInfoContext.Provider value={{ memberInfo, loading, refetch }}>
      {children}
    </MemberInfoContext.Provider>
  );
};
