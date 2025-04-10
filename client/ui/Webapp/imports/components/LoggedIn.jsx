import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { Template } from "meteor/templating";
import { Members } from "/collections/members.js";
import { updateMember } from "/lib/utils";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { Memberships } from "/collections/memberships";
import { Payments } from "/collections/payments";

export const LoggedIn = () => {
  const user = useTracker(() => Meteor.user());

  const { members, isLoading } = useTracker(() => {
    const handle = Meteor.subscribe("members");
    Meteor.subscribe("payments");

    return {
      members: Members.find().fetch(),
      isLoading: !handle.ready(),
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

  const email = user?.emails?.[0]?.address || "Ingen e-postadress hittades";

  const isEmailInMembers = members.some((member) => member.email === email);

  console.log("all Memberships:", Memberships.find().fetch());
  console.log("all members:", members);

  const logout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      } else {
        FlowRouter.go("/login");
      }
    });
  };

  if (isLoading) {
    return <div>Loading members, take a moment to relax...</div>;
  }

  return (
    <div>
      <h1>Welcome Back!</h1>
      <p>You are successfully logged in.</p>
      <p>Din e-postadress: {email}</p>
      <p>
        {isEmailInMembers
          ? FlowRouter.go("/loggedInAsMember")
          : "Din e-postadress finns inte bland medlemmarna."}
      </p>
      <h2>Här är alla medlemmar lol:</h2>
      <ul>
        {members.map((member) => {
          const memberMemberships = Memberships.find({
            mid: member._id,
          }).fetch();
          return (
            <React.Fragment key={member._id}>
              <li>
                {member.name} - {member.email} -
                {memberMemberships.map((membership) => (
                  <span key={membership._id}>
                    {membership.type} - {membership.description} - Slutdatum:{" "}
                    {membership.memberend
                      ? new Date(membership.memberend).toLocaleDateString()
                      : "Ingen slutdatum"}
                  </span>
                ))}
              </li>
            </React.Fragment>
          );
        })}
        <h2>Här är alla medlemskap:</h2>
        {Memberships.find()
          .fetch()
          .map((membership) => (
            <li key={membership.mid}>
              {" "}
              {membership.type} - {membership.description} - Slutdatum:{" "}
              {membership.memberend
                ? new Date(membership.memberend).toLocaleDateString()
                : "Ingen slutdatum"}
            </li>
          ))}
      </ul>
      <button onClick={logout}>Logout</button>
    </div>
  );
};
