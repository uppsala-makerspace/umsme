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

  useEffect(() => {
    const fetchDoors = async () => {
      try {
        const doorIds = await Meteor.callAsync("availableDoors");
        const doorObjects = doorIds.map((id) => ({ id, labelKey: id }));
        setDoors(doorObjects);
        setOpening(Object.fromEntries(doorIds.map((id) => [id, false])));
      } catch (error) {
        console.error("Error fetching available doors:", error);
      } finally {
        setLoading(false);
      }
    };

    if (Meteor.userId()) {
      fetchDoors();
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
          <Unlock doors={doors} opening={opening} onOpenDoor={handleOpenDoor} />
        )}
      </div>
    </>
  );
};
