import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React from "react";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { Navigate } from 'react-router-dom';
import Login from './Login';

export default () => {
  const user = useTracker(() => Meteor.user());

  const unverifiedUser = user && user.emails?.length > 0 && !user.emails[0].verified;
  const verified = user && user.emails?.length > 0 && user.emails[0].verified;

  const props = {};
  if (ServiceConfiguration.configurations.findOne({service: "google"})) {
    props.google = {method: Meteor.loginWithGoogle};
  }
  if (ServiceConfiguration.configurations.findOne({service: "facebook"})) {
    props.facebook = {method: Meteor.loginWithFacebook};
  }

  return (
    <>
      <LanguageSwitcher />
      {unverifiedUser ? (<Navigate to="/waitForEmailVerification" />) : null}
      {verified ? (<Navigate to="/" />) : null}
      <Login {...props}></Login>
    </>
  );
};