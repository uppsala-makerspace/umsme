import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback, useContext } from "react";
import { Navigate, useParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import { AppDataContext } from "/imports/context/AppDataContext";
import WorkshopDetail from "./WorkshopDetail.jsx";

export default () => {
  const { workshopId } = useParams();
  const user = useTracker(() => Meteor.user());
  const { slackChannels } = useContext(AppDataContext);
  const slackTeam = Meteor.settings?.public?.slack?.team;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

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

  if (!Meteor.userId()) {
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
      />
    </Layout>
  );
};
