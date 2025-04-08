import { Meteor } from "meteor/meteor";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import "../Appmain.css";

export const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const user = useTracker(() => Meteor.user());

  useEffect(() => {
    if (user) {
      FlowRouter.go("/loggedIn"); // Navigera till en annan route om användaren är inloggad
    }
  }, [user]);

  const submit = (e) => {
    e.preventDefault();
    Meteor.loginWithPassword(username, password);
  };

  const toRegister = () => {
    FlowRouter.go('/register'); // Redirect to the login page
  }

  return (
    <form onSubmit={submit} className="login-form">
      <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo"/>
      <div className="form-group">
        <label htmlFor="username">Username</label>

        <input
          type="text"
          placeholder="Username"
          name="username"
          required
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>

        <input
          type="password"
          placeholder="Password"
          name="password"
          required
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="form-group">
        <button type="submit" className="form-button">Log in</button>
        <button onClick={() => toRegister()}>Back to register</button>
      </div>

      <div className="form-group">
      <button onClick={() => toRegister()}>
        <img src="/images/GoogleLogo.png" alt="icon" className="button-icon" />
      Continue with Google</button>
      </div>

      <div className="form-group">
      
      <button onClick={() => toRegister()}>
      <img src="/images/FacebookLogo.png" alt="icon" className="button-icon" />
      Continue with Facebook
      </button>
      </div>

    </form>
  );
};