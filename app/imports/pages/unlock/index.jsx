import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import { useTracker } from "meteor/react-meteor-data";
import { Meteor } from "meteor/meteor";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Unlock from "./Unlock";
import { LocationContext } from "/imports/context/LocationContext";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";
import { AppDataContext } from "/imports/context/AppDataContext";

export default () => {
  const userId = useTracker(() => Meteor.userId());
  const { userPosition, locationPermission } = useContext(LocationContext);
  const { memberInfo } = useContext(MemberInfoContext);
  const { doors: doorsData, isAdmin, loading: appDataLoading } = useContext(AppDataContext);
  const [opening, setOpening] = useState({});
  const [certLoading, setCertLoading] = useState(true);
  const [mandatoryCertificate, setMandatoryCertificate] = useState(null);
  const [hasMandatoryCertificate, setHasMandatoryCertificate] = useState(true);
  const promptWatchIdRef = useRef(null);

  const proximityRange = doorsData?.proximityRange || 200;
  const doors = useMemo(() => {
    if (!doorsData?.doors) return [];
    return doorsData.doors.map((door) => ({
      id: door.id,
      labelKey: door.id,
      location: door.location,
    }));
  }, [doorsData]);

  // Initialize opening state when doors change
  useEffect(() => {
    if (doors.length > 0) {
      setOpening(Object.fromEntries(doors.map((d) => [d.id, false])));
    }
  }, [doors]);

  const loading = appDataLoading || certLoading;

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

  // Fetch certificate status
  useEffect(() => {
    if (!userId) return;
    const fetchCertStatus = async () => {
      try {
        const certStatus = await Meteor.callAsync("certificates.getMandatoryStatus");
        if (certStatus) {
          setMandatoryCertificate(certStatus.certificate);
          setHasMandatoryCertificate(certStatus.hasValidAttestation);
        }
      } catch (error) {
        console.error("Error fetching certificate status:", error);
      } finally {
        setCertLoading(false);
      }
    };
    fetchCertStatus();
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
          liabilityDate={memberInfo?.liabilityDate ?? null}
          liabilityOutdated={memberInfo?.liabilityOutdated ?? false}
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
