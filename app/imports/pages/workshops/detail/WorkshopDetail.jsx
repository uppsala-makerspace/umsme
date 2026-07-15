import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  UsersIcon,
  HashtagIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Markdown from "../../../components/Markdown";
import BackLink from "../../certificates/components/BackLink";
import { localized } from "/imports/common/lib/groupRules";
import { getSlackChannelUrl } from "/imports/utils/slack";
import WorkshopStatusBadge from "../components/WorkshopStatusBadge";

// One tile in the 2-per-row card grid: an icon, a title, an optional second
// line, and an internal or external link target. External web links get an
// open-in-new indicator, matching the guides button on the home page.
const InfoCard = ({ to, href, Icon, title, subtitle }) => {
  const external = !!href && href.startsWith("http");
  const content = (
    <>
      <Icon className="w-6 h-6 flex-shrink-0 text-gray-500" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block font-semibold leading-snug">{title}</span>
        {subtitle && <span className="block text-xs text-gray-500 mt-1 truncate">{subtitle}</span>}
      </span>
      {external && (
        <ArrowTopRightOnSquareIcon
          className="w-4 h-4 flex-shrink-0 ml-auto text-gray-500"
          aria-hidden="true"
        />
      )}
    </>
  );
  const className =
    "flex items-center gap-3 p-4 rounded-lg bg-white border border-gray-200 no-underline text-inherit hover:bg-gray-50";
  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }
  return <div className={className}>{content}</div>;
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
        <BackLink to="/workshops">{t("workshops")}</BackLink>
        <p className="text-center text-red-600 p-8">{error || t("noWorkshops")}</p>
      </MainContent>
    );
  }

  const { workshop, group, certificates } = data;
  const slackUrl = workshop.slackChannel
    ? getSlackChannelUrl(workshop.slackChannel, slackTeam, slackChannelIds)
    : undefined;
  const memberCountText = group
    ? `${group.memberCount} ${group.memberCount === 1 ? t("memberSingular") : t("memberPlural")}`
    : "";

  return (
    <MainContent topPadding={false}>
      <BackLink to="/workshops">{t("workshops")}</BackLink>

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
      </div>

      {localized(workshop.description, lang) && (
        <Markdown className="text-gray-700 mb-6" startLevel={3}>
          {localized(workshop.description, lang)}
        </Markdown>
      )}

      <section className="mb-6 grid grid-cols-2 gap-3">
        {group && (
          <InfoCard
            to={`/groups/${group._id}`}
            Icon={UsersIcon}
            title={t("groupTypeWorkshop")}
            subtitle={memberCountText}
          />
        )}
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
      </section>

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
