import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { Navigate } from 'react-router-dom';
import TopBar from "/imports/components/TopBar";
import BottomNavigation from "/imports/components/BottomNavigation";
import Home from "./Home";

/** This view is used if there is no member or no active membership. */
export default () => {
  const user = useTracker(() => Meteor.user());
  const [memberInfo, setMemberInfo] = useState(null);

  const fetchMemberInfo = async () => {
    try {
      const info = await Meteor.callAsync("findInfoForUser");
      setMemberInfo(info);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Load member information
  useEffect(() => {
    if (!user) return;
    fetchMemberInfo();
  }, [user?._id]);

  const handleAcceptInvite = async () => {
    try {
      await Meteor.callAsync("acceptFamilyMemberInvite");
      fetchMemberInfo();
    } catch (error) {
      console.error("Error accepting invite:", error);
    }
  };

  const handleDeclineInvite = async () => {
    try {
      await Meteor.callAsync("rejectFamilyMemberInvite");
      fetchMemberInfo();
    } catch (error) {
      console.error("Error declining invite:", error);
    }
  };

  return <>
    {!Meteor.userId() ? <Navigate to="/login" /> : null}
    <TopBar />
    <Home
      memberName={memberInfo?.member?.name || ""}
      memberStatus={memberInfo?.status}
      verified={memberInfo?.verified ?? false}
      invite={memberInfo?.invite}
      onAcceptInvite={handleAcceptInvite}
      onDeclineInvite={handleDeclineInvite}
      liabilityDate={memberInfo?.liabilityDate}
      liabilityOutdated={memberInfo?.liabilityOutdated}
    />
    <BottomNavigation />
  </>;
};
