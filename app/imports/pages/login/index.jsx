import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState } from "react";
import { Navigate } from 'react-router-dom';
import Layout from "/imports/components/Layout/Layout";
import Login from './Login';

export default () => {
  const user = useTracker(() => Meteor.user());

  const oauth = Meteor.settings?.public?.oauth;
  const google = oauth?.google ? { method: Meteor.loginWithGoogle } : null;
  const facebook = oauth?.facebook ? { method: Meteor.loginWithFacebook } : null;

  const unverifiedUser = user && user.emails?.length > 0 && !user.emails[0].verified;
  const verified = user && ((user.emails?.length > 0 && user.emails[0].verified) || !user.emails);

  // The reason a login failed, as an i18n key, shown under the fields.
  const [errorKey, setErrorKey] = useState(null);

  const handleLogin = (email, password) => {
    setErrorKey(null);
    Meteor.loginWithPassword(email, password, (err) => {
      if (err) {
        console.error("Login failed:", err);
        // 403 covers both an unknown email and a wrong password; saying which
        // would tell a stranger whether an address has an account.
        setErrorKey(err.error === 403 ? "loginWrongCredentials" : "loginFailed");
      }
    });
  };

  return (
    <Layout bottomNav={false} showNotifications={false}>
      {unverifiedUser ? (<Navigate to="/waitForEmailVerification" />) : null}
      {verified ? (<Navigate to="/" />) : null}
      <Login
        onSubmit={handleLogin}
        google={google}
        facebook={facebook}
        errorKey={errorKey}
        onError={setErrorKey}
        onChange={() => setErrorKey(null)}
      />
    </Layout>
  );
};
