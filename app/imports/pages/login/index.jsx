import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React from "react";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { Navigate } from 'react-router-dom';
import Login from './Login';

export default () => {
  const user = useTracker(() => Meteor.user());

  const oauth = Meteor.settings?.public?.oauth;
  const google = oauth?.google ? { method: Meteor.loginWithGoogle } : null;
  const facebook = oauth?.facebook ? { method: Meteor.loginWithFacebook } : null;

  const unverifiedUser = user && user.emails?.length > 0 && !user.emails[0].verified;
  const verified = user && ((user.emails?.length > 0 && user.emails[0].verified) || !user.emails);

  const handleLogin = (email, password) => {
    Meteor.loginWithPassword(email, password, (err) => {
      if (err) {
        console.error("Login failed:", err);
        alert("Login failed. Please check that your email and password are correct.");
      }
    });
  };

  return (
    <>
      <LanguageSwitcher />
      {unverifiedUser ? (<Navigate to="/waitForEmailVerification" />) : null}
      {verified ? (<Navigate to="/" />) : null}
      <Login onSubmit={handleLogin} google={google} facebook={facebook} />
    </>
  );
};
