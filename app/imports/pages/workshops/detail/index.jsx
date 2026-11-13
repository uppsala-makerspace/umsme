import { Meteor } from "meteor/meteor";
import React, { useState, useEffect, useCallback, useContext } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import { AppDataContext } from "/imports/context/AppDataContext";
import WorkshopDetail from "./WorkshopDetail.jsx";
import { useSignedIn } from "../../activities/components/useSignedIn";
import { WORKSHOP_TABS } from "../../activities/components/WorkshopCalendar";

export default () => {
  const { workshopId } = useParams();
  const { user, userId, loggingIn } = useSignedIn();
  const { slackChannels } = useContext(AppDataContext);
  const slackTeam = Meteor.settings?.public?.slack?.team;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // The calendar's or the activities' tab, in the address so that going
  // back from an activity lands on it; a step in the address, not the history.
  const [params, setParams] = useSearchParams();
  const tab = WORKSHOP_TABS.includes(params.get("tab")) ? params.get("tab") : "calendar";
  const chooseTab = (value) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (value === "calendar") next.delete("tab"); else next.set("tab", value);
    return next;
  }, { replace: true });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await Meteor.callAsync("workshops.getDetails", workshopId);
      setData(result);
      setError(null);
    } catch (err) {
      console.error("Error fetching workshop details:", err);
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }, [workshopId]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  // Load more events: the next page after those shown, added to them.
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await Meteor.callAsync("workshops.upcomingEvents", workshopId, data.upcomingEvents.length);
      setData((current) => ({
        ...current,
        upcomingEvents: [...current.upcomingEvents, ...page.events],
        upcomingEventsMore: page.more,
      }));
    } catch (err) {
      console.error("Error fetching the workshop's events:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Not while the sign-in is being resumed: a link opened directly has no user yet.
  if (!userId && !loggingIn) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <WorkshopDetail
        loading={loading}
        error={error}
        data={data}
        slackTeam={slackTeam}
        slackChannelIds={slackChannels}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        tab={tab}
        onTab={chooseTab}
      />
    </Layout>
  );
};
