import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Markdown from "../../../components/Markdown";
import { localized } from "/imports/common/lib/groupRules";
import Facts from "../components/Facts";
import { eventWhen } from "../components/format";

/** One event: when, what, who hosts it, and the activity it is of. */
const EventDetail = ({ loading, error, data, slackTeam, slackChannelIds }) => {
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
  return (
    <MainContent>
      {event.imageUrl && (
        <img src={event.imageUrl} alt={localized(event.name, lang)} className="w-full max-h-64 object-cover rounded-lg mb-4" />
      )}
      <div className="flex items-center gap-3 mb-1">
        <h2 className={`text-2xl m-0 ${cancelled ? "line-through text-gray-500" : ""}`}>{localized(event.name, lang)}</h2>
        {canEdit && (
          <Link to={`/events/${event._id}/edit`} className="flex-shrink-0 ml-auto text-sm font-semibold text-brand-green no-underline hover:underline">
            {t("edit")}
          </Link>
        )}
      </div>
      <p className="m-0 mb-3 font-semibold">
        {eventWhen(event, lang)}
        {cancelled && (
          <span className="ml-2 text-xs font-semibold rounded-full py-0.5 px-2 bg-red-100 text-red-800">{t("eventCancelled")}</span>
        )}
      </p>
      {localized(event.description, lang) && (
        <Markdown className="text-gray-700 mb-4" startLevel={3}>{localized(event.description, lang)}</Markdown>
      )}
      <Facts item={event} slackTeam={slackTeam} slackChannelIds={slackChannelIds} />
      <section className="mb-6">
        <h3 className="text-lg mb-2 text-gray-700 border-b border-gray-200 pb-2">{t("eventHosts")}</h3>
        {hosts.length === 0
          ? <p className="text-gray-500">{t("eventNoHosts")}</p>
          : <p className="m-0">{hosts.map((h) => h.name).join(", ")}</p>}
      </section>
      {event.activityId && activityName && (
        <Link
          to={`/activities/${event.activityId}`}
          className="flex justify-between items-center p-3 mb-6 rounded-lg bg-white border border-gray-200 no-underline text-inherit hover:bg-gray-50"
        >
          <div className="flex-1 min-w-0">
            <span className="block text-xs text-gray-500">{t("eventOf")}</span>
            <span className="block font-semibold leading-snug">{localized(activityName, lang)}</span>
          </div>
          <span className="text-gray-400 text-xl ml-2">&rarr;</span>
        </Link>
      )}
    </MainContent>
  );
};

EventDetail.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  data: PropTypes.object,
  slackTeam: PropTypes.string,
  slackChannelIds: PropTypes.object,
};

export default EventDetail;
