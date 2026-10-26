import { Meteor } from "meteor/meteor";
import React, { useState, useEffect } from "react";
import { Navigate, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import { useSignedIn } from "../components/useSignedIn";
import MainContent from "/imports/components/MainContent";
import Loader from "/imports/components/Loader";
import { eventValues, eventFields, parseClock, usualTimes } from "/imports/common/lib/activityValues";
import EventEditForm from "./EventEditForm.jsx";
import { useImage } from "../components/useImage";

/** /events/new[?activity=…] and /events/:eventId/edit, for the group's members. */
export default () => {
  const { t } = useTranslation();
  const { eventId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, userId, loggingIn } = useSignedIn();
  const [loading, setLoading] = useState(true);
  const [choices, setChoices] = useState(null);
  const [stored, setStored] = useState(null);
  const [values, setValues] = useState(null);
  const [activity, setActivity] = useState(null);
  const [hostChoices, setHostChoices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  // The event's image: its own, or else its activity's, shown greyed.
  const image = useImage({
    prefix: "events", docId: eventId,
    load: async () => {
      const result = await Meteor.callAsync("events.get", eventId);
      return { url: result.event.imageUrl, own: !!result.own?.imageFileId };
    },
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const loaded = await Meteor.callAsync("activities.choices");
        setChoices(loaded);
        if (eventId) {
          const result = await Meteor.callAsync("events.get", eventId);
          if (!result.canEdit) {
            navigate(`/events/${eventId}`, { replace: true });
            return;
          }
          setStored(result.own);
          image.setShown({ url: result.event.imageUrl, own: !!result.own?.imageFileId });
          const v = eventValues(result.own);
          // The app has no end day: one the same as the start is no end day.
          setValues({ ...v, endDay: v.endDay === v.startDay ? "" : v.endDay });
        } else {
          // One who may not make a free-standing event starts from an activity.
          const mayBeFree = loaded.adminish || loaded.groups.some((g) => g.edit);
          const activityId = params.get("activity") || (mayBeFree ? "" : loaded.activities[0]?._id || "");
          setValues({
            ...eventValues(null, { activityId }),
            groupId: (activityId || loaded.adminish) ? "" : loaded.groups.find((g) => g.edit)?._id || "",
          });
        }
      } catch (err) {
        setError(err.reason || err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?._id, eventId]);

  // The activity the form is of now, as stored, for what the event inherits,
  // and who may host: the active members of the event's group.
  const activityId = values?.activityId || "";
  const groupId = activityId ? choices?.activities.find((a) => a._id === activityId)?.groupId || "" : values?.groupId || "";
  useEffect(() => {
    if (!values) return;
    (async () => {
      try {
        setActivity(activityId ? (await Meteor.callAsync("activities.get", activityId)).own : null);
        setHostChoices(await Meteor.callAsync("activities.hostChoices", groupId || null));
      } catch (err) {
        setHostChoices([]);
      }
    })();
  }, [activityId, groupId, !!values]);

  // A new event takes its activity's usual times, where it has none yet.
  useEffect(() => {
    if (eventId || !activity) return;
    setValues((v) => (v ? { ...v, ...usualTimes(v, activity) } : v));
  }, [activity?._id]);

  if (!userId && !loggingIn) {
    return <Navigate to="/login" />;
  }

  const back = eventId ? `/events/${eventId}` : activityId ? `/activities/${activityId}` : "/activities";
  const save = async () => {
    if (!values.startDay || !parseClock(values.startTime)) {
      setError(t("eventNeedsStart"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (eventId) {
        await Meteor.callAsync("events.update", eventId, eventFields(values), stored.updatedAt ?? null);
        navigate(back);
      } else {
        const id = await Meteor.callAsync("events.create", eventFields(values));
        // The event exists even if its image fails: on to it, where the image can be tried again.
        await image.uploadPending(id).catch((err) => console.error("Image upload failed:", err));
        navigate(`/events/${id}`);
      }
    } catch (err) {
      setError(err.reason || err.message);
      setSaving(false);
    }
  };
  const remove = async () => {
    try {
      await Meteor.callAsync("events.remove", eventId);
      navigate(stored.activityId ? `/activities/${stored.activityId}` : "/activities");
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
          <EventEditForm
            isNew={!eventId} values={values} choices={choices} activity={activity} hostChoices={hostChoices}
            saving={saving} error={error}
            onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
            onSave={save} onCancel={() => navigate(back)} onDelete={eventId ? remove : undefined}
            image={(() => {
              // A new event of an activity shows the activity's image until it has its own.
              const activityImage = activity?.imageFileId
                ? `/api/activities/${activity._id}/image?v=${encodeURIComponent(activity.imageFileId)}`
                : null;
              const url = image.card.imageUrl || (values.activityId ? activityImage : null);
              return { ...image.card, imageUrl: url, inherited: !!url && !image.card.own };
            })()}
          />
        )}
      </MainContent>
    </Layout>
  );
};
