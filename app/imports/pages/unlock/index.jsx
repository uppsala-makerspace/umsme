import React, { useState, useEffect, useContext, useMemo } from "react";
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
  const { memberInfo, loading: memberInfoLoading } = useContext(MemberInfoContext);
  const { doors: doorsData, isAdmin, mandatoryCertStatus, loading: appDataLoading } = useContext(AppDataContext);
  const [opening, setOpening] = useState({});

  const mandatoryCertificate = mandatoryCertStatus?.certificate || null;
  const hasMandatoryCertificate = mandatoryCertStatus?.hasValidAttestation ?? true;

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

  const loading = appDataLoading || memberInfoLoading;

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
      <Unlock
        loading={loading}
        doors={doors}
        opening={opening}
        onOpenDoor={handleOpenDoor}
        liabilityDate={memberInfo?.liabilityDate ?? null}
        liabilityOutdated={memberInfo?.liabilityOutdated ?? false}
        mandatoryCertificate={mandatoryCertificate}
        hasMandatoryCertificate={hasMandatoryCertificate}
        registered={!!memberInfo?.paying?.registered}
        userPosition={userPosition}
        locationPermission={locationPermission}
        proximityRange={proximityRange}
        isAdmin={isAdmin}
      />
    </Layout>
  );
};
