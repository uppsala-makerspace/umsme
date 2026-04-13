import React, { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Meteor } from "meteor/meteor";
import Layout from "/imports/components/Layout/Layout";
import MessageDetail from "./MessageDetail";

export default () => {
  const { kind, id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await Meteor.callAsync("getMessageDetail", id, kind);
        setItem(result);
      } catch (err) {
        console.error("Error fetching message detail:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, kind]);

  if (!Meteor.userId()) return <Navigate to="/login" />;

  return (
    <Layout>
      <MessageDetail loading={loading} kind={kind} item={item} />
    </Layout>
  );
};
