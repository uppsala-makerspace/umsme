import { Meteor } from "meteor/meteor";
import React, { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import { useSignedIn } from "../components/useSignedIn";
import Calendar, { WHENS } from "./Calendar.jsx";

/**
 * /calendar[?when=past]: the choice between events to come, past ones and
 * one's own is in the address, so that going back from an event lands where
 * one was.
 */
export default () => {
  const { user, userId, loggingIn } = useSignedIn();
  const [params, setParams] = useSearchParams();
  const when = WHENS.includes(params.get("when")) ? params.get("when") : "upcoming";
  const [canCreateEvent, setCanCreateEvent] = useState(false);
  const [events, setEvents] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // A step in the address, not in the history: back leaves the page.
  const choose = (value) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (value === "upcoming") next.delete("when"); else next.set("when", value);
    return next;
  }, { replace: true });

  useEffect(() => {
    if (!user) return;
    Meteor.callAsync("events.mayCreate")
      .then(setCanCreateEvent, (error) => console.error("Error asking about new events:", error));
  }, [user?._id]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Meteor.callAsync("events.list", when, 0)
      .then((page) => { setEvents(page.events); setHasMore(page.more); },
        (error) => console.error("Error fetching events:", error))
      .finally(() => setLoading(false));
  }, [user?._id, when]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await Meteor.callAsync("events.list", when, events.length);
      setEvents((current) => [...current, ...page.events]);
      setHasMore(page.more);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (!userId && !loggingIn) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <Calendar
        when={when} onWhen={choose} canCreateEvent={canCreateEvent}
        events={events} loading={loading} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore}
      />
    </Layout>
  );
};
