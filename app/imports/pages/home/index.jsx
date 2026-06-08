import React, { useContext, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from "/imports/components/Layout/Layout";
import Home from "./Home";
import { usePushSetup } from "/imports/hooks/pushSetupHook";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";
import { MessagesContext } from "/imports/context/MessagesContext";
import { getDefaultPage, defaultPagePath } from "/imports/lib/userPrefs";

/** This view is used if there is no member or no active membership. */
export default () => {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    // Honour the user's preferred landing page only on the very first
    // navigation after the app starts (cold start / PWA launch). React
    // Router's location.key === 'default' marks that initial entry; later
    // visits to "/" via in-app navigation get a fresh key and skip this.
    if (location.key !== "default") return;
    const pref = getDefaultPage();
    if (pref === "home") return;
    navigate(defaultPagePath(pref), { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { memberInfo, loading, refetch } = useContext(MemberInfoContext);
  const { hasNew: hasNewMessages, messages, announcements, lastSeen } = useContext(MessagesContext);
  const messageCount = messages?.length || 0;
  const announcementCount = announcements?.length || 0;
  const latestMessageDate = messages?.length
    ? new Date(Math.max(...messages.map((m) => new Date(m.senddate).getTime())))
    : null;
  const latestAnnouncementDate = announcements?.length
    ? new Date(Math.max(...announcements.map((a) => new Date(a.sentAt).getTime())))
    : null;
  const hasNewMessage = latestMessageDate && (!lastSeen || latestMessageDate > lastSeen);
  const hasNewAnnouncement = latestAnnouncementDate && (!lastSeen || latestAnnouncementDate > lastSeen);
  const hasMember = !!memberInfo?.member?.name;
  const excluded = !!memberInfo?.member?.excluded;
  usePushSetup(hasMember && !excluded);

  const handleAcceptInvite = async () => {
    try {
      await Meteor.callAsync("acceptFamilyMemberInvite");
      refetch();
    } catch (error) {
      console.error("Error accepting invite:", error);
    }
  };

  const handleDeclineInvite = async () => {
    try {
      await Meteor.callAsync("rejectFamilyMemberInvite");
      refetch();
    } catch (error) {
      console.error("Error declining invite:", error);
    }
  };

  return <Layout bottomNav={hasMember} showNotifications={hasMember}>
    {!Meteor.userId() ? <Navigate to="/login" /> : null}
    <Home
      loading={loading}
      memberName={memberInfo?.member?.name || ""}
      memberStatus={memberInfo?.status}
      verified={memberInfo?.verified ?? false}
      invite={memberInfo?.invite}
      onAcceptInvite={handleAcceptInvite}
      onDeclineInvite={handleDeclineInvite}
      liabilityDate={memberInfo?.liabilityDate}
      liabilityOutdated={memberInfo?.liabilityOutdated}
      isFamily={!!memberInfo?.member?.infamily}
      registered={!!memberInfo?.paying?.registered}
      excluded={excluded}
      expensesAllowed={!!memberInfo?.expensesAllowed}
      hasNewMessages={hasNewMessages}
      messageCount={messageCount}
      announcementCount={announcementCount}
      latestMessageDate={latestMessageDate}
      latestAnnouncementDate={latestAnnouncementDate}
      hasNewMessage={hasNewMessage}
      hasNewAnnouncement={hasNewAnnouncement}
    />
  </Layout>;
};
