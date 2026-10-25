import { Meteor } from "meteor/meteor";
import React, { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import { useSignedIn } from "../components/useSignedIn";
import Activities, { TABS, WHENS } from "./Activities.jsx";

/**
 * /activities[?tab=activities][&when=past]: the tab and the choice between
 * events to come and past ones are in the address, so that going back from
 * an activity or an event lands where one was.
 */
export default () => {
  const { user, userId, loggingIn } = useSignedIn();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("tab")) ? params.get("tab") : "events";
  const when = WHENS.includes(params.get("when")) ? params.get("when") : "upcoming";
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});
  const [events, setEvents] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // A step in the address, not in the history: back leaves the page.
  const choose = (key, value, fallback) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (value === fallback) next.delete(key); else next.set(key, value);
    return next;
  }, { replace: true });

  useEffect(() => {
    if (!user) return;
    Meteor.callAsync("activities.list")
      .then(setData, (error) => console.error("Error fetching activities:", error))
      .finally(() => setLoading(false));
  }, [user?._id]);

  useEffect(() => {
    if (!user) return;
    setEventsLoading(true);
    Meteor.callAsync("events.list", when, 0)
      .then((page) => { setEvents(page.events); setHasMore(page.more); },
        (error) => console.error("Error fetching events:", error))
      .finally(() => setEventsLoading(false));
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
      <Activities
        {...data} loading={loading}
        tab={tab} onTab={(next) => choose("tab", next, "events")}
        when={when} onWhen={(next) => choose("when", next, "upcoming")}
        events={events} eventsLoading={eventsLoading} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore}
      />
    </Layout>
  );
};
