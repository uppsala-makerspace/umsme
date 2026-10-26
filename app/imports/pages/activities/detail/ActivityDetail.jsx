import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Markdown from "../../../components/Markdown";
import { localized } from "/imports/common/lib/groupRules";
import EventRow from "../components/EventRow";
import Facts from "../components/Facts";
import Card from "../components/Card";

/** One activity: what it is, and the times it happens next. */
const ActivityDetail = ({ loading, error, data, slackTeam, slackChannelIds, busy, onInterest }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }
  if (error || !data?.activity) {
    return (
      <MainContent>
        <p className="text-center text-red-600 p-8">{error || t("activitiesNone")}</p>
      </MainContent>
    );
  }

  const { activity, events, canEdit, canBook } = data;
  return (
    <MainContent>
      {activity.imageUrl && (
        <img src={activity.imageUrl} alt={localized(activity.name, lang)} className="w-full max-h-64 object-cover rounded-lg mb-4" />
      )}
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl m-0">{localized(activity.name, lang)}</h2>
        {canEdit && (
          <Link to={`/activities/${activity._id}/edit`} className="flex-shrink-0 ml-auto text-sm font-semibold text-brand-green no-underline hover:underline">
            {t("edit")}
          </Link>
        )}
      </div>
      {localized(activity.description, lang) && (
        <Markdown className="text-gray-700 mb-4" startLevel={3}>{localized(activity.description, lang)}</Markdown>
      )}
      <Facts item={activity} kind="activity" slackTeam={slackTeam} slackChannelIds={slackChannelIds} />
      <Card
        title={t("activityUpcomingEvents")} kind="activity"
        actions={canBook && (
          <Link to={`/events/new?activity=${activity._id}`} className="text-sm font-semibold text-brand-green no-underline hover:underline">
            + {t("eventAdd")}
          </Link>
        )}
      >
        {events.length === 0 ? (
          <p className="text-gray-500 m-0">{t("activityNoUpcomingEvents")}</p>
        ) : (
          <ul className="list-none p-0 m-0">
            {events.map((event) => <EventRow key={event._id} event={event} />)}
          </ul>
        )}
      </Card>
      {onInterest && (
        <Card title={t("activityInterestHeading")} kind="activity">
          <div className="flex items-center gap-3">
            <p className="m-0 flex-1 text-sm">
              {data.interested ? t("activityInterested") : t("activityInterestQuestion")}
              {data.interestCount > 0 && <span className="block text-xs text-gray-500">{t("activityInterestCount", { count: data.interestCount })}</span>}
            </p>
            <button type="button" disabled={busy} aria-pressed={!!data.interested} onClick={() => onInterest(!data.interested)}
              className={`text-sm rounded-full py-1 px-3 border cursor-pointer ${data.interested ? "bg-brand-green text-white border-brand-green" : "bg-white text-gray-700 border-gray-300"}`}>
              {t(data.interested ? "activityNotInterested" : "activityInterest")}
            </button>
          </div>
        </Card>
      )}
    </MainContent>
  );
};

ActivityDetail.propTypes = {
  busy: PropTypes.bool,
  onInterest: PropTypes.func,
  loading: PropTypes.bool,
  error: PropTypes.string,
  data: PropTypes.object,
  slackTeam: PropTypes.string,
  slackChannelIds: PropTypes.object,
};

export default ActivityDetail;
