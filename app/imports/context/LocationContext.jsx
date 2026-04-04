import React, { createContext, useState, useEffect, useRef } from "react";

export const LocationContext = createContext({
  userPosition: null,
  locationPermission: "pending",
});

const WATCH_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
};

export const LocationProvider = ({ children }) => {
  const [userPosition, setUserPosition] = useState(null);
  const [locationPermission, setLocationPermission] = useState("pending");
  const watchIdRef = useRef(null);

  function startWatching() {
    if (watchIdRef.current != null) return;
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserPosition({
          lat: position.coords.latitude,
          long: position.coords.longitude,
        });
        setLocationPermission((prev) => prev !== "granted" ? "granted" : prev);
      },
      (error) => {
        console.error("Geolocation error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermission("denied");
          stopWatching();
        }
      },
      WATCH_OPTIONS
    );
  }

  function stopWatching() {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationPermission("unavailable");
      return;
    }

    // Always start watching immediately — use watchPosition callbacks
    // as the source of truth for permission state, since
    // navigator.permissions.query is unreliable on Safari/iOS.
    startWatching();

    // Optionally listen for permission changes (e.g. user re-grants
    // after denial via browser settings). This is a supplement, not
    // the primary mechanism.
    let permissionStatus;

    // Listen for permission re-grants after denial (e.g. user changes
    // browser settings). Supplement only — not all browsers support this.
    const onPermissionChange = () => {
      if (permissionStatus.state === "granted") {
        startWatching();
      } else if (permissionStatus.state === "denied") {
        setLocationPermission("denied");
        stopWatching();
        setUserPosition(null);
      }
    };

    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((status) => {
          permissionStatus = status;
          status.addEventListener("change", onPermissionChange);
        })
        .catch(() => {});
    }

    return () => {
      permissionStatus?.removeEventListener("change", onPermissionChange);
      stopWatching();
    };
  }, []);

  return (
    <LocationContext.Provider value={{ userPosition, locationPermission }}>
      {children}
    </LocationContext.Provider>
  );
};
