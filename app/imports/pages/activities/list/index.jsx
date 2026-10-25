import { Meteor } from "meteor/meteor";
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import { useSignedIn } from "../components/useSignedIn";
import Activities from "./Activities.jsx";

export default () => {
  const { user, userId, loggingIn } = useSignedIn();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});

  useEffect(() => {
    if (!user) return;
    Meteor.callAsync("activities.list")
      .then(setData, (error) => console.error("Error fetching activities:", error))
      .finally(() => setLoading(false));
  }, [user?._id]);

  if (!userId && !loggingIn) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <Activities loading={loading} {...data} />
    </Layout>
  );
};
