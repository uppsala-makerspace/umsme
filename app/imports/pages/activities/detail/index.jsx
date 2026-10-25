import { Meteor } from "meteor/meteor";
import React, { useState, useEffect, useContext } from "react";
import { Navigate, useParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import { useSignedIn } from "../components/useSignedIn";
import { AppDataContext } from "/imports/context/AppDataContext";
import ActivityDetail from "./ActivityDetail.jsx";

export default () => {
  const { activityId } = useParams();
  const { user, userId, loggingIn } = useSignedIn();
  const { slackChannels } = useContext(AppDataContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [busy, setBusy] = useState(false);
  const load = () => Meteor.callAsync("activities.get", activityId)
    .then((result) => { setData(result); setError(null); }, (err) => setError(err.reason || err.message));

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [user?._id, activityId]);

  const setInterest = async (interested) => {
    setBusy(true);
    try {
      await Meteor.callAsync("activities.setInterest", activityId, interested);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!userId && !loggingIn) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <ActivityDetail loading={loading} error={error} data={data}
        slackTeam={Meteor.settings?.public?.slack?.team} slackChannelIds={slackChannels}
        busy={busy} onInterest={setInterest} />
    </Layout>
  );
};
