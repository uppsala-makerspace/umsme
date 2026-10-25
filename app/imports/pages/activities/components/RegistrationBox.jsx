import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../components/Button";
import { localized } from "/imports/common/lib/groupRules";
import { eventWhen } from "./format";

const STATE_TONES = {
  approved: "bg-green-100 text-green-800",
  checkedIn: "bg-green-100 text-green-800",
  attended: "bg-green-100 text-green-800",
  queued: "bg-amber-100 text-amber-800",
};

/** A member's registration state as a small pill. */
export const StatePill = ({ state }) => {
  const { t } = useTranslation();
  if (!state) return null;
  return (
    <span className={`inline-block text-xs font-semibold rounded-full py-0.5 px-2 ${STATE_TONES[state] || "bg-gray-100 text-gray-600"}`}>
      {t(`registrationState_${state}`)}
    </span>
  );
};

const at = (date, lang) => eventWhen({ start: date, end: date }, lang).replace(/–.*$/, "");

/**
 * Signing up for an event: the seats left and the queue, one's own
 * registration, and what one may do: sign up (with the information asked
 * for), take a free seat from the queue, check in, withdraw.
 */
const RegistrationBox = ({ registration, busy, error, onRegister, onWithdraw, onTakeSeat, onCheckIn }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const [info, setInfo] = useState("");
  if (!registration) return null;
  const { mine, seats, seatsLeft, queued, open } = registration;
  const pending = mine && ["approved", "checkedIn", "queued"].includes(mine.state);
  const full = seatsLeft === 0 || (queued > 0 && seatsLeft !== null);
  const certificateMissing = registration.certificate && !registration.certificate.held;
  return (
    <section className="mb-6 p-4 rounded-lg bg-white border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-lg m-0">{t(registration.required ? "registrationRequired" : "registrationOptional")}</h3>
        {mine && <span className="ml-auto"><StatePill state={mine.state} /></span>}
      </div>
      <p className="m-0 mb-3 text-sm text-gray-600">
        {seats === null
          ? t("registrationNoLimit")
          : t("registrationSeatsLeft", { count: seatsLeft, seats })}
        {queued > 0 && ` · ${t("registrationQueued", { count: queued })}`}
      </p>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {mine?.state === "queued" && registration.canTakeSeat && (
        <div className="mb-3">
          <p className="m-0 mb-2 text-sm">{t("registrationSeatFree")}</p>
          <Button disabled={busy} onClick={onTakeSeat}>{t("registrationTakeSeat")}</Button>
        </div>
      )}
      {registration.canCheckIn && (
        <div className="mb-3">
          <p className="m-0 mb-2 text-sm">{t("registrationCheckInNow", { deadline: at(registration.checkIn.closes, lang) })}</p>
          <Button disabled={busy} onClick={onCheckIn}>{t("registrationCheckIn")}</Button>
        </div>
      )}
      {mine?.state === "approved" && registration.checkIn && !registration.canCheckIn && new Date(registration.checkIn.opens) > new Date() && (
        <p className="m-0 mb-3 text-sm text-gray-600">
          {t("registrationCheckInLater", { opens: at(registration.checkIn.opens, lang), closes: at(registration.checkIn.closes, lang) })}
        </p>
      )}

      {!pending && open && (
        certificateMissing ? (
          <p className="m-0 text-sm">
            {t("registrationNeedsCertificate")}{" "}
            <Link to={`/certificates/${registration.certificate._id}`} className="text-brand-green font-semibold no-underline hover:underline">
              {localized(registration.certificate.name, lang)}
            </Link>
          </p>
        ) : full && !registration.queueAllowed ? (
          <p className="m-0 text-sm font-semibold">{t("registrationFull")}</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); onRegister(info); }}>
            {registration.infoRequired && (
              <label className="block mb-3">
                <span className="block mb-1 text-sm font-bold">{t("registrationInfo")}</span>
                <textarea
                  rows={2} required value={info} onChange={(e) => setInfo(e.target.value)}
                  placeholder={registration.infoPlaceholder}
                  className="bg-surface border border-black rounded py-2 px-3 text-base font-mono w-full box-border"
                />
              </label>
            )}
            <Button type="submit" disabled={busy}>{t(full ? "registrationJoinQueue" : "registrationSignUp")}</Button>
          </form>
        )
      )}
      {!pending && !open && !mine && <p className="m-0 text-sm text-gray-500">{t("registrationClosed")}</p>}
      {registration.canWithdraw && (
        <button type="button" disabled={busy} onClick={onWithdraw}
          className="mt-3 bg-transparent border-none p-0 text-sm text-red-700 underline cursor-pointer">
          {t(mine.state === "queued" ? "registrationLeaveQueue" : "registrationWithdraw")}
        </button>
      )}
    </section>
  );
};

RegistrationBox.propTypes = {
  registration: PropTypes.object,
  busy: PropTypes.bool,
  error: PropTypes.string,
  onRegister: PropTypes.func,
  onWithdraw: PropTypes.func,
  onTakeSeat: PropTypes.func,
  onCheckIn: PropTypes.func,
};

export default RegistrationBox;
