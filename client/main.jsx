import "/client/ui/admin";
import "/client/ui/Webapp";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("✅ Service Worker registered:", registration);
      })
      .catch((registrationError) => {
        console.log(" SW registration failed:", registrationError);
      });
  });
}
