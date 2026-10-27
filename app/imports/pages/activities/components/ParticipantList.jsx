import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { StatePill } from "./RegistrationBox";
import Card from "./Card";

/**
 * The event's participants, for its hosts: who has a seat or queues, and
 * once it has started, who came, with a button each and one to close it.
 * With a certificate the event gives (`certificateGrant`), who holds it or
 * has asked for it, a request linking to where a host who may certify it
 * confirms it; a warning when it is given on attendance and no host may; and
 * `notice`, what became of it when someone was marked as come.
 */
const ParticipantList = ({ participants, attendance, takesRegistrations = true, busy, onAttended, onClose, certificateGrant = null, notice = null }) => {
  const { t } = useTranslation();
  if (!participants) return null;
  const recording = attendance?.open;
  return (
    <Card
      title={t("participants")} kind="event"
      actions={recording && (
        <button type="button" disabled={busy} onClick={onClose}
          className="bg-transparent border-none p-0 text-sm font-semibold text-brand-green cursor-pointer">
          {t("participantsCloseAttendance")}
        </button>
      )}
    >
      {attendance?.closed && <p className="m-0 mb-2 text-sm text-gray-500">{t("participantsAttendanceClosed")}</p>}
      {certificateGrant?.noCertifierHost && (
        <p className="m-0 mb-2 text-sm rounded bg-amber-50 border border-amber-200 text-amber-900 p-2">{t("participantsNoCertifierHost")}</p>
      )}
      {participants.length === 0 ? (
        <p className="text-gray-500 m-0">{t(takesRegistrations ? "participantsNone" : "participantsNoRegistration")}</p>
      ) : (
        <ul className="list-none p-0 m-0">
          {participants.map((p) => (
            <li key={p.memberId} className="flex items-center gap-2 py-2 border-b border-gray-100">
              <div className="flex-1 min-w-0">
                <span className="block">{p.name}</span>
                {p.info && <span className="block text-xs text-gray-500">{p.info}</span>}
                {p.certificate === "held" && <span className="block text-xs text-green-700">{t("participantsHoldsCertificate")}</span>}
                {p.certificate === "pending" && (certificateGrant?.mayCertify ? (
                  <Link to={`/certifier-requests/${p.requestId}`} className="block text-xs font-semibold text-red-700 no-underline hover:underline">
                    {t("participantsAskedForCertificate")} &rarr;
                  </Link>
                ) : <span className="block text-xs text-gray-500">{t("participantsAskedForCertificate")}</span>)}
              </div>
              <StatePill state={p.state} />
              {recording && ["approved", "checkedIn", "noShow"].includes(p.state) && (
                <button type="button" disabled={busy} onClick={() => onAttended(p.memberId, true)}
                  className="text-xs rounded-full py-1 px-3 border border-brand-green bg-white text-brand-green cursor-pointer">
                  {t("participantsCame")}
                </button>
              )}
              {recording && p.state === "attended" && (
                <button type="button" disabled={busy} onClick={() => onAttended(p.memberId, false)}
                  className="text-xs rounded-full py-1 px-3 border border-gray-300 bg-white text-gray-600 cursor-pointer">
                  {t("participantsUndo")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {notice && <p className="m-0 mt-2 text-sm" role="status">{notice}</p>}
      {recording && <p className="m-0 mt-2 text-xs text-gray-500">{t("participantsHint")}</p>}
    </Card>
  );
};

ParticipantList.propTypes = {
  // Without registration nobody signs up, which is said rather than "nobody yet".
  takesRegistrations: PropTypes.bool,
  participants: PropTypes.array,
  attendance: PropTypes.object,
  busy: PropTypes.bool,
  onAttended: PropTypes.func,
  onClose: PropTypes.func,
  certificateGrant: PropTypes.shape({ onAttendance: PropTypes.bool, mayCertify: PropTypes.bool, noCertifierHost: PropTypes.bool }),
  notice: PropTypes.string,
};

export default ParticipantList;
