import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapIcon } from "@heroicons/react/24/outline";
import InfoCard from "../InfoCard";
import FloorMap from "../FloorMap";
import {
  SPACE_COLORS,
  spaceColorName,
  spaceMapUrl,
} from "/imports/utils/spaceColors";

// A colored card with the space's icon on top, echoing how the entity's
// spaces look on the mini map. Links to the full map with the space selected
// and pulsing in the same color.
const SpaceIcon = ({ spaceId, iconUrl, color, colorName, floor, className }) => (
  <Link
    to={spaceMapUrl(spaceId, colorName, floor)}
    className={`flex items-center justify-center rounded-lg no-underline hover:opacity-80 ${className}`}
    style={{ backgroundColor: color }}
  >
    <img src={iconUrl} alt="" className="w-3/4 h-3/4 object-contain" />
  </Link>
);

// The entity's space icons, primary first. One or two icons sit side by side
// at full size; with more, the primary goes on top and the secondaries share
// a row below at up to half the primary's size, shrinking further if needed
// to stay on one row.
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
            floor={space.floor}
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
        floor={primary.floor}
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
            floor={space.floor}
            className="w-14 h-14 min-w-0"
          />
        ))}
      </div>
    </div>
  );
};

/**
 * The map-integrated card section shared by the workshop and group pages:
 * space icons above the given cards on the left, a mini map of the linked
 * spaces on the right (or a plain map card when the entity has no primary
 * space). `mapView` comes from the server's spacesMapView helper.
 */
const SpaceMapSection = ({ mapView, children }) => {
  const { t } = useTranslation();
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
    <section className="mb-6 grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-3">
        {spaceIcons.length > 0 && <SpaceIcons spaces={spaceIcons} />}
        {children}
      </div>
      {mapView ? (
        <div className="relative rounded-lg bg-white border border-gray-200 overflow-hidden h-full min-h-[10rem]">
          <FloorMap
            mini={{ spaces: coloredSpaces, initialFloor: mapView.floor }}
          />
        </div>
      ) : (
        <InfoCard to="/map" Icon={MapIcon} title={t("navMap")} />
      )}
    </section>
  );
};

SpaceMapSection.propTypes = {
  mapView: PropTypes.shape({
    floor: PropTypes.string,
    primarySpaceId: PropTypes.string,
    spaces: PropTypes.arrayOf(
      PropTypes.shape({
        spaceId: PropTypes.string,
        floor: PropTypes.string,
        iconUrl: PropTypes.string,
      })
    ),
  }),
  children: PropTypes.node,
};

SpaceMapSection.defaultProps = {
  mapView: null,
  children: null,
};

export default SpaceMapSection;
