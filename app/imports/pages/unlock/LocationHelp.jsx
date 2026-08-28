import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import Button from "../../components/Button";
import { formatDistance } from "/imports/utils/location";

/**
 * The troubleshooting guide at the foot of the door view, for the member
 * standing at a door that will not turn green. Shown only when their location is
 * what stands in the way (see locationProblemFor) — a membership, liability or
 * certificate problem has its own message and never reaches this.
 *
 * Collapsed by default: expanded it would push the door buttons off a phone
 * screen, and most visits to the page are not a problem to be solved.
 */

/** The steps worth taking, per reason. Order is the order to try them in. */
const STEPS = {
  denied: ["unlockTroubleStepAllow"],
  unavailable: ["unlockTroubleStepSettings", "unlockTroubleStepInstall"],
  noPosition: [
    "unlockTroubleStepWait",
    "unlockTroubleStepSettings",
    "unlockTroubleStepInstall",
  ],
  outOfRange: ["unlockTroubleStepClose", "unlockTroubleStepWait"],
};

const LocationHelp = ({ reason, distance, locationError, locating, onRetry }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const steps = STEPS[reason];
  if (!steps) return null;

  const headline =
    reason === "outOfRange"
      ? t("unlockTroubleOutOfRange", {
          distance: distance === null ? "?" : formatDistance(distance),
        })
      : t(
          reason === "denied"
            ? "unlockTroubleDenied"
            : reason === "unavailable"
            ? "unlockTroubleUnavailable"
            : "unlockTroubleNoPosition",
        );

  return (
    <div className="mt-2 mb-4 rounded-lg border border-gray-200 bg-white">
      <button
        className="flex w-full items-center gap-2 border-none bg-transparent p-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <QuestionMarkCircleIcon className="w-5 h-5 flex-shrink-0 text-gray-500" aria-hidden="true" />
        <span className="flex-1">{t("unlockTroubleTitle")}</span>
        {open ? (
          <ChevronUpIcon className="w-4 h-4 flex-shrink-0 text-gray-500" aria-hidden="true" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 flex-shrink-0 text-gray-500" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="border-t border-gray-200 p-4 pt-3">
          <p className="m-0 text-sm font-semibold text-gray-700">{headline}</p>
          {/* A timeout leaves the permission state at "pending", so say which of
              the two silent cases it actually was. */}
          {reason === "noPosition" && locationError === "timeout" && (
            <p className="mt-1 mb-0 text-sm text-gray-500">{t("unlockTroubleTimeout")}</p>
          )}
          <ol className="list-decimal mt-3 mb-4 pl-5 text-sm text-gray-700 leading-snug">
            {steps.map((key) => (
              <li key={key} className="mb-2">
                {t(key)}
              </li>
            ))}
          </ol>
          <Button variant="secondary" fullWidth onClick={onRetry} disabled={locating}>
            {t(locating ? "unlockTroubleRetrying" : "unlockTroubleRetry")}
          </Button>
        </div>
      )}
    </div>
  );
};

LocationHelp.propTypes = {
  reason: PropTypes.oneOf(["denied", "unavailable", "noPosition", "outOfRange"]),
  distance: PropTypes.number,
  locationError: PropTypes.oneOf(["timeout", "unavailable"]),
  locating: PropTypes.bool,
  onRetry: PropTypes.func,
};

LocationHelp.defaultProps = {
  reason: undefined,
  distance: null,
  locationError: null,
  locating: false,
  onRetry: () => {},
};

export default LocationHelp;
