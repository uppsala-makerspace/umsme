import { Meteor } from "meteor/meteor";
import React, { useState, useEffect, useContext } from "react";
import { Navigate, useParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import { useSignedIn } from "../components/useSignedIn";
import { AppDataContext } from "/imports/context/AppDataContext";
import EventDetail from "./EventDetail.jsx";

export default () => {
  const { eventId } = useParams();
  const { user, userId, loggingIn } = useSignedIn();
  const { slackChannels } = useContext(AppDataContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Meteor.callAsync("events.get", eventId)
      .then((result) => { setData(result); setError(null); }, (err) => setError(err.reason || err.message))
      .finally(() => setLoading(false));
  }, [user?._id, eventId]);

  if (!userId && !loggingIn) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <EventDetail loading={loading} error={error} data={data}
        slackTeam={Meteor.settings?.public?.slack?.team} slackChannelIds={slackChannels} />
    </Layout>
  );
};
