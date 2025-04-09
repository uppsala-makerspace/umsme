import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Template } from 'meteor/templating';
import { Members } from '/collections/members.js';
import { Payments } from '/collections/payments';
import { updateMember } from '/lib/utils';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useState, useEffect } from "react";



export const LoggedIn = () => {
  const user = useTracker(() => Meteor.user());

  const { members, isLoading } = useTracker(() => {
    const handle = Meteor.subscribe('members');
    return {
      members: Members.find().fetch(),
      isLoading: !handle.ready(),
    };
  });

  const email = user?.emails?.[0]?.address || "Ingen e-postadress hittades";

  const isMember = useTracker(() => {
    
    if (!email || email === "Ingen e-postadress hittades") return false;
    const member = Members.findOne({ Email: email });
    return !!member;
  }, [email]);

  const isEmailInMembers = members.some((member) => member.email === email);


  const logout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      } else {
        FlowRouter.go('/login');
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
      <p>{isEmailInMembers ? FlowRouter.go('/loggedInAsMember') : "Din e-postadress finns inte bland medlemmarna."}</p>
      <h2>Här är alla medlemmar lol:</h2>
      <ul>
        {members.map((member) => (
          <li key={member._id}>{member.name} - {member.email}</li>
        ))}
      </ul>
      <button onClick={logout}>
        Logout
      </button>
    </div>
  );
};
