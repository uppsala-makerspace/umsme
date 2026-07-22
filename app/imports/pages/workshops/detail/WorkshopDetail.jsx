import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HashtagIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Markdown from "../../../components/Markdown";
import InfoCard from "../../../components/InfoCard";
import GroupTypeTag from "../../../components/GroupTypeTag";
import SpaceMapSection from "../../../components/SpaceMapSection";
import { localized } from "/imports/common/lib/groupRules";
import { getSlackChannelUrl } from "/imports/utils/slack";
import WorkshopStatusBadge from "../components/WorkshopStatusBadge";

// One group row in the "get involved" / "related groups" lists, in the same
// style as the groups list page. The responsible workshop group is rendered
// highlighted with a green accent since it is the central one. All rows show
// the shared group-type tag.
const GroupRow = ({ group, highlighted }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  return (
    <li
      className={`mb-3 rounded-lg border border-gray-200 ${
        highlighted ? "border-l-4 border-l-[#5fc86f] bg-green-50" : "bg-white"
      }`}
    >
      <Link
        to={`/groups/${group._id}`}
        className="flex justify-between items-center p-4 no-underline text-inherit transition-colors hover:bg-gray-50"
      >
        <div className="flex-1">
          <span className="flex items-center gap-2 font-semibold leading-snug">
            {localized(group.name, lang)}
            <GroupTypeTag type={group.type} />
            {group.myState === "active" && (
              <span className="inline-block text-xs font-semibold rounded-full py-0.5 px-2 bg-green-100 text-green-800">
                {t("memberChip")}
              </span>
            )}
            {group.myState === "pending" && (
              <span className="inline-block text-xs font-semibold rounded-full py-0.5 px-2 bg-amber-100 text-amber-800">
                {t("pendingChip")}
              </span>
            )}
          </span>
          <span className="block text-xs text-gray-500 mt-0.5">
            {group.memberCount}{" "}
            {group.memberCount === 1 ? t("memberSingular") : t("memberPlural")}
          </span>
        </div>
        <span className="text-gray-400 text-xl ml-2">&rarr;</span>
      </Link>
    </li>
  );
};

const WorkshopDetail = ({ loading, error, data, slackTeam, slackChannelIds }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (error || !data?.workshop) {
    return (
      <MainContent>
        <p className="text-center text-red-600 p-8">{error || t("noWorkshops")}</p>
      </MainContent>
    );
  }

  const {
    workshop,
    group,
    responsibilityGroups = [],
    relatedGroups = [],
    certificates,
    mapView,
    canEdit,
  } = data;
  const slackUrl = workshop.slackChannel
    ? getSlackChannelUrl(workshop.slackChannel, slackTeam, slackChannelIds)
    : undefined;
  return (
    <MainContent>

      {workshop.imageUrl && (
        <img
          src={workshop.imageUrl}
          alt={localized(workshop.name, lang)}
          className="w-full max-h-64 object-cover rounded-lg mb-4"
        />
      )}

      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl m-0">{localized(workshop.name, lang)}</h2>
        <WorkshopStatusBadge status={workshop.status} />
        {canEdit && (
          <Link
            to={`/workshops/${workshop._id}/edit`}
            className="flex-shrink-0 ml-auto text-sm font-semibold text-brand-green no-underline hover:underline"
          >
            {t("edit")}
          </Link>
        )}
      </div>

      {localized(workshop.description, lang) && (
        <Markdown className="text-gray-700 mb-6" startLevel={3}>
          {localized(workshop.description, lang)}
        </Markdown>
      )}

      {/* Space icons + stacked cards on the left, a mini map with the
          workshop's spaces highlighted on the right. */}
      <SpaceMapSection mapView={mapView}>
        {workshop.slackChannel && (
          <InfoCard
            href={slackUrl}
            Icon={HashtagIcon}
            title={t("slackChannel")}
            subtitle={`#${workshop.slackChannel}`}
          />
        )}
        <InfoCard to="/tool" Icon={MagnifyingGlassIcon} title={t("viewTools")} />
        {workshop.guidesUrl && (
          <InfoCard href={workshop.guidesUrl} Icon={BookOpenIcon} title={t("tutorials")} />
        )}
      </SpaceMapSection>

      {certificates.length > 0 && (
        <section className="mb-6">
          <h3 className="text-lg mb-2 text-gray-700 border-b border-gray-200 pb-2">
            {t("workshopCertificates")}
          </h3>
          <ul className="list-none p-0 m-0">
            {certificates.map((cert) => (
              <li key={cert._id} className="mb-2">
                <Link
                  to={`/certificates/${cert._id}`}
                  className="flex justify-between items-center p-3 rounded-lg bg-white border border-gray-200 no-underline text-inherit hover:bg-gray-50"
                >
                  <span className="font-semibold">{localized(cert.name, lang)}</span>
                  <span className="text-gray-400 text-xl ml-2">&rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {group && (
        <section className="mb-6">
          <h3 className="text-lg mb-2 text-gray-700 border-b border-gray-200 pb-2">
            {t("engageInWorkshop")}
          </h3>
          <ul className="list-none p-0 m-0">
            <GroupRow group={group} highlighted />
            {responsibilityGroups.map((subGroup) => (
              <GroupRow key={subGroup._id} group={subGroup} />
            ))}
          </ul>
        </section>
      )}

      {relatedGroups.length > 0 && (
        <section className="mb-6">
          <h3 className="text-lg mb-2 text-gray-700 border-b border-gray-200 pb-2">
            {t("relatedGroups")}
          </h3>
          <ul className="list-none p-0 m-0">
            {relatedGroups.map((relatedGroup) => (
              <GroupRow key={relatedGroup._id} group={relatedGroup} />
            ))}
          </ul>
        </section>
      )}
    </MainContent>
  );
};

WorkshopDetail.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  data: PropTypes.object,
  slackTeam: PropTypes.string,
  slackChannelIds: PropTypes.object,
};

WorkshopDetail.defaultProps = {
  loading: false,
  error: null,
  data: null,
  slackTeam: undefined,
  slackChannelIds: null,
};

export default WorkshopDetail;
