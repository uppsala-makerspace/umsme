import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import RulesView from "/imports/components/RulesView";
import { localized } from "/imports/common/lib/groupRules";

/** Read-only rules page for a group. */
export default () => {
  const { groupId } = useParams();
  const { i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await Meteor.callAsync("groups.getDetails", groupId);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  const group = data?.group;
  return (
    <Layout>
      <RulesView
        loading={loading}
        error={error}
        name={group ? localized(group.name, lang) : ""}
        rules={group ? localized(group.rules, lang) : ""}
      />
    </Layout>
  );
};
