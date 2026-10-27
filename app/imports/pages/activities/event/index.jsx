import { Meteor } from "meteor/meteor";
import React, { useState, useEffect, useContext } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import { useSignedIn } from "../components/useSignedIn";
import { AppDataContext } from "/imports/context/AppDataContext";
import EventDetail from "./EventDetail.jsx";

export default () => {
  const { t } = useTranslation();
  const { eventId } = useParams();
  const { user, userId, loggingIn } = useSignedIn();
  const { slackChannels } = useContext(AppDataContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  // What became of the certificate the event gives, when someone was marked as come.
  const [attendanceNotice, setAttendanceNotice] = useState(null);

  const load = () => Meteor.callAsync("events.get", eventId)
    .then((result) => { setData(result); setError(null); }, (err) => setError(err.reason || err.message));

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [user?._id, eventId]);

  // Do something about one's registration or the attendance, then show the event anew.
  const act = async (method, ...args) => {
    setBusy(true);
    setActionError(null);
    setAttendanceNotice(null);
    let result;
    try {
      result = await Meteor.callAsync(method, eventId, ...args);
    } catch (err) {
      setActionError(t(`registrationError_${err.error}`, { defaultValue: err.reason || err.message }));
    }
    await load();
    setBusy(false);
    return result;
  };

  const CERTIFICATE_NOTICES = {
    granted: "participantsCertificateGranted",
    "missing-prerequisites": "participantsCertificateMissingPrerequisites",
    "not-certifier": "participantsCertificateNotCertifier",
  };
  const markAttended = async (memberId, attended) => {
    const result = await act("events.markAttended", memberId, attended);
    const key = CERTIFICATE_NOTICES[result?.certificate];
    const name = data?.participants?.find((p) => p.memberId === memberId)?.name || "";
    if (key) setAttendanceNotice(t(key, { name }));
  };

  if (!userId && !loggingIn) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <EventDetail loading={loading} error={error} data={data}
        slackTeam={Meteor.settings?.public?.slack?.team} slackChannelIds={slackChannels}
        busy={busy} actionError={actionError}
        onRegister={(info) => act("events.register", info)}
        onWithdraw={() => act("events.withdraw")}
        onTakeSeat={() => act("events.takeSeat")}
        onCheckIn={() => act("events.checkIn")}
        attendanceNotice={attendanceNotice}
        onAttended={markAttended}
        onCloseAttendance={() => act("events.closeAttendance")} />
    </Layout>
  );
};
