import { Meteor } from "meteor/meteor";
import { Navigate } from 'react-router-dom';
import React, { useContext } from "react";
import Layout from "/imports/components/Layout/Layout";
import Account from "./Account";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";

export default () => {
  const { memberInfo, refetch } = useContext(MemberInfoContext);

  const invite = async (email) => {
    try {
      await Meteor.callAsync("inviteFamilyMember", {email});
      await refetch();
    } catch (err) {
      console.error("Failed to invite member to family: ", err);
    }
  };

  const cancelInvite = async (email) => {
    try {
      await Meteor.callAsync("cancelFamilyMemberInvite", {email});
      await refetch();
    } catch (err) {
      console.error("Failed to cancel invite: ", err);
    }
  };

  const removeFamilyMember = async (email) => {
    try {
      await Meteor.callAsync("removeFamilyMember", {email});
      await refetch();
    } catch (err) {
      console.error("Failed to remove family member: ", err);
    }
  };

  const leaveFamily = async () => {
    try {
      await Meteor.callAsync("leaveFamilyMembership");
      await refetch();
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
