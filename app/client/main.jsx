import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import React from "react";
import { createRoot } from 'react-dom/client';
import './main.css';
import './tailwind.output.css';
import '/imports/i18n';
import { App } from '/imports/ui/App';

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("Service Worker registered:", registration);
      })
      .catch((registrationError) => {
        console.log("Service Worker registration failed:", registrationError);
      });
  });
}

Accounts.onEmailVerificationLink((token, done) => {
  Accounts.verifyEmail(token, (error) => {
    if (error) {
      console.error("Email verification failed:", error);
    } else {
      console.log("Email verified successfully");
    }
    done();
  });
});

Meteor.startup(() => {
  const container = document.getElementById('react-target');
  const root = createRoot(container);
  root.render(<App />);
});
