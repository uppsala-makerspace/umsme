import { Meteor } from "meteor/meteor";
import React, { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import { useSignedIn } from "../components/useSignedIn";
import Activities from "./Activities.jsx";

/**
 * /activities[?workshop=…&category=…]: the activities, their events being in
 * the calendar (/calendar). The workshops and categories chosen are in the
 * address, each a comma-separated list, so that going back from an activity
 * lands where one was.
 */
export default () => {
  const { user, userId, loggingIn } = useSignedIn();
  const [params, setParams] = useSearchParams();
  const listOf = (name) => (params.get(name) || "").split(",").filter(Boolean);
  // A step in the address, not in the history: back leaves the page.
  const filter = ({ workshops, categoryIds }) => setParams((current) => {
    const next = new URLSearchParams(current);
    for (const [name, list] of [["workshop", workshops], ["category", categoryIds]]) {
      if (list.length > 0) next.set(name, list.join(",")); else next.delete(name);
    }
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
      <Activities {...data} loading={loading} workshops={listOf("workshop")} categoryIds={listOf("category")} onFilter={filter} />
    </Layout>
  );
};
