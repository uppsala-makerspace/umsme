import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { Navigate } from 'react-router-dom';
import React, { useState, useEffect } from "react";
import Layout from "/imports/components/Layout/Layout";
import Account from "./Account";

export default () => {
  const user = useTracker(() => Meteor.user());
  const [memberInfo, setMemberInfo] = useState(null);

  useEffect(() => {
    if (!user?._id) return;
    const fetchData = async () => {
      if (user) {
        try {
          const info = await Meteor.callAsync("findInfoForUser");
          setMemberInfo(info);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };
    fetchData();
  }, [user?._id]);

  const invite = async (email) => {
    try {
      const result = await Meteor.callAsync("inviteFamilyMember", {email});
      const info = await Meteor.callAsync("findInfoForUser");
      setMemberInfo(info);
    } catch (err) {
      console.error("Failed to invite member to family: ", err);
    }
  };

  const cancelInvite = async (email) => {
    try {
      const result = await Meteor.callAsync("cancelFamilyMemberInvite", {email});
      const info = await Meteor.callAsync("findInfoForUser");
      setMemberInfo(info);
    } catch (err) {
      console.error("Failed to cancel invite: ", err);
    }
  };

  const removeFamilyMember = async (email) => {
    try {
      await Meteor.callAsync("removeFamilyMember", {email});
      const info = await Meteor.callAsync("findInfoForUser");
      setMemberInfo(info);
    } catch (err) {
      console.error("Failed to remove family member: ", err);
    }
  };

  const leaveFamily = async () => {
    try {
      await Meteor.callAsync("leaveFamilyMembership");
      const info = await Meteor.callAsync("findInfoForUser");
      setMemberInfo(info);
    } catch (err) {
      console.error("Failed to leave family: ", err);
    }
  };

  return (
    <Layout>
      {!Meteor.userId() ? <Navigate to="/login" /> : null}
      {memberInfo && (
        <Account {...memberInfo} addFamilyInvite={invite} cancelFamilyInvite={cancelInvite} removeFamilyMember={removeFamilyMember} onLeaveFamily={leaveFamily}></Account>
      )}
    </Layout>
  );
};
