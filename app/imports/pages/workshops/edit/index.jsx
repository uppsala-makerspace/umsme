import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import MainContent from "/imports/components/MainContent";
import Loader from "/imports/components/Loader";
import EntityEditForm from "/imports/components/EntityEditForm";

/** Limited workshop editing for the workshop group's responsible. */
export default () => {
  const { workshopId } = useParams();
  const navigate = useNavigate();
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await Meteor.callAsync("workshops.getDetails", workshopId);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }, [workshopId]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  const detailPath = `/workshops/${workshopId}`;

  const handleSave = async (patch) => {
    setSaving(true);
    try {
      await Meteor.callAsync("workshops.updateByResponsible", workshopId, patch);
      navigate(detailPath);
    } catch (err) {
      alert(err.reason || err.message);
      setSaving(false);
    }
  };

  const handleImageSelect = async ({ base64, mimeType }) => {
    try {
      await Meteor.callAsync("workshops.uploadImageByResponsible", workshopId, base64, mimeType);
      await fetchData();
    } catch (err) {
      alert(err.reason || err.message);
    }
  };

  const handleImageRemove = async () => {
    try {
      await Meteor.callAsync("workshops.removeImageByResponsible", workshopId);
      await fetchData();
    } catch (err) {
      alert(err.reason || err.message);
    }
  };

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  const workshop = data?.workshop;
  // Only the workshop group's responsible may edit; others go back to the
  // workshop page (the server enforces this too).
  if (!loading && (!workshop || !data?.canEdit)) {
    return <Navigate to={detailPath} replace />;
  }

  return (
    <Layout>
      <MainContent>
        {loading || !workshop ? (
          <Loader />
        ) : error ? (
          <p className="text-center text-red-600 p-8">{error}</p>
        ) : (
          <EntityEditForm
            name={workshop.name?.sv}
            imageUrl={workshop.imageUrl}
            values={{
              descriptionSv: workshop.description?.sv || "",
              descriptionEn: workshop.description?.en || "",
              slackChannel: workshop.slackChannel || "",
              guidesUrl: workshop.guidesUrl || "",
            }}
            showGuidesUrl
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
