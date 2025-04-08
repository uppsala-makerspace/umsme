import { Meteor } from "meteor/meteor";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";

export const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const user = useTracker(() => Meteor.user());

  useEffect(() => {
    if (user) {
      // Om användaren är inloggad men e-posten inte är verifierad, logga ut
      if (user.emails && user.emails.length > 0 && !user.emails[0].verified) {
        alert('Please verify your email before logging in.');
        Meteor.logout(); // Logga ut om e-posten inte är verifierad
        FlowRouter.go("/login"); // Skicka tillbaka till login-sidan
      } else {
        FlowRouter.go("/loggedIn"); // Navigera till annan route om e-posten är verifierad
      }
    }
  }, [user]);

  const submit = (e) => {
    e.preventDefault();
    Meteor.loginWithPassword(email, password, (err) => {
      if (err) {
        console.error('Login failed:', err);
        alert('Invalid credentials or email not verified');
      }
    });
  };

  const toRegister = () => {
    FlowRouter.go('/register'); // Redirect to the login page
  }

  return (
    <form onSubmit={submit} className="login-form">
      <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo"/>
      <div className="form-group">
        <label htmlFor="email">Email:</label>
        <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
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