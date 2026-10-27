import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Markdown from "../../../components/Markdown";
import { localized } from "/imports/common/lib/groupRules";
import Facts from "../components/Facts";
import Card from "../components/Card";
import RegistrationBox from "../components/RegistrationBox";
import ParticipantList from "../components/ParticipantList";
import { eventWhen } from "../components/format";
import { icsDataUrl } from "../components/ics";

/** One event: when, what, who hosts it, and the activity it is of. */
const EventDetail = ({
  loading, error, data, slackTeam, slackChannelIds,
  busy, actionError, attendanceNotice, onGiveCertificate, onFindMembers, onAddAttendee, onRegister, onWithdraw, onTakeSeat, onCheckIn, onAttended, onCloseAttendance,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }
  if (error || !data?.event) {
    return (
      <MainContent>
        <p className="text-center text-red-600 p-8">{error || t("activitiesNoUpcoming")}</p>
      </MainContent>
    );
  }

  const { event, hosts, activityName, canEdit } = data;
  const cancelled = event.status === "cancelled";
  const ahead = new Date(event.end || event.start) > new Date();
  const name = localized(event.name, lang);
  return (
    <MainContent>
      {event.imageUrl && (
        <img src={event.imageUrl} alt={name} className="w-full max-h-64 object-cover rounded-lg mb-4" />
      )}
      <div className="flex items-center gap-3 mb-1">
        <h2 className={`text-2xl m-0 ${cancelled ? "line-through text-gray-500" : ""}`}>{name}</h2>
        {canEdit && (
          <Link to={`/events/${event._id}/edit`} className="flex-shrink-0 ml-auto text-sm font-semibold text-brand-green no-underline hover:underline">
            {t("edit")}
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3 mb-3">
        <p className="m-0 font-semibold">
          {eventWhen(event, lang)}
          {cancelled && (
            <span className="ml-2 text-xs font-semibold rounded-full py-0.5 px-2 bg-red-100 text-red-800">{t("eventCancelled")}</span>
          )}
        </p>
        {!cancelled && ahead && (
          <a
            href={icsDataUrl(event, lang, { url: `${window.location.origin}/events/${event._id}` })}
            download={`${name || "event"}.ics`}
            className="flex-shrink-0 ml-auto flex items-center gap-1 text-sm text-gray-500 no-underline hover:text-brand-green"
          >
            <CalendarDaysIcon className="w-[18px] h-[18px]" aria-hidden="true" />
            {t("addToCalendar")}
          </a>
        )}
      </div>
      {!cancelled && (
        <RegistrationBox
          registration={data.registration} busy={busy} error={actionError}
          onRegister={onRegister} onWithdraw={onWithdraw} onTakeSeat={onTakeSeat} onCheckIn={onCheckIn}
        />
      )}
      {localized(event.description, lang) && (
        <Markdown className="text-gray-700 mb-4" startLevel={3}>{localized(event.description, lang)}</Markdown>
      )}
      <Facts item={event} kind="event" slackTeam={slackTeam} slackChannelIds={slackChannelIds} />
      <Card title={t("eventHosts")} kind="event">
        {hosts.length === 0
          ? <p className="text-gray-500 m-0">{t("eventNoHosts")}</p>
          : <p className="m-0">{hosts.map((h) => h.name).join(", ")}</p>}
      </Card>
      <ParticipantList
        participants={data.participants} attendance={data.attendance} takesRegistrations={!!data.registration} busy={busy}
        certificate={data.certificate} notice={attendanceNotice}
        onGiveCertificate={onGiveCertificate} onFindMembers={onFindMembers} onAddAttendee={onAddAttendee}
        onAttended={onAttended} onClose={onCloseAttendance}
      />
      {event.activityId && activityName && (
        <Card title={t("eventOf")} kind="activity">
          <Link to={`/activities/${event.activityId}`} className="flex justify-between items-center no-underline text-inherit">
            <span className="font-semibold leading-snug">{localized(activityName, lang)}</span>
            <span className="text-gray-400 text-xl ml-2">&rarr;</span>
          </Link>
        </Card>
      )}
    </MainContent>
  );
};

EventDetail.propTypes = {
  busy: PropTypes.bool,
  actionError: PropTypes.string,
  attendanceNotice: PropTypes.string,
  onGiveCertificate: PropTypes.func,
  onFindMembers: PropTypes.func,
  onAddAttendee: PropTypes.func,
  onRegister: PropTypes.func,
  onWithdraw: PropTypes.func,
  onTakeSeat: PropTypes.func,
  onCheckIn: PropTypes.func,
  onAttended: PropTypes.func,
  onCloseAttendance: PropTypes.func,
  loading: PropTypes.bool,
  error: PropTypes.string,
  data: PropTypes.object,
  slackTeam: PropTypes.string,
  slackChannelIds: PropTypes.object,
};

export default EventDetail;
