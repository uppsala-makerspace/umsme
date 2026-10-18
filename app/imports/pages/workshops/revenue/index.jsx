import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import WorkshopRevenue from "./WorkshopRevenue";

/**
 * Web shop sales of a workshop's items, for those who run it. The server
 * decides who may see it and leaves out who paid.
 */
export default () => {
  const { workshopId } = useParams();
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  // null = all years; the current year by default.
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setData(await Meteor.callAsync("store.getWorkshopRevenue", workshopId, year));
      setError(null);
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }, [workshopId, year]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <WorkshopRevenue loading={loading} error={error} data={data} onYearChange={setYear} />
    </Layout>
  );
};
