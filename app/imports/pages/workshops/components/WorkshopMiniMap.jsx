import React, { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const FLOOR_SUFFIX = "-floor";

/**
 * Small map preview on the workshop page: the floor plan with the workshop's
 * spaces filled green and every other space toned down in gray. Clicking a
 * highlighted space opens the full map with that space selected; clicking
 * anywhere else falls back to the primary space. Only one floor is shown
 * (the primary space's).
 */
const WorkshopMiniMap = ({ floor, spaceIds = [], primarySpaceId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const objectRef = useRef(null);

  const mapUrl = (spaceId) => `/map?space=${encodeURIComponent(spaceId)}`;

  const handleLoad = () => {
    const svgDoc = objectRef.current?.contentDocument;
    if (!svgDoc) return;
    // The raw floor SVG contains the clickable-marker circles used by the
    // full map; they are noise in a thumbnail.
    svgDoc.querySelectorAll('[id$="-marker"]').forEach((marker) => {
      marker.style.display = "none";
    });
    svgDoc.querySelectorAll(`[id$="${FLOOR_SUFFIX}"]`).forEach((floorEl) => {
      const spaceId = floorEl.id.slice(0, -FLOOR_SUFFIX.length);
      floorEl.style.fill = spaceIds.includes(spaceId) ? "#5fc86f" : "#e5e7eb";
    });
    // Clicks land inside the <object>'s own document and never reach the
    // surrounding Link, so navigation is wired up here instead.
    svgDoc.documentElement.style.cursor = "pointer";
    svgDoc.addEventListener("click", (event) => {
      const floorEl = event.target.closest?.(`[id$="${FLOOR_SUFFIX}"]`);
      const spaceId = floorEl?.id.slice(0, -FLOOR_SUFFIX.length);
      navigate(mapUrl(spaceIds.includes(spaceId) ? spaceId : primarySpaceId));
    });
  };

  return (
    <Link
      to={mapUrl(primarySpaceId)}
      aria-label={t("navMap")}
      className="relative block rounded-lg bg-white border border-gray-200 overflow-hidden h-full min-h-[10rem] no-underline hover:bg-gray-50"
    >
      {/* Absolutely positioned so the SVG's intrinsic size can't grow the
          grid row — the card stack on the left decides the height. The inner
          div (not the <object> itself) carries the insets, since absolutely
          positioned replaced elements ignore `bottom` and fall back to their
          intrinsic height. */}
      <div className="absolute inset-x-0 top-2 bottom-2">
        <object
          ref={objectRef}
          data={`/images/${floor}.svg`}
          type="image/svg+xml"
          aria-hidden="true"
          onLoad={handleLoad}
          className="w-full h-full"
        />
      </div>
    </Link>
  );
};

export default WorkshopMiniMap;
