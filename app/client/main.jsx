import { Meteor } from 'meteor/meteor';
import React from "react";
import { createRoot } from 'react-dom/client';
import { App } from '/imports/ui/App';
import '/imports/i18n';

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

Meteor.startup(() => {
  const container = document.getElementById('react-target');
  const root = createRoot(container);
  root.render(<App />);
});
