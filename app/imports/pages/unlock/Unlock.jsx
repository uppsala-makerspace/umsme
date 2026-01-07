import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import "./unlockDoors.css";

const Unlock = ({ doors, opening, onOpenDoor, liabilityDate, liabilityOutdated }) => {
  const { t } = useTranslation();

  const liabilityNeedsAttention = !liabilityDate || liabilityOutdated;

  if (liabilityNeedsAttention) {
    return (
      <>
        <p className="text-container">
          {liabilityOutdated ? t("homeLiabilityOutdated") : t("homeLiabilityNotApproved")}
        </p>
        <Link to="/liability" className="wideButton">
          <button className="form-button">{t("homeLiabilityButton")}</button>
        </Link>
      </>
    );
  }

  if (doors.length === 0) {
    return <p className="text-sm text-center">{t("noAvailableDoors")}</p>;
  }

  return (
    <>
      {doors.map((door) => (
        <React.Fragment key={door.id}>
          <p className="door-label">{t(door.labelKey)}</p>
          <button className="door-button" onClick={() => onOpenDoor(door.id)}>
            <span>{opening[door.id] ? t("isOpening") : t("openDoor")}</span>
          </button>
        </React.Fragment>
      ))}
    </>
  );
};

Unlock.propTypes = {
  doors: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      labelKey: PropTypes.string.isRequired,
    })
  ).isRequired,
  opening: PropTypes.objectOf(PropTypes.bool).isRequired,
  onOpenDoor: PropTypes.func.isRequired,
  liabilityDate: PropTypes.instanceOf(Date),
  liabilityOutdated: PropTypes.bool,
};

export default Unlock;
