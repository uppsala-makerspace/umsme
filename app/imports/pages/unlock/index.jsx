import React from "react";
import { Meteor } from "meteor/meteor";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { HamburgerMenu } from "../../components/HamburgerMenu/HamburgerMenu";
import { useTranslation } from "react-i18next";
import { useTracker } from "meteor/react-meteor-data";
import { useState } from "react";
import "./unlockDoors.css";

export default () => {
  const user = useTracker(() => Meteor.user());
  const { t, i18n } = useTranslation();

  const [opening, setOpening] = useState({
    outerDoor: false,
    upperFloor: false,
    lowerFloor: false,
  });

  const handleSubmit = (door) => {
    setOpening((prev) => ({ ...prev, [door]: true }));

    setTimeout(() => {
      setOpening((prev) => ({ ...prev, [door]: false }));
    }, 3000);

    // Lägg till så att dörren faktiskt öppnas
  };

  return (
    <>
      <LanguageSwitcher />
      <HamburgerMenu />
      <br></br>
      <div className="login-form">
        <p style={{ marginBottom: "5px" }}> {t("outerDoor")}</p>
        <button
          style={{ marginTop: "0", marginBottom: "8vh" }}
          className="door-button"
          onClick={() => handleSubmit("outerDoor")}
        >
          {opening.outerDoor ? t("isOpening") : t("openDoor")}
        </button>
        <p style={{ marginBottom: "5px" }}> {t("upperFloor")}</p>
        <button
          style={{ marginTop: "0", marginBottom: "8vh" }}
          className="door-button"
          onClick={() => handleSubmit("upperFloor")}
        >
          {opening.upperFloor ? t("isOpening") : t("openDoor")}
        </button>
        <p style={{ marginBottom: "5px" }}> {t("lowerFloor")}</p>
        <button
          style={{ marginTop: "0", marginBottom: "8vh" }}
          className="door-button"
          onClick={() => handleSubmit("lowerFloor")}
        >
          {opening.lowerFloor ? t("isOpening") : t("openDoor")}
        </button>
      </div>
    </>
  );
};
