import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import MainContent from "/imports/components/MainContent";
import Loader from "/imports/components/Loader";
import EntityEditForm from "/imports/components/EntityEditForm";

/** Limited group editing for the group responsible (gruppansvarig). */
export default () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

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

  const detailPath = `/groups/${groupId}`;

  const handleSave = async (patch) => {
    setSaving(true);
    try {
      await Meteor.callAsync("groups.updateByResponsible", groupId, patch);
      navigate(detailPath);
    } catch (err) {
      alert(err.reason || err.message);
      setSaving(false);
    }
  };

  const handleImageSelect = async ({ base64, mimeType }) => {
    try {
      await Meteor.callAsync("groups.uploadImageByResponsible", groupId, base64, mimeType);
      await fetchData();
    } catch (err) {
      alert(err.reason || err.message);
    }
  };

  const handleImageRemove = async () => {
    try {
      await Meteor.callAsync("groups.removeImageByResponsible", groupId);
      await fetchData();
    } catch (err) {
      alert(err.reason || err.message);
    }
  };

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  const group = data?.group;
  // Only the responsible may edit; anyone else is sent back to the group page
  // (the server enforces this too).
  if (!loading && (!group || !group.myIsResponsible)) {
    return <Navigate to={detailPath} replace />;
  }

  return (
    <Layout>
      <MainContent>
        {loading || !group ? (
          <Loader />
        ) : error ? (
          <p className="text-center text-red-600 p-8">{error}</p>
        ) : (
          <EntityEditForm
            name={group.name?.sv}
            imageUrl={group.imageUrl}
            values={{
              descriptionSv: group.description?.sv || "",
              descriptionEn: group.description?.en || "",
              slackChannel: group.slackChannel || "",
            }}
            saving={saving}
            onSave={handleSave}
            onImageSelect={handleImageSelect}
            onImageRemove={handleImageRemove}
          />
        )}
      </MainContent>
    </Layout>
  );
};
