import { Meteor } from "meteor/meteor";
import React, { useState, useEffect } from "react";
import { Navigate, useParams, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import { useSignedIn } from "../components/useSignedIn";
import MainContent from "/imports/components/MainContent";
import Loader from "/imports/components/Loader";
import { activityValues, activityFields } from "/imports/common/lib/activityValues";
import ActivityEditForm from "./ActivityEditForm.jsx";

/** /activities/new[?group=…] and /activities/:activityId/edit, for those who may. */
export default () => {
  const { activityId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, userId, loggingIn } = useSignedIn();
  const [loading, setLoading] = useState(true);
  const [choices, setChoices] = useState(null);
  const [stored, setStored] = useState(null);
  const [hasEvents, setHasEvents] = useState(false);
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const loaded = await Meteor.callAsync("activities.choices");
        setChoices(loaded);
        if (activityId) {
          const result = await Meteor.callAsync("activities.get", activityId);
          if (!result.canEdit) {
            navigate(`/activities/${activityId}`, { replace: true });
            return;
          }
          setStored(result.own);
          setHasEvents(result.events.length > 0);
          setValues(activityValues(result.own));
        } else {
          // Started from a group's page: that group owns it, if one may.
          const from = loaded.groups.find((g) => g.edit && g._id === params.get("group"));
          setValues(activityValues(null, { groupId: from?._id || (loaded.adminish ? "" : loaded.groups.find((g) => g.edit)?._id || "") }));
        }
      } catch (err) {
        setError(err.reason || err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?._id, activityId]);

  if (!userId && !loggingIn) {
    return <Navigate to="/login" />;
  }

  const back = activityId ? `/activities/${activityId}` : "/activities";
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (activityId) {
        await Meteor.callAsync("activities.update", activityId, activityFields(values), stored.updatedAt ?? null);
        navigate(back);
      } else {
        const id = await Meteor.callAsync("activities.create", activityFields(values));
        navigate(`/activities/${id}`);
      }
    } catch (err) {
      setError(err.reason || err.message);
      setSaving(false);
    }
  };
  const remove = async () => {
    try {
      await Meteor.callAsync("activities.remove", activityId);
      navigate("/activities");
    } catch (err) {
      setError(err.reason || err.message);
    }
  };

  return (
    <Layout>
      <MainContent>
        {loading || !values || !choices ? (
          error ? <p className="text-center text-red-600 p-8">{error}</p> : <Loader />
        ) : (
          <ActivityEditForm
            isNew={!activityId} values={values} choices={choices} saving={saving} error={error} hasEvents={hasEvents}
            onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
            onSave={save} onCancel={() => navigate(back)} onDelete={activityId ? remove : undefined}
          />
        )}
      </MainContent>
    </Layout>
  );
};
