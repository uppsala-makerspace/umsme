import React, { useContext } from "react";
import { Navigate } from 'react-router-dom';
import Layout from "/imports/components/Layout/Layout";
import Home from "./Home";
import { usePushSetup } from "/imports/hooks/pushSetupHook";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";
import { MessagesContext } from "/imports/context/MessagesContext";

/** This view is used if there is no member or no active membership. */
export default () => {
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
  usePushSetup(hasMember);

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
