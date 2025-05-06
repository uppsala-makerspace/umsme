import { Accounts } from "meteor/accounts-base";
import React, { useState } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";

export const ResetPassword = ({ token }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (password !== confirm) {
      alert("Lösenorden matchar inte");
      return;
    }

    Accounts.resetPassword(token, password, (err) => {
      if (err) {
        alert("Fel: " + err);
      } else {
        alert("Lösenordet är återställt!");
        FlowRouter.go("/login");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Återställ lösenord</h2>
      <input
        type="password"
        placeholder="Nytt lösenord"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="password"
        placeholder="Bekräfta lösenord"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <button type="submit">Återställ</button>
    </form>
  );
};
