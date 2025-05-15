import React from "react";
import "/client/ui/admin";
import "/client/ui/Webapp";
import PushSetup from "/client/ui/Webapp/imports/components/pushSetup";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log(" Service Worker registered:", registration);
      })
      .catch((registrationError) => {
        console.log(" SW registration failed:", registrationError);
      });
  });
}

export default function App() {
  return (
    <div>
      <PushSetup />
    </div>
  );
}
