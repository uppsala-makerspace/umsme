import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Template } from 'meteor/templating';
import { Members } from '/collections/members.js';
import { Payments } from '/collections/payments';
import { updateMember } from '/lib/utils';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useState, useEffect } from "react";


Template.AdminConsole.onCreated(function() {
  Meteor.subscribe('members');
});

export const LoggedIn = () => {

  const user = useTracker(() => Meteor.user());
  const loggingIn = useTracker(() => Meteor.loggingIn());
  const [isMember, setIsMember] = useState(false);



  const logout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      } else {
        FlowRouter.go('/login'); // Redirect to the login page
      }
    });
  };
  
  const name = user?.username || "Laddar användarnamn...";

  //kolla genom att matcha mejladresser om user är med i members
  const email = user?.emails?.[0]?.address || "Ingen e-postadress hittades";
  useEffect(() => {
    if (email !== "Ingen e-postadress hittades") {
      const member = Members.findOne({ Email: email });
      console.log("Medlem:", member);
      if (member) {
        console.log("Personen är medlem:", member);
        setIsMember(true);
      } else {
        console.log("Personen är inte medlem.");
        setIsMember(false);
      }
    }
  }, [email]); // Kör endast när email hämtas ("ändras")


  return (
    <div>
      <h1>Welcome Back!</h1>
      <p>You are successfully logged in.</p>
      <p>Din e-postadress: {email}</p>

      <div className='user' onClick={logout}>
        {name}
      </div>
      {isMember ? (
        <p>Du är medlem. Välkommen till medlemssektionen!</p>
      ) : (
        <p>Du är inte medlem. Kontakta oss för att bli medlem.</p>
      )}
    </div>
    
  );
};

