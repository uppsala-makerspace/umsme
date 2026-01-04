import React, { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { LanguageSwitcher } from "/imports/components/LanguageSwitcher/langueSwitcher";
import { HamburgerMenu } from "/imports/components/HamburgerMenu/HamburgerMenu";
import Unlock from "./Unlock";

const DOORS = [
  { id: "outerDoor", labelKey: "outerDoor" },
  { id: "upperFloor", labelKey: "upperFloor" },
  { id: "lowerFloor", labelKey: "lowerFloor" },
];

export default () => {
  const initialOpeningState = useMemo(
    () => Object.fromEntries(DOORS.map((door) => [door.id, false])),
    []
  );

  const [opening, setOpening] = useState(initialOpeningState);

  const handleOpenDoor = (doorId) => {
    setOpening((prev) => ({ ...prev, [doorId]: true }));

    setTimeout(() => {
      setOpening((prev) => ({ ...prev, [doorId]: false }));
    }, 3000);

    // TODO: Add actual door opening logic
  };

  return (
    <>
      {!Meteor.userId() ? <Navigate to="/login" /> : null}
      <LanguageSwitcher />
      <HamburgerMenu />
      <div className="login-form">
        <Unlock doors={DOORS} opening={opening} onOpenDoor={handleOpenDoor} />
      </div>
    </>
  );
};
