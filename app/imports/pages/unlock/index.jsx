import React, { useState, useEffect } from "react";
import { Meteor } from "meteor/meteor";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Unlock from "./Unlock";

export default () => {
  const [doors, setDoors] = useState([]);
  const [opening, setOpening] = useState({});
  const [loading, setLoading] = useState(true);
  const [liabilityDate, setLiabilityDate] = useState(null);
  const [liabilityOutdated, setLiabilityOutdated] = useState(false);
  const [mandatoryCertificate, setMandatoryCertificate] = useState(null);
  const [hasMandatoryCertificate, setHasMandatoryCertificate] = useState(true);
  const [userPosition, setUserPosition] = useState(null);
  const [locationPermission, setLocationPermission] = useState("pending"); // pending, granted, denied, unavailable
  const [proximityRange, setProximityRange] = useState(100);
  const [isAdmin, setIsAdmin] = useState(false);

  // Start geolocation tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationPermission("unavailable");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
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
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Listen for permission changes via Permissions API
  useEffect(() => {
    if (!navigator.permissions) return;
    let status;
    const onChange = () => {
      if (status.state === "granted") setLocationPermission("granted");
      else if (status.state === "denied") setLocationPermission("denied");
      else setLocationPermission("pending");
    };
    navigator.permissions.query({ name: "geolocation" }).then((s) => {
      status = s;
      status.addEventListener("change", onChange);
    }).catch(() => {});
    return () => status?.removeEventListener("change", onChange);
  }, []);

  // Fetch door data and member info
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [doorsResult, memberInfo, certStatus, admin] = await Promise.all([
          Meteor.callAsync("availableDoors"),
          Meteor.callAsync("findInfoForUser"),
          Meteor.callAsync("certificates.getMandatoryStatus"),
          Meteor.callAsync("checkIsAdmin"),
        ]);

        // Set proximity range and doors from server
        setProximityRange(doorsResult.proximityRange || 200);

        const doorObjects = doorsResult.doors.map((door) => ({
          id: door.id,
          labelKey: door.id,
          location: door.location,
        }));
        setDoors(doorObjects);
        setOpening(Object.fromEntries(doorObjects.map((d) => [d.id, false])));

        setLiabilityDate(memberInfo?.liabilityDate ?? null);
        setLiabilityOutdated(memberInfo?.liabilityOutdated ?? false);

        // Set mandatory certificate status
        if (certStatus) {
          setMandatoryCertificate(certStatus.certificate);
          setHasMandatoryCertificate(certStatus.hasValidAttestation);
        }

        setIsAdmin(admin);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (Meteor.userId()) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  const handleOpenDoor = async (doorId) => {
    setOpening((prev) => ({ ...prev, [doorId]: true }));

    try {
      await Meteor.callAsync("unlockDoor", doorId);
    } catch (error) {
      console.error("Error unlocking door:", error);
    }

    setTimeout(() => {
      setOpening((prev) => ({ ...prev, [doorId]: false }));
    }, 3000);
  };

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      {loading ? null : (
        <Unlock
          doors={doors}
          opening={opening}
          onOpenDoor={handleOpenDoor}
          liabilityDate={liabilityDate}
          liabilityOutdated={liabilityOutdated}
          mandatoryCertificate={mandatoryCertificate}
          hasMandatoryCertificate={hasMandatoryCertificate}
          userPosition={userPosition}
          locationPermission={locationPermission}
          proximityRange={proximityRange}
          isAdmin={isAdmin}
        />
      )}
    </Layout>
  );
};
