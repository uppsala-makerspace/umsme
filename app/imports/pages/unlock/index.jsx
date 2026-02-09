import React, { useState, useEffect, useContext, useRef } from "react";
import { useTracker } from "meteor/react-meteor-data";
import { Meteor } from "meteor/meteor";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Unlock from "./Unlock";
import { LocationContext } from "/imports/context/LocationContext";

export default () => {
  const userId = useTracker(() => Meteor.userId());
  const { userPosition, locationPermission } = useContext(LocationContext);
  const [doors, setDoors] = useState([]);
  const [opening, setOpening] = useState({});
  const [loading, setLoading] = useState(true);
  const [liabilityDate, setLiabilityDate] = useState(null);
  const [liabilityOutdated, setLiabilityOutdated] = useState(false);
  const [mandatoryCertificate, setMandatoryCertificate] = useState(null);
  const [hasMandatoryCertificate, setHasMandatoryCertificate] = useState(true);
  const [proximityRange, setProximityRange] = useState(100);
  const [isAdmin, setIsAdmin] = useState(false);
  const promptWatchIdRef = useRef(null);

  // When permission is pending (first visit), trigger the browser prompt via
  // watchPosition. Once the user grants permission, the LocationContext picks
  // it up and starts global tracking, so we can clear this local watch.
  useEffect(() => {
    if (locationPermission !== "pending" || !navigator.geolocation) {
      // Permission already resolved — clear any prompt watch
      if (promptWatchIdRef.current != null) {
        navigator.geolocation.clearWatch(promptWatchIdRef.current);
        promptWatchIdRef.current = null;
      }
      return;
    }

    promptWatchIdRef.current = navigator.geolocation.watchPosition(
      () => {
        // Success — context will handle tracking from here
        if (promptWatchIdRef.current != null) {
          navigator.geolocation.clearWatch(promptWatchIdRef.current);
          promptWatchIdRef.current = null;
        }
      },
      () => {
        // Error handled by context's permission listener
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      if (promptWatchIdRef.current != null) {
        navigator.geolocation.clearWatch(promptWatchIdRef.current);
        promptWatchIdRef.current = null;
      }
    };
  }, [locationPermission]);

  // Fetch door data and member info.
  // Sequential calls to avoid a race condition where parallel Meteor.callAsync
  // calls can arrive at the server before the DDP login is established.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const doorsResult = await Meteor.callAsync("availableDoors");
        setProximityRange(doorsResult.proximityRange || 200);
        const doorObjects = doorsResult.doors.map((door) => ({
          id: door.id,
          labelKey: door.id,
          location: door.location,
        }));
        setDoors(doorObjects);
        setOpening(Object.fromEntries(doorObjects.map((d) => [d.id, false])));

        const memberInfo = await Meteor.callAsync("findInfoForUser");
        setLiabilityDate(memberInfo?.liabilityDate ?? null);
        setLiabilityOutdated(memberInfo?.liabilityOutdated ?? false);

        const certStatus = await Meteor.callAsync("certificates.getMandatoryStatus");
        if (certStatus) {
          setMandatoryCertificate(certStatus.certificate);
          setHasMandatoryCertificate(certStatus.hasValidAttestation);
        }

        const admin = await Meteor.callAsync("checkIsAdmin");
        setIsAdmin(admin);
      } catch (error) {
        console.error("Error fetching unlock data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);

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

  if (!userId) {
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
