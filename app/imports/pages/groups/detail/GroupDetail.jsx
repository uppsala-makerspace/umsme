import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HashtagIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Markdown from "../../../components/Markdown";
import InfoCard from "../../../components/InfoCard";
import SpaceMapSection from "../../../components/SpaceMapSection";
import { localized } from "/imports/common/lib/groupRules";
import { getSlackChannelUrl } from "/imports/utils/slack";

const typeLabelKeys = {
  workshop: "groupTypeWorkshop",
  function: "groupTypeFunction",
  interest: "groupTypeInterest",
  responsibility: "groupTypeResponsibility",
};

const GroupDetail = ({
  loading,
  error,
  actionError,
  data,
  slackTeam,
  slackChannelIds,
  onJoin,
  onLeave,
  onApprove,
  onReject,
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

  if (error || !data?.group) {
    return (
      <MainContent>
        <p className="text-center text-red-600 p-8">{error || t("noGroups")}</p>
      </MainContent>
    );
  }

  const {
    group,
    members,
    responsibleName,
    parentGroup,
    childGroups,
    workshop,
    canSeeMembers,
    canJoin,
    canApprove,
    pendingRequests,
    mapView,
  } = data;

  const slackUrl = group.slackChannel
    ? getSlackChannelUrl(group.slackChannel, slackTeam, slackChannelIds)
    : undefined;

  const joinLabel = group.joinPolicy === "open" ? t("joinGroup") : t("requestJoinGroup");

  return (
    <MainContent>

      {group.imageUrl && (
        <img
          src={group.imageUrl}
          alt={localized(group.name, lang)}
          className="w-full max-h-64 object-cover rounded-lg mb-4"
        />
      )}

      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-2xl m-0">{localized(group.name, lang)}</h2>
      </div>
      <p className="text-sm text-gray-500 mt-0 mb-4">
        {t(typeLabelKeys[group.type] || group.type)}
        {parentGroup && (
          <>
            {" · "}
            {t("partOfGroup")}{" "}
            <Link to={`/groups/${parentGroup._id}`} className="text-brand-green no-underline hover:underline">
              {localized(parentGroup.name, lang)}
            </Link>
          </>
        )}
      </p>

      {localized(group.description, lang) && (
        <Markdown className="text-gray-700 mb-6" startLevel={3}>
          {localized(group.description, lang)}
        </Markdown>
      )}

      {actionError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {actionError}
        </div>
      )}

      {/* Own membership actions. The join button is disabled without an
          active makerspace membership (the server enforces the same rule). */}
      <section className="mb-6">
        {group.myState === null && (
          <button
            onClick={onJoin}
            disabled={!canJoin}
            className={`w-full py-3 px-4 rounded-lg font-semibold border-none ${
              canJoin
                ? "bg-brand-green text-white cursor-pointer hover:opacity-90"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {joinLabel}
          </button>
        )}
        {group.myState === "pending" && (
          <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 border border-amber-200">
            <span className="text-amber-800 text-sm">{t("pendingApproval")}</span>
            <button
              onClick={onLeave}
              className="text-sm text-red-600 bg-transparent border-none cursor-pointer hover:underline"
            >
              {t("withdrawRequest")}
            </button>
          </div>
        )}
        {group.myState === "active" && !group.myIsResponsible && (
          <button
            onClick={onLeave}
            className="w-full py-2 px-4 rounded-lg bg-white text-red-600 border border-red-300 cursor-pointer hover:bg-red-50"
          >
            {t("leaveGroup")}
          </button>
        )}
        {group.myIsResponsible && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
            {t("youAreResponsible")}
          </div>
        )}
      </section>

      {/* Space icons + cards on the left, mini map on the right — the same
          shared section as the workshop page. */}
      {(workshop || group.slackChannel || mapView) && (
        <SpaceMapSection mapView={mapView}>
          {workshop && (
            <InfoCard
              to={`/workshops/${workshop._id}`}
              Icon={WrenchScrewdriverIcon}
              title={t("workshop")}
              subtitle={localized(workshop.name, lang)}
            />
          )}
          {group.slackChannel && (
            <InfoCard
              href={slackUrl}
              Icon={HashtagIcon}
              title={t("slackChannel")}
              subtitle={`#${group.slackChannel}`}
            />
          )}
        </SpaceMapSection>
      )}

      {/* Pending requests (approvers only) */}
      {canApprove && pendingRequests.length > 0 && (
        <section className="mb-6">
          <h3 className="text-lg mb-2 text-gray-700 border-b border-gray-200 pb-2">
            {t("pendingRequests")}
          </h3>
          <ul className="list-none p-0 m-0">
            {pendingRequests.map((req) => (
              <li
                key={req.memberId}
                className="flex justify-between items-center p-3 mb-2 rounded-lg bg-white border border-gray-200"
              >
                <span className="font-semibold">{req.name}</span>
                <span className="flex gap-3">
                  <button
                    onClick={() => onApprove(req.memberId)}
                    className="text-sm font-semibold text-brand-green bg-transparent border-none cursor-pointer hover:underline"
                  >
                    {t("approve")}
                  </button>
                  <button
                    onClick={() => onReject(req.memberId)}
                    className="text-sm text-red-600 bg-transparent border-none cursor-pointer hover:underline"
                  >
                    {t("reject")}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Info */}
      <section className="mb-6">
        <ul className="list-none p-0 m-0 space-y-2 text-sm">
          {responsibleName && (
            <li>
              <span className="text-gray-500">{t("groupResponsible")}:</span>{" "}
              <span className="font-semibold">{responsibleName}</span>
            </li>
          )}
          {group.responsibleSpace && (
            <li>
              <span className="text-gray-500">{t("responsibleSpace")}:</span>{" "}
              {group.responsibleSpace}
            </li>
          )}
        </ul>
      </section>

      {/* Members: the list is only shown to active makerspace members that
          have joined the group (the server withholds the names otherwise);
          the count and the group responsible's name are public. */}
      <section className="mb-6">
        <h3 className="text-lg mb-2 text-gray-700 border-b border-gray-200 pb-2">
          {t("groupMembers")} ({group.memberCount})
        </h3>
        {!canSeeMembers ? (
          <p className="text-center text-gray-500 p-4 italic">{t("membersHidden")}</p>
        ) : members.length === 0 ? (
          <p className="text-center text-gray-500 p-4 italic">{t("noGroupMembers")}</p>
        ) : (
          <ul className="list-none p-0 m-0">
            {members.map((member) => (
              <li key={member.memberId} className="flex items-center gap-2 py-2 border-b border-gray-100">
                <span>{member.name}</span>
                {member.isResponsible && (
                  <span className="inline-block text-xs font-semibold rounded-full py-0.5 px-2 bg-green-100 text-green-800">
                    {t("groupResponsible")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Responsibility subgroups */}
      {childGroups.length > 0 && (
        <section className="mb-6">
          <h3 className="text-lg mb-2 text-gray-700 border-b border-gray-200 pb-2">
            {t("groupsSectionResponsibility")}
          </h3>
          <ul className="list-none p-0 m-0">
            {childGroups.map((child) => (
              <li key={child._id} className="mb-2">
                <Link
                  to={`/groups/${child._id}`}
                  className="flex justify-between items-center p-3 rounded-lg bg-white border border-gray-200 no-underline text-inherit hover:bg-gray-50"
                >
                  <span className="font-semibold">{localized(child.name, lang)}</span>
                  <span className="text-gray-400 text-xl ml-2">&rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </MainContent>
  );
};

GroupDetail.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  actionError: PropTypes.string,
  data: PropTypes.object,
  slackTeam: PropTypes.string,
  slackChannelIds: PropTypes.object,
  onJoin: PropTypes.func,
  onLeave: PropTypes.func,
  onApprove: PropTypes.func,
  onReject: PropTypes.func,
};

GroupDetail.defaultProps = {
  loading: false,
  error: null,
  actionError: null,
  data: null,
  slackTeam: undefined,
  slackChannelIds: null,
  onJoin: () => {},
  onLeave: () => {},
  onApprove: () => {},
  onReject: () => {},
};

export default GroupDetail;
