// ForgotPassword.jsx
import React, { useState } from "react";
import { Accounts } from "meteor/accounts-base";

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleForgotPassword = (e) => {
    e.preventDefault();

    Accounts.forgotPassword({ email }, (error) => {
      if (error) {
        setMessage("Kunde inte skicka e-post: " + error);
      } else {
        setMessage("Ett återställningsmail har skickats.");
      }
    });
  };

  return (
    <div className="forgot-password">
      <h2>Glömt lösenord</h2>
      <form onSubmit={handleForgotPassword}>
        <input
          type="email"
          placeholder="Din e-postadress"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Skicka återställningslänk</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};
