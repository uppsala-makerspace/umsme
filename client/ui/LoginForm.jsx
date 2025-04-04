import { Meteor } from "meteor/meteor";
import React, { useState } from "react";

export const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e) => {
    e.preventDefault();

    Meteor.loginWithPassword(username, password);
  };

  return (
<form onSubmit={submit} className="login-form">
  <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />
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
  <button type="submit" className="form-button">Login</button>
</form>




);
};