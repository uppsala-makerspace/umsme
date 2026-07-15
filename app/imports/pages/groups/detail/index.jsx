import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback, useContext } from "react";
import { Navigate, useParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import { AppDataContext } from "/imports/context/AppDataContext";
import GroupDetail from "./GroupDetail.jsx";

export default () => {
  const { groupId } = useParams();
  const user = useTracker(() => Meteor.user());
  const { slackChannels } = useContext(AppDataContext);
  const slackTeam = Meteor.settings?.public?.slack?.team;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await Meteor.callAsync("groups.getDetails", groupId);
      setData(result);
      setError(null);
    } catch (err) {
      console.error("Error fetching group details:", err);
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  const runAction = async (method, ...args) => {
    try {
      setActionError(null);
      await Meteor.callAsync(method, ...args);
      await fetchData();
    } catch (err) {
      console.error(`Error in ${method}:`, err);
      setActionError(err.reason || err.message);
    }
  };

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <GroupDetail
        loading={loading}
        error={error}
        actionError={actionError}
        data={data}
        slackTeam={slackTeam}
        slackChannelIds={slackChannels}
        onJoin={() => runAction("groups.join", groupId)}
        onLeave={() => runAction("groups.leave", groupId)}
        onApprove={(memberId) => runAction("groups.approve", groupId, memberId)}
        onReject={(memberId) => runAction("groups.reject", groupId, memberId)}
      />
    </Layout>
  );
};
