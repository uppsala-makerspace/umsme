import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HashtagIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  MapIcon,
} from "@heroicons/react/24/outline";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Markdown from "../../../components/Markdown";
import InfoCard from "../../../components/InfoCard";
import GroupTypeTag from "../../../components/GroupTypeTag";
import { localized } from "/imports/common/lib/groupRules";
import { getSlackChannelUrl } from "/imports/utils/slack";
import {
  SPACE_COLORS,
  spaceColorName,
  spaceMapUrl,
} from "/imports/utils/spaceColors";
import WorkshopStatusBadge from "../components/WorkshopStatusBadge";
import WorkshopMiniMap from "../components/WorkshopMiniMap";

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

// A colored card with the space's icon on top, echoing how the workshop's
// spaces look on the mini map. Links to the full map with the space selected
// and pulsing in the same color.
const SpaceIcon = ({ spaceId, iconUrl, color, colorName, className }) => (
  <Link
    to={spaceMapUrl(spaceId, colorName)}
    className={`flex items-center justify-center rounded-lg no-underline hover:opacity-80 ${className}`}
    style={{ backgroundColor: color }}
  >
    <img src={iconUrl} alt="" className="w-3/4 h-3/4 object-contain" />
  </Link>
);

// The workshop's space icons, primary first. One or two icons sit side by
// side at full size; with more, the primary goes on top and the secondaries
// share a row below at up to half the primary's size, shrinking further if
// needed to stay on one row.
const SpaceIcons = ({ spaces }) => {
  const [primary, ...secondaries] = spaces;
  if (spaces.length <= 2) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        {spaces.map((space) => (
          <SpaceIcon
            key={space.spaceId}
            spaceId={space.spaceId}
            iconUrl={space.iconUrl}
            color={space.color}
            colorName={space.colorName}
            className="w-28 h-28"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <SpaceIcon
        spaceId={primary.spaceId}
        iconUrl={primary.iconUrl}
        color={primary.color}
        colorName={primary.colorName}
        className="w-28 h-28"
      />
      <div className="flex justify-center gap-2 w-full">
        {secondaries.map((space) => (
          <SpaceIcon
            key={space.spaceId}
            spaceId={space.spaceId}
            iconUrl={space.iconUrl}
            color={space.color}
            colorName={space.colorName}
            className="w-14 h-14 min-w-0"
          />
        ))}
      </div>
    </div>
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
  } = data;
  const slackUrl = workshop.slackChannel
    ? getSlackChannelUrl(workshop.slackChannel, slackTeam, slackChannelIds)
    : undefined;
  // Primary space first (green), secondaries cycle through the palette; the
  // same color follows a space onto its icon card, the mini map and — via
  // the color name in the map URL — the full map's highlight pulse.
  const coloredSpaces = (mapView?.spaces || []).map((space, index) => ({
    ...space,
    colorName: spaceColorName(index),
    color: SPACE_COLORS[spaceColorName(index)],
  }));
  const spaceIcons = coloredSpaces.filter((space) => space.iconUrl);
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
      </div>

      {localized(workshop.description, lang) && (
        <Markdown className="text-gray-700 mb-6" startLevel={3}>
          {localized(workshop.description, lang)}
        </Markdown>
      )}

      {/* Three stacked cards on the left, a mini map with the workshop's
          spaces highlighted on the right (plain map card without spaces). */}
      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          {spaceIcons.length > 0 && <SpaceIcons spaces={spaceIcons} />}
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
        </div>
        {mapView ? (
          <WorkshopMiniMap
            floor={mapView.floor}
            spaces={coloredSpaces.filter((space) => space.onFloor)}
            primarySpaceId={mapView.primarySpaceId}
          />
        ) : (
          <InfoCard to="/map" Icon={MapIcon} title={t("navMap")} />
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
