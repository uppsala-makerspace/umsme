import React, { createContext, useState, useEffect, useRef } from "react";

export const LocationContext = createContext({
  userPosition: null,
  locationPermission: "pending",
  locationError: null,
  locating: false,
  retryLocation: () => {},
});

const WATCH_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
};

// A retry asks for a fresh fix rather than whatever the watch last managed:
// maximumAge 0 rules out the cached position that keeps a stuck watch looking
// alive, and the longer timeout gives a cold GPS a real chance.
const RETRY_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 0,
};

export const LocationProvider = ({ children }) => {
  const [userPosition, setUserPosition] = useState(null);
  const [locationPermission, setLocationPermission] = useState("pending");
  // Why no position arrived, when the reason is not a denial: a timed-out or
  // unavailable fix leaves locationPermission at "pending" forever, which on its
  // own tells the door view nothing it can explain to the member.
  const [locationError, setLocationError] = useState(null);
  const [locating, setLocating] = useState(false);
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
        setLocationError(null);
        setLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermission("denied");
          setLocationError(null);
          stopWatching();
        } else if (error.code === error.TIMEOUT) {
          setLocationError("timeout");
        } else {
          setLocationError("unavailable");
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

  // Restart the watch and ask for one fresh fix. Offered from the door view's
  // troubleshooting guide, since the watch is otherwise started once on mount
  // and never again — a member whose first attempt timed out had no way back.
  function retryLocation() {
    if (!navigator.geolocation) {
      setLocationPermission("unavailable");
      return;
    }
    setLocating(true);
    setLocationError(null);
    stopWatching();
    startWatching();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition({
          lat: position.coords.latitude,
          long: position.coords.longitude,
        });
        setLocationPermission("granted");
        setLocationError(null);
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermission("denied");
        } else {
          setLocationError(error.code === error.TIMEOUT ? "timeout" : "unavailable");
        }
      },
      RETRY_OPTIONS
    );
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
    <LocationContext.Provider
      value={{ userPosition, locationPermission, locationError, locating, retryLocation }}
    >
      {children}
    </LocationContext.Provider>
  );
};
