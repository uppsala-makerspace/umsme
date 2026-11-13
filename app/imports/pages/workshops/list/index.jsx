import { Meteor } from "meteor/meteor";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Workshops from "./Workshops.jsx";
import { useSignedIn } from "../../activities/components/useSignedIn";

export default () => {
  const { user, userId, loggingIn } = useSignedIn();
  const [loading, setLoading] = useState(true);
  const [workshops, setWorkshops] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const result = await Meteor.callAsync("workshops.list");
      setWorkshops(result);
    } catch (error) {
      console.error("Error fetching workshops:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  // Not while the sign-in is being resumed: a link opened directly has no user yet.
  if (!userId && !loggingIn) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <Workshops loading={loading} workshops={workshops} />
    </Layout>
  );
};
