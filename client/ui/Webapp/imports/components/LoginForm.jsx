import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';

export const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const user = useTracker(() => Meteor.user());

  useEffect(() => {
    if (user) {
      navigate("/loggedIn"); // Navigera till en annan route om användaren är inloggad
    }
  }, [user, navigate]);

  const submit = (e) => {
    e.preventDefault();
    Meteor.loginWithPassword(username, password);
  };

  const toRegister = () => {
    navigate('/register'); // Redirect to the login page
}

  return (
    <form onSubmit={submit} className="login-form">
    <div>
        <label htmlFor="username">Username</label>

        <input
        type="text"
        placeholder="Username"
        name="username"
        required
        onChange={(e) => setUsername(e.target.value)}
        />
    </div>

    <div>
        <label htmlFor="password">Password</label>

        <input
        type="password"
        placeholder="Password"
        name="password"
        required
        onChange={(e) => setPassword(e.target.value)}
        />
    </div>

    <div>
        <button type="submit">Log In</button>
        <button onClick={() => toRegister()}>Back to register</button>
    </div>
    </form>
);
};