import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getDistanceTo, formatDistance } from "/imports/utils/location";
import Button from "../../components/Button";
import MainContent from "../../components/MainContent";
import "./unlockDoors.css";

const Unlock = ({
  doors,
  opening,
  onOpenDoor,
  liabilityDate,
  liabilityOutdated,
  mandatoryCertificate,
  hasMandatoryCertificate,
  userPosition,
  locationPermission,
  proximityRange,
  isAdmin,
  isPWAOverride,
}) => {
  const { t } = useTranslation();

  // Detect if running as installed PWA (can be overridden for testing)
  const isPWA =
    isPWAOverride ??
    (window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true);

  const liabilityNeedsAttention = !liabilityDate || liabilityOutdated;

  if (liabilityNeedsAttention) {
    return (
      <MainContent className="unlock">
        <p className="flex flex-col items-center text-center mt-5 mb-4">
          {liabilityOutdated ? t("homeLiabilityOutdated") : t("homeLiabilityNotApproved")}
        </p>
        <Link to="/liability" className="w-full block no-underline text-center">
          <Button fullWidth>{t("homeLiabilityButton")}</Button>
        </Link>
      </MainContent>
    );
  }

  if (mandatoryCertificate && !hasMandatoryCertificate) {
    return (
      <MainContent className="unlock">
        <p className="flex flex-col items-center text-center mt-5 mb-4">
          {t("unlockMandatoryCertificateRequired")}
        </p>
        <Link to={`/certificates/${mandatoryCertificate._id}`} className="w-full block no-underline text-center">
          <Button fullWidth>{t("unlockMandatoryCertificateButton")}</Button>
        </Link>
      </MainContent>
    );
  }

  if (doors.length === 0) {
    return <MainContent className="unlock"><p className="text-sm text-center">{t("noAvailableDoors")}</p></MainContent>;
  }

  const locationDenied = locationPermission === "denied";

  // Helper to check if a door is in range
  const isDoorInRange = (door) => {
    if (isAdmin) return true; // Admins can always unlock
    if (!door.location) return true; // No location configured, allow
    if (!userPosition) return false; // No user position yet

    const distance = getDistanceTo(userPosition, door.location);
    return distance !== null && distance <= proximityRange;
  };

  // Helper to get distance to a door
  const getDistance = (door) => {
    if (!door.location || !userPosition) return null;
    return getDistanceTo(userPosition, door.location);
  };

  return (
    <MainContent className="unlock">
      {/* Location denied message */}
      {locationDenied && (
        <div className="text-center mb-8 p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-500 text-sm font-semibold mb-2">{t("locationDenied")}</p>
          <p className="text-gray-500 text-sm leading-snug">
            {t(isPWA ? "locationDeniedInstructionsPWA" : "locationDeniedInstructionsBrowser")}
          </p>
        </div>
      )}

      {doors.map((door) => {
        const inRange = isDoorInRange(door);
        const distance = getDistance(door);
        const isDisabled = !inRange || (locationDenied && !isAdmin);

        return (
          <React.Fragment key={door.id}>
            <p className="mb-2.5 font-bold text-center w-full">{t(door.labelKey)}</p>
            <button
              className={`door-button ${isDisabled ? "disabled" : ""}`}
              onClick={() => !isDisabled && onOpenDoor(door.id)}
              disabled={isDisabled}
            >
              <span>
                {opening[door.id]
                  ? t("isOpening")
                  : isDisabled && distance !== null
                  ? formatDistance(distance)
                  : t("openDoor")}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </MainContent>
  );
};

Unlock.propTypes = {
  doors: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      labelKey: PropTypes.string.isRequired,
      location: PropTypes.shape({
        lat: PropTypes.number,
        long: PropTypes.number,
      }),
    })
  ).isRequired,
  opening: PropTypes.objectOf(PropTypes.bool).isRequired,
  onOpenDoor: PropTypes.func.isRequired,
  liabilityDate: PropTypes.instanceOf(Date),
  liabilityOutdated: PropTypes.bool,
  userPosition: PropTypes.shape({
    lat: PropTypes.number,
    long: PropTypes.number,
  }),
  locationPermission: PropTypes.oneOf(["pending", "granted", "denied", "unavailable"]),
  proximityRange: PropTypes.number,
  isAdmin: PropTypes.bool,
  isPWAOverride: PropTypes.bool,
};

Unlock.defaultProps = {
  userPosition: null,
  locationPermission: "pending",
  proximityRange: 100,
  isAdmin: false,
  isPWAOverride: undefined,
};

export default Unlock;
