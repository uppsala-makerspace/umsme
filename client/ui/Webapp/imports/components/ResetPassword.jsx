// ResetPassword.jsx
import React, { useState } from "react";
import { Accounts } from "meteor/accounts-base";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";

export const ResetPassword = ({ token }) => {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = (e) => {
    e.preventDefault();

    Accounts.resetPassword(token, password, (err) => {
      if (err) {
        setMessage("Misslyckades: " + err);
      } else {
        setMessage("Lösenordet har återställts!");
        FlowRouter.go("/loggedIn");
      }
    });
  };

  return (
    <div>
      <h2>Återställ lösenord</h2>
      <form onSubmit={handleReset}>
        <input
          type="password"
          placeholder="Nytt lösenord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Spara</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};
