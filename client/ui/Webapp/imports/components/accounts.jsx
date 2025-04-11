import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "./langueSwitcher";
import { HamburgerMenu } from "./HamburgerMenu";
import { Members } from "/collections/members.js";
import { Memberships } from "/collections/memberships";

export const accounts = () => {
  const user = useTracker(() => Meteor.user());

  const { memberships, isMembershipsLoading } = useTracker(() => {
    const handle = Meteor.subscribe("memberships");
    return {
      memberships: Memberships.find().fetch(),
      isMembershipsLoading: !handle.ready(),
    };
  });

  const { members, isLoadingMembers } = useTracker(() => {
    const handle = Meteor.subscribe("members");
    return {
      members: Members.find().fetch(),
      isLoadingMembers: !handle.ready(),
    };
  });

  if (isMembershipsLoading) {
    return <div>Loading memberships...</div>;
  }

  if (isLoadingMembers) {
    return <div>Loading members, take a moment to relax...</div>;
  }
  const email = user?.emails?.[0]?.address || "Ingen e-postadress hittades";

  const currentMember =
    members.find((member) => member.email === email) || null;

  const currentMembership = currentMember
    ? memberships.find((membership) => membership.mid === currentMember._id) ||
      null
    : null;

  const isLabMember = currentMember.lab >= new Date();
  const isFamilyMember = currentMember.family;

  let membershipMessage;
  if (isLabMember && isFamilyMember) {
    membershipMessage = "Labbmedlem familj";
  } else if (isLabMember) {
    membershipMessage = "Labbmedlem";
  } else {
    membershipMessage = "Medlem";
  }

  console.log("currentMember", currentMember);
  console.log("currentMembership", currentMembership);
  console.log("lab:", currentMember.lab);
  console.log("new Date():", new Date());
  console.log("isLabMember?", isLabMember);
  console.log("isFamilyMember?", isFamilyMember);
  console.log("currentMembership.start:", currentMembership.start);

  const logout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      } else {
        FlowRouter.go("/login");
      }
    });
  };

  return (
    <>
      <div>
        <div>
          <LanguageSwitcher />
          <HamburgerMenu />
        </div>
        <div className="login-form">{currentMember.name}</div>
        <div className="login-form">Mitt konto</div>
        <div className="login-form">Ditt medlemsskap: {membershipMessage}</div>
        <div className="login-form">
          Medlem sedan: {new Date(currentMembership.start).toLocaleDateString()}
        </div>
        <div className="login-form">
          Slutdatum:{new Date(currentMembership.memberend).toLocaleDateString()}
        </div>
      </div>
      <div className="login-form">{isFamilyMember ? "Family:" : ""}</div>
      <button onClick={logout}>Logga ut</button>
    </>
  );
};
