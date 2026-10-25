import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { localized } from "/imports/common/lib/groupRules";
import { getSlackChannelUrl } from "/imports/utils/slack";

/**
 * What there is to know about an activity or an event, as short lines:
 * group, category, where, how long, the cost, who it is for, and whom to ask.
 */
const Facts = ({ item, slackTeam, slackChannelIds }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const rows = [
    [t("activityFieldGroup"), item.groupId
      ? <Link to={`/groups/${item.groupId}`} className="text-brand-green no-underline hover:underline">{localized(item.groupName, lang)}</Link>
      : t("activityAssociation")],
    item.categoryName && [t("activityFieldCategory"), localized(item.categoryName, lang)],
    item.workshopId && [t("activityFactWorkshop"),
      <Link to={`/workshops/${item.workshopId}`} className="text-brand-green no-underline hover:underline">{localized(item.workshopName, lang)}</Link>],
    item.spaceName && [t("activityFieldSpace"), localized(item.spaceName, lang)],
    item.durationMinutes && [t("activityFactDuration"), t("activityDuration", { minutes: item.durationMinutes })],
    [t("activityFactCost"), item.cost ? t("activityCost", { cost: item.cost }) : t("activityFree")],
    [t("activityFactWho"), item.membersOnly ? t("activityMembersOnly") : t("activityOpenToAll")],
    item.slackChannel && [t("activityFieldSlack"),
      <a href={getSlackChannelUrl(item.slackChannel, slackTeam, slackChannelIds)} className="text-brand-green no-underline hover:underline">
        #{item.slackChannel.replace(/^#/, "")}
      </a>],
    item.contactEmail && [t("activityContact"),
      <a href={`mailto:${item.contactEmail}`} className="text-brand-green no-underline hover:underline">{item.contactEmail}</a>],
  ].filter(Boolean);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm mb-6">
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt className="text-gray-500">{label}</dt>
          <dd className="m-0">{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
};

Facts.propTypes = {
  item: PropTypes.object.isRequired,
  slackTeam: PropTypes.string,
  slackChannelIds: PropTypes.object,
};

export default Facts;
