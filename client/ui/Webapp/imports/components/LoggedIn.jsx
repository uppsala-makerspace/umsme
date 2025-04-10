import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { Template } from "meteor/templating";
import { Members } from "/collections/members.js";
import { updateMember } from "/lib/utils";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { Memberships } from "/collections/memberships";
import { Payments } from "/collections/payments";
import { LanguageSwitcher } from "./langueSwitcher";

export const LoggedIn = () => {
  const user = useTracker(() => Meteor.user());

  const { members, isLoading } = useTracker(() => {
    const handle = Meteor.subscribe("members");
    Meteor.subscribe("memberships");
    Meteor.subscribe("payments");

    return {
      members: Members.find().fetch(),
      isLoading: !handle.ready(),
    };
  });

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
    <>
      <form className="login-form">
        <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />
        <LanguageSwitcher />
        <div>
          <h3 className="text-h3"> Welcome!</h3>
          <p className="text-container">
            {" "}
            We couldn't find an active membership linked to your email.
          </p>
          <p className="text-container">
            {" "}
            If you wish to become a member, it's easy to do right here in the
            app. Just choose the membership you're interested in and complete
            the payment, you'll get instant access to the space.
          </p>
        </div>
        <button type="submit" className="form-button">
          Become a member
        </button>

        <p>Din e-postadress: {email}</p>
        <p>
          {isEmailInMembers
            ? FlowRouter.go("/loggedInAsMember")
            : "Din e-postadress finns inte bland medlemmarna."}
        </p>
        <h3>Här är alla medlemmar lol:</h3>
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
          <h3>Här är alla medlemskap:</h3>
          {Memberships.find()
            .fetch()
            .map((membership) => (
              <li key={membership._id}>
                {membership.type} - {membership.description} - Slutdatum:{" "}
                {membership.memberend
                  ? new Date(membership.memberend).toLocaleDateString()
                  : "Ingen slutdatum"}
              </li>
            ))}
        </ul>
        <button onClick={logout}>Logout</button>
      </form>
    </>
  );
};
