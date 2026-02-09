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
        setLocationPermission("granted");
      },
      (error) => {
        console.error("Geolocation error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermission("denied");
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

    if (!navigator.permissions) return;

    let permissionStatus;

    const onChange = () => {
      if (permissionStatus.state === "granted") {
        setLocationPermission("granted");
        startWatching();
      } else if (permissionStatus.state === "denied") {
        setLocationPermission("denied");
        stopWatching();
        setUserPosition(null);
      } else {
        setLocationPermission("pending");
      }
    };

    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        permissionStatus = status;
        if (status.state === "granted") {
          setLocationPermission("granted");
          startWatching();
        } else if (status.state === "denied") {
          setLocationPermission("denied");
        }
        status.addEventListener("change", onChange);
      })
      .catch(() => {});

    return () => {
      permissionStatus?.removeEventListener("change", onChange);
      stopWatching();
    };
  }, []);

  return (
    <LocationContext.Provider value={{ userPosition, locationPermission }}>
      {children}
    </LocationContext.Provider>
  );
};
