import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { Template } from "meteor/templating";
import { Members } from "/collections/members.js";
import { updateMember } from "/lib/utils";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { Memberships } from "/collections/memberships";
import { Payments } from "/collections/payments";
import { LanguageSwitcher } from "./langueSwitcher";
import { useTranslation } from "react-i18next";

export const LoggedIn = () => {
  const { t, i18n } = useTranslation();
  const user = useTracker(() => Meteor.user());

  const { members, isLoadingMembers } = useTracker(() => {
    const handle = Meteor.subscribe("members");
    Meteor.subscribe("payments");

    return {
      members: Members.find().fetch(),
      isLoadingMembers: !handle.ready(),
    };
  });

  const { memberships, isMembershipsLoading } = useTracker(() => {
    const handle = Meteor.subscribe("memberships");
    return {
      memberships: Memberships.find().fetch(),
      isMembershipsLoading: !handle.ready(),
    };
  });

  if (isMembershipsLoading) {
    return <div>Loading memberships...</div>;
  }

  if (isLoadingMembers) {
    return <div>Loading members, take a moment to relax...</div>;
  }

  const email = user?.emails?.[0]?.address || "Ingen e-postadress hittades";

  const isEmailInMembers = members.some((member) => member.email === email);

  const currentMember =
    members.find((member) => member.email === email) || null;

  const currentMembership = currentMember
    ? memberships.find((membership) => membership.mid === currentMember._id) ||
      null
    : null;

  if (currentMember.infamily) {
    const familyHead = members.find((m) => m._id === currentMember.infamily);
    if (familyHead.lab >= new Date()) {
      FlowRouter.go("LoggedInAsMember");
    }
  }

  console.log("all Memberships:", Memberships.find().fetch());
  console.log("all members:", members);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("handleSubmit");
    FlowRouter.go("HandleMembership");
  };

  const logout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      } else {
        FlowRouter.go("/login");
      }
    });
  };

  let message;
  if (!isEmailInMembers) {
    message = "Du är inte medlem.";
  } else if (
    !memberships.some((membership) => membership.mid === currentMember._id)
  ) {
    message = "Du är medlem men har inget medlemsskap.";
  } else if (
    !currentMembership.memberend ||
    currentMembership.memberend < new Date()
  ) {
    message =
      "Ditt medlemsskap har löpt ut, du lär ju skaffa ett nyt :))))))).";
  } else {
    FlowRouter.go("LoggedInAsMember");
  }

  return (
    <>
      <form className="login-form">
        <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />
        <LanguageSwitcher />
        <div>
          <h3 className="text-h3"> {t("welcome")}</h3>
          <p className="text-container">{t("noMembertext1")}</p>
          <p className="text-container">{t("noMembertext2")}</p>
        </div>
        <button type="submit" className="form-button" onClick={handleSubmit}>
          {t("becomeMember")}
        </button>
      </form>
      <p>Din e-postadress: {email}</p>
      <button onClick={logout}>Logout</button>
    </>
  );
};
