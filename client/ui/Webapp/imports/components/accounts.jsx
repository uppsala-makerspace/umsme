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

  let currentMembership = memberships.find((m) => m.mid === currentMember._id);

  if (!currentMembership && currentMember.infamily) {
    const familyHead = members.find((m) => m._id === currentMember.infamily);
    currentMembership = memberships.find((m) => m.mid === familyHead?._id);
  }

  const isLabMember = currentMember.lab >= new Date();

  let isFamilyMember = true;
  if (
    !currentMember.infamily &&
    !members.some((m) => m.infamily === currentMember._id)
  ) {
    isFamilyMember = false;
  }

  let family = [];
  if (isFamilyMember) {
    if (currentMember.infamily) {
      // Find familyHead
      family = members.filter(
        (member) =>
          member._id === currentMember.infamily ||
          member.infamily === currentMember.infamily
      );
    } else {
      // Find non-paying family members
      family = members.filter(
        (member) => member.infamily === currentMember._id
      );
      family.push(currentMember);
    }
  }

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
      <div className="login-form">
        {isFamilyMember ? (
          <>
            Familjemedlemmar (upp till 4):
            <br /> ------------------------
            <br />
            {family.map((member) => member.email).join(", ")} <br />
            ----------------
          </>
        ) : (
          ""
        )}
      </div>
      <button onClick={logout}>Logga ut</button>
    </>
  );
};
