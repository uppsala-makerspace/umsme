import { Meteor } from "meteor/meteor";
import React, { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import { useSignedIn } from "../components/useSignedIn";
import Activities from "./Activities.jsx";

/**
 * /activities[?workshop=…]: the activities, their events being in the
 * calendar (/calendar). The workshop chosen is in the address, so that going
 * back from an activity lands where one was.
 */
export default () => {
  const { user, userId, loggingIn } = useSignedIn();
  const [params, setParams] = useSearchParams();
  const workshop = params.get("workshop") || "";
  // A step in the address, not in the history: back leaves the page.
  const chooseWorkshop = (value) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (value) next.set("workshop", value); else next.delete("workshop");
    return next;
  }, { replace: true });
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
      <Activities {...data} loading={loading} workshop={workshop} onWorkshop={chooseWorkshop} />
    </Layout>
  );
};
