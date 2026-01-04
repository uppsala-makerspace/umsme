import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import "./unlockDoors.css";

const Unlock = ({ doors, opening, onOpenDoor }) => {
  const { t } = useTranslation();

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
};

export default Unlock;
