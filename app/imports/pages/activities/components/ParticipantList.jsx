import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { localized } from "/imports/common/lib/groupRules";
import { StatePill } from "./RegistrationBox";
import Card from "./Card";

const pillButton = "text-xs rounded-full py-1 px-3 border bg-white cursor-pointer";

/**
 * Adding one who came without a seat: a search by membership number (or name,
 * `byName`, for board and admin), and the members found, each to add.
 */
const AddAttendee = ({ byName, busy, onFind, onAdd }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState(null);
  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setFound(await onFind(query.trim()));
  };
  const add = async (memberId) => {
    await onAdd(memberId);
    setFound(null);
    setQuery("");
  };
  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <form onSubmit={search} className="flex gap-2">
        <input
          aria-label={t("participantsAddSearch")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          inputMode={byName ? "text" : "numeric"}
          placeholder={t(byName ? "participantsAddByNumberOrName" : "participantsAddByNumber")}
          className="flex-1 min-w-0 bg-white border border-gray-300 rounded py-1.5 px-2 text-sm"
        />
        <button type="submit" disabled={busy} className={`${pillButton} border-brand-green text-brand-green`}>
          {t("participantsAddSearch")}
        </button>
      </form>
      {found && found.length === 0 && <p className="m-0 mt-2 text-sm text-gray-500">{t("participantsAddNone")}</p>}
      {found && found.length > 0 && (
        <ul className="list-none p-0 m-0 mt-2">
          {found.map((m) => (
            <li key={m._id} className="flex items-center gap-2 py-1">
              <span className="flex-1 min-w-0 text-sm">{m.name} <span className="text-gray-500">#{m.mid}</span></span>
              <button type="button" disabled={busy} onClick={() => add(m._id)} className={`${pillButton} border-brand-green text-brand-green`}>
                {t("participantsAddCame")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

AddAttendee.propTypes = {
  byName: PropTypes.bool,
  busy: PropTypes.bool,
  onFind: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
};

/**
 * The event's participants, for those who keep it: who has a seat or queues,
 * and once it has started, who came, with a button each, a search to add one
 * who came without a seat, and one to close it. With a certificate the event
 * gives (`certificate`), who holds it or has asked for it, and for a host who
 * may certify it a button to give it to one who came; a warning when none of
 * the hosts may; and `notice`, what became of the last one given.
 */
const ParticipantList = ({
  participants, attendance, takesRegistrations = true, busy, onAttended, onClose,
  certificate = null, notice = null, onGiveCertificate, onFindMembers, onAddAttendee,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  if (!participants) return null;
  const recording = attendance?.open;
  // Below the name: the certificate held, linked; else, to one who came, a
  // button to give it (for a host who may); a request is said beside it.
  const certificateLine = (p) => {
    if (!certificate) return null;
    if (p.certificate === "held") {
      return (
        <Link to={`/certificates/${certificate._id}`} className="text-xs text-green-700 no-underline hover:underline">
          {t("participantsCertificateLink", { name: localized(certificate.name, lang) })} &rarr;
        </Link>
      );
    }
    const give = certificate.mayCertify && p.state === "attended" && (
      <button type="button" disabled={busy} onClick={() => onGiveCertificate(p.memberId)}
        className={`${pillButton} border-green-700 text-green-800`}>
        {t("participantsGiveCertificate")}
      </button>
    );
    const asked = p.certificate === "pending" && (certificate.mayCertify ? (
      <Link to={`/certifier-requests/${p.requestId}`} className="text-xs font-semibold text-red-700 no-underline hover:underline">
        {t("participantsAskedForCertificate")} &rarr;
      </Link>
    ) : <span className="text-xs text-gray-500">{t("participantsAskedForCertificate")}</span>);
    return give || asked ? <>{give}{asked}</> : null;
  };
  // Last on the row: marking one as come, or taking it back.
  const attendanceButton = (p) => {
    if (!recording) return null;
    if (["approved", "checkedIn", "noShow"].includes(p.state)) {
      return (
        <button type="button" disabled={busy} onClick={() => onAttended(p.memberId, true)}
          className={`${pillButton} border-brand-green text-brand-green`}>
          {t("participantsCame")}
        </button>
      );
    }
    if (p.state === "attended") {
      return (
        <button type="button" disabled={busy} onClick={() => onAttended(p.memberId, false)}
          className={`${pillButton} border-gray-300 text-gray-600`}>
          {t("participantsUndo")}
        </button>
      );
    }
    return null;
  };
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
      {certificate?.noCertifierHost && (
        <p className="m-0 mb-2 text-sm rounded bg-amber-50 border border-amber-200 text-amber-900 p-2">{t("participantsNoCertifierHost")}</p>
      )}
      {participants.length === 0 ? (
        <p className="text-gray-500 m-0">{t(takesRegistrations ? "participantsNone" : "participantsNoRegistration")}</p>
      ) : (
        <ul className="list-none p-0 m-0">
          {participants.map((p) => {
            const below = certificateLine(p);
            const button = attendanceButton(p);
            return (
              <li key={p.memberId} className="py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="flex-1 min-w-0">{p.name}</span>
                  <StatePill state={p.state} />
                </div>
                {p.info && <span className="block text-xs text-gray-500">{p.info}</span>}
                {(below || button) && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">{below}</div>
                    {button}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {notice && <p className="m-0 mt-2 text-sm" role="status">{notice}</p>}
      {recording && onFindMembers && (
        <AddAttendee byName={!!attendance.searchByName} busy={busy} onFind={onFindMembers} onAdd={onAddAttendee} />
      )}
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
  certificate: PropTypes.shape({ _id: PropTypes.string, name: PropTypes.object, mayCertify: PropTypes.bool, noCertifierHost: PropTypes.bool }),
  notice: PropTypes.string,
  onGiveCertificate: PropTypes.func,
  onFindMembers: PropTypes.func,
  onAddAttendee: PropTypes.func,
};

export default ParticipantList;
