import React, { useState, useEffect } from "react";
import { Meteor } from "meteor/meteor";
import { Navigate } from "react-router-dom";
import { LanguageSwitcher } from "/imports/components/LanguageSwitcher/langueSwitcher";
import { HamburgerMenu } from "/imports/components/HamburgerMenu/HamburgerMenu";
import Unlock from "./Unlock";

export default () => {
  const [doors, setDoors] = useState([]);
  const [opening, setOpening] = useState({});
  const [loading, setLoading] = useState(true);
  const [liabilityDate, setLiabilityDate] = useState(null);
  const [liabilityOutdated, setLiabilityOutdated] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [doorIds, memberInfo] = await Promise.all([
          Meteor.callAsync("availableDoors"),
          Meteor.callAsync("findInfoForUser")
        ]);

        const doorObjects = doorIds.map((id) => ({ id, labelKey: id }));
        setDoors(doorObjects);
        setOpening(Object.fromEntries(doorIds.map((id) => [id, false])));

        setLiabilityDate(memberInfo?.liabilityDate ?? null);
        setLiabilityOutdated(memberInfo?.liabilityOutdated ?? false);
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
    <>
      <LanguageSwitcher />
      <HamburgerMenu />
      <div className="login-form">
        {loading ? null : (
          <Unlock
            doors={doors}
            opening={opening}
            onOpenDoor={handleOpenDoor}
            liabilityDate={liabilityDate}
            liabilityOutdated={liabilityOutdated}
          />
        )}
      </div>
    </>
  );
};
