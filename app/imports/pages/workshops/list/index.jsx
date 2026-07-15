import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Workshops from "./Workshops.jsx";

export default () => {
  const user = useTracker(() => Meteor.user());
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

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <Workshops loading={loading} workshops={workshops} />
    </Layout>
  );
};
