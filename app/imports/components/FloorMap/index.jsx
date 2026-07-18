import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { spaceMapUrl } from "/imports/utils/spaceColors";
import RoomPopup from "./RoomPopup";
import "./floorMapStyle.css";

const FLOOR_SUFFIX = "-floor";

/**
 * The stacked two-floor map. Two modes:
 *
 * Full (the map page): rooms from roomsConfig are clickable and open the
 * room popup, markers/icons show, and ?space=/?color= drive the highlight
 * pulse.
 *
 * Mini (`mini` prop; workshop/group pages): only `mini.spaces` are filled in
 * their assigned colors, every other space is toned down in gray, no
 * markers/icons/popup. Clicking a highlighted space on the active floor
 * deep-links to the map page with that space selected (in its pulse color);
 * a gray space leads to the primary space. Clicking anywhere else switches
 * floors. The initial floor is the primary space's (`mini.initialFloor`).
 */
const FloorMap = ({
  slackTeam,
  roomsConfig,
  slackChannels,
  highlightedSpaceId,
  highlightedFloor = null,
  highlightColor = "#5fc86f",
  onSpaceSelected,
  mini = null,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeFloor, setActiveFloor] = useState(
    // Floor 2 on top by default; the mini map starts on the primary space's.
    mini?.initialFloor === "floor1" ? 1 : 2
  );
  const activeFloorRef = useRef(activeFloor); // Ref to access current floor in event handlers
  const floor1Ref = useRef(null);
  const floor2Ref = useRef(null);

  // Keep refs in sync with state/props (SVG click handlers are attached once
  // and must not close over stale values).
  useEffect(() => {
    activeFloorRef.current = activeFloor;
  }, [activeFloor]);
  const onSpaceSelectedRef = useRef(onSpaceSelected);
  useEffect(() => {
    onSpaceSelectedRef.current = onSpaceSelected;
  }, [onSpaceSelected]);
  const highlightedSpaceIdRef = useRef(highlightedSpaceId);
  useEffect(() => {
    highlightedSpaceIdRef.current = highlightedSpaceId;
  }, [highlightedSpaceId]);
  const highlightColorRef = useRef(highlightColor);
  useEffect(() => {
    highlightColorRef.current = highlightColor;
  }, [highlightColor]);
  const highlightedFloorRef = useRef(highlightedFloor);
  useEffect(() => {
    highlightedFloorRef.current = highlightedFloor;
  }, [highlightedFloor]);
  const miniRef = useRef(mini);
  useEffect(() => {
    miniRef.current = mini;
  }, [mini]);

  // Deep link (?space=<spaceId>&floor=<floorKey>): once the rooms config has
  // loaded, switch to the space's floor — ?floor= decides when present
  // (spaceId alone is ambiguous: e.g. "kitchen" exists on both floors),
  // otherwise the first floor that has the space. The space itself is
  // highlighted on the floor SVG (see applyHighlightForFloor) rather than
  // opening its popup. Only the initial URL switches floors — later clicks
  // update the URL themselves.
  const initialAppliedRef = useRef(false);
  useEffect(() => {
    if (!roomsConfig || !highlightedSpaceId || initialAppliedRef.current) return;
    initialAppliedRef.current = true;
    for (const [floorKey, rooms] of Object.entries(roomsConfig)) {
      if (highlightedFloor ? floorKey === highlightedFloor : rooms[highlightedSpaceId]) {
        setActiveFloor(floorKey === "floor1" ? 1 : 2);
        return;
      }
    }
  }, [roomsConfig, highlightedSpaceId, highlightedFloor]);

  // Mini mode: fill the entity's spaces in their colors, gray out the rest,
  // hide the markers, and wire clicks — a highlighted space on the active
  // floor deep-links to the map page with that space (its pulse color via
  // ?color=), a gray space deep-links to the primary space, and anything
  // else switches floors.
  const setupMiniFloor = (svgDoc, floorNumber) => {
    if (!svgDoc) return;
    const spaces = miniRef.current?.spaces || [];
    const bySpaceId = new Map(spaces.map((s) => [s.spaceId, s]));
    svgDoc.querySelectorAll('[id$="-marker"]').forEach((marker) => {
      marker.style.display = "none";
    });
    svgDoc.querySelectorAll(`[id$="${FLOOR_SUFFIX}"]`).forEach((floorEl) => {
      const spaceId = floorEl.id.slice(0, -FLOOR_SUFFIX.length);
      floorEl.style.fill = bySpaceId.get(spaceId)?.color || "#e5e7eb";
    });
    const svgRoot = svgDoc.documentElement;
    if (svgRoot.dataset.miniSetup) return;
    svgRoot.dataset.miniSetup = "true";
    svgRoot.style.cursor = "pointer";
    svgDoc.addEventListener("click", (event) => {
      const floorEl = event.target.closest?.(`[id$="${FLOOR_SUFFIX}"]`);
      if (activeFloorRef.current === floorNumber && floorEl) {
        const spaceId = floorEl.id.slice(0, -FLOOR_SUFFIX.length);
        const current = miniRef.current?.spaces || [];
        // Gray spaces lead to the primary space (always first in the list).
        const target =
          current.find((s) => s.spaceId === spaceId) || current[0];
        if (target) {
          navigate(spaceMapUrl(target.spaceId, target.colorName, target.floor));
        }
      } else {
        setActiveFloor((current) => (current === 1 ? 2 : 1));
      }
    });
  };

  // Place an icon overlay centered on a marker circle in the floor SVG.
  // Uses <image> with an external SVG href so the icon stays vector but is
  // sandboxed (its own styles don't bleed into the floor SVG).
  const placeIcon = (svgDoc, markerId, iconUrl, size = 120) => {
    const marker = svgDoc.getElementById(markerId);
    if (!marker || marker.dataset.iconPlaced) return;
    const cx = parseFloat(marker.getAttribute("cx"));
    const cy = parseFloat(marker.getAttribute("cy"));
    if (Number.isNaN(cx) || Number.isNaN(cy)) return;
    const ns = "http://www.w3.org/2000/svg";
    const img = svgDoc.createElementNS(ns, "image");
    img.setAttributeNS("http://www.w3.org/1999/xlink", "href", iconUrl);
    img.setAttribute("href", iconUrl);
    img.setAttribute("x", cx - size / 2);
    img.setAttribute("y", cy - size / 2);
    img.setAttribute("width", size);
    img.setAttribute("height", size);
    img.setAttribute("preserveAspectRatio", "xMidYMid meet");
    img.style.pointerEvents = "none";
    marker.parentNode.appendChild(img);
    marker.dataset.iconPlaced = "true";
    marker.style.display = "none";
  };

  // Setup click handlers for rooms after SVG loads
  const setupRoomClickHandlers = (svgDoc, floorKey, floorNumber) => {
    if (!svgDoc || !roomsConfig) return;

    // Add click handler on SVG root for floor switching
    const svgRoot = svgDoc.documentElement;
    if (svgRoot && !svgRoot.dataset.handlersSetup) {
      svgRoot.dataset.handlersSetup = "true";
      svgRoot.addEventListener("click", () => {
        setActiveFloor((current) => (current === 1 ? 2 : 1));
      });
    }

    const rooms = roomsConfig[floorKey] || {};

    Object.keys(rooms).forEach((roomId) => {
      const marker = svgDoc.getElementById(`${roomId}-marker`);
      const floor = svgDoc.getElementById(`${roomId}-floor`);

      if (marker && floor && !floor.dataset.handlersSetup) {
        floor.dataset.handlersSetup = "true";
        floor.style.cursor = "pointer";
        // Set marker base styles (visibility controlled by activeFloor effect).
        // Skip if the marker has been replaced by an icon overlay.
        if (!marker.dataset.iconPlaced) {
          marker.style.display = "block";
          marker.style.visibility = "visible";
          marker.style.opacity = "1";
          marker.style.strokeWidth = "2";
          marker.style.cursor = "pointer";
        }
        const handleRoomClick = (e) => {
          // Only show popup if this floor is active
          if (activeFloorRef.current === floorNumber) {
            e.stopPropagation(); // Prevent floor switching when clicking a room
            setSelectedRoom({ ...rooms[roomId], id: roomId });
            // Reflect the room in the URL (?space=...&floor=...) and move
            // the highlight.
            onSpaceSelectedRef.current?.(roomId, floorKey);
          }
          // Otherwise let the click propagate to switch floors
        };
        floor.addEventListener("click", handleRoomClick);
        marker.addEventListener("click", handleRoomClick);
      }
    });
  };

  // Apply icon placements for a specific floor — reads `iconUrl` (and
  // optional `iconSize`) from each room entry in roomsConfig. The URL points
  // at the space icon endpoint (/api/spaces/:id/icon).
  const applyIconsForFloor = (svgDoc, floorKey) => {
    if (!svgDoc || !roomsConfig) return;
    const rooms = roomsConfig[floorKey] || {};
    Object.entries(rooms).forEach(([roomId, room]) => {
      if (!room.iconUrl) return;
      placeIcon(svgDoc, `${roomId}-marker`, room.iconUrl, room.iconSize);
    });
  };

  // Highlight the space in ?space=<spaceId> on its floor SVG by pulsing the
  // room's background fill between its own color and the highlight color
  // (green by default; ?color=<name> lets the workshop page keep its space
  // colors when linking here). Keyframes with only a 50% step animate from
  // the element's base fill and back. Clears any previous highlight so the
  // pulse follows the URL when another room is clicked.
  const applyHighlightForFloor = (svgDoc, floorKey) => {
    if (!svgDoc || !roomsConfig) return;
    const spaceId = highlightedSpaceIdRef.current;
    // spaceId alone is ambiguous (e.g. "kitchen" exists on both floors) —
    // when ?floor= is present only that floor may highlight.
    const pinnedFloor = highlightedFloorRef.current;
    const applies = spaceId && (!pinnedFloor || pinnedFloor === floorKey);
    svgDoc.querySelectorAll("[data-space-highlighted]").forEach((el) => {
      if (!applies || el.id !== `${spaceId}-floor`) {
        el.style.animation = "";
        delete el.dataset.spaceHighlighted;
      }
    });
    if (!applies || !(roomsConfig[floorKey] || {})[spaceId]) return;
    const floorEl = svgDoc.getElementById(`${spaceId}-floor`);
    if (!floorEl) return;
    let style = svgDoc.getElementById("space-highlight-style");
    if (!style) {
      style = svgDoc.createElementNS("http://www.w3.org/2000/svg", "style");
      style.id = "space-highlight-style";
      svgDoc.documentElement.appendChild(style);
    }
    style.textContent = `@keyframes spaceHighlightPulse { 50% { fill: ${highlightColorRef.current}; } }`;
    if (!floorEl.dataset.spaceHighlighted) {
      floorEl.dataset.spaceHighlighted = "true";
      floorEl.style.animation = "spaceHighlightPulse 1.6s ease-in-out infinite";
    }
  };

  // Move the highlight when the URL parameters change.
  useEffect(() => {
    if (floor1Ref.current?.contentDocument) {
      applyHighlightForFloor(floor1Ref.current.contentDocument, "floor1");
    }
    if (floor2Ref.current?.contentDocument) {
      applyHighlightForFloor(floor2Ref.current.contentDocument, "floor2");
    }
  }, [highlightedSpaceId, highlightedFloor, highlightColor, roomsConfig]);

  // Handle SVG load for floor 1
  const handleFloor1Load = () => {
    const obj = floor1Ref.current;
    if (obj) {
      const svgDoc = obj.contentDocument;
      if (mini) {
        setupMiniFloor(svgDoc, 1);
        return;
      }
      setupRoomClickHandlers(svgDoc, "floor1", 1);
      applyIconsForFloor(svgDoc, "floor1");
      applyHighlightForFloor(svgDoc, "floor1");
    }
  };

  // Handle SVG load for floor 2
  const handleFloor2Load = () => {
    const obj = floor2Ref.current;
    if (obj) {
      const svgDoc = obj.contentDocument;
      if (mini) {
        setupMiniFloor(svgDoc, 2);
        return;
      }
      setupRoomClickHandlers(svgDoc, "floor2", 2);
      applyIconsForFloor(svgDoc, "floor2");
      applyHighlightForFloor(svgDoc, "floor2");
    }
  };

  // Re-setup handlers when rooms config loads
  useEffect(() => {
    if (roomsConfig) {
      handleFloor1Load();
      handleFloor2Load();
    }
  }, [roomsConfig]);

  // Mini mode: re-apply the fills if the entity's spaces change after the
  // SVGs have loaded (the click listeners are attach-once).
  useEffect(() => {
    if (!mini) return;
    setupMiniFloor(floor1Ref.current?.contentDocument, 1);
    setupMiniFloor(floor2Ref.current?.contentDocument, 2);
  }, [mini]);

  // Update marker visibility based on active floor (full mode only — the
  // mini map keeps every marker hidden)
  useEffect(() => {
    if (mini) return;
    const updateMarkerVisibility = (svgDoc, isActive) => {
      if (!svgDoc) return;
      const markers = svgDoc.querySelectorAll('[id$="-marker"]');
      markers.forEach((marker) => {
        if (marker.dataset.iconPlaced) return;
        if (isActive) {
          // Show markers with fade-in after 1 second delay
          marker.style.display = "block";
          marker.style.visibility = "visible";
          marker.style.fill = "#e53e3e";
          marker.style.stroke = "#fff";
          marker.style.opacity = "0";
          marker.style.transition = "opacity 0.5s ease-in";
          setTimeout(() => {
            marker.style.opacity = "1";
          }, 300);
        } else {
          marker.style.display = "none";
          marker.style.visibility = "hidden";
          marker.style.opacity = "0";
          marker.style.fill = "none";
          marker.style.stroke = "none";
        }
      });
    };

    if (floor1Ref.current?.contentDocument) {
      updateMarkerVisibility(floor1Ref.current.contentDocument, activeFloor === 1);
    }
    if (floor2Ref.current?.contentDocument) {
      updateMarkerVisibility(floor2Ref.current.contentDocument, activeFloor === 2);
    }
  }, [activeFloor, roomsConfig]);

  // Any click that reaches the container or floor divs toggles floors
  const handleBackgroundClick = () => {
    setActiveFloor((current) => (current === 1 ? 2 : 1));
  };

  const handleFloorSelectorClick = (e) => {
    e.stopPropagation();
    setActiveFloor((current) => (current === 1 ? 2 : 1));
  };

  return (
    <div
      className={`map-container${mini ? " map-mini" : ""}`}
      onClick={handleBackgroundClick}
    >
      {/* Floor selector (full mode only — in the mini map the inactive floor
          peeking out behind the active one is the switching affordance) */}
      {!mini && (
        <div className="floor-selector" onClick={handleFloorSelectorClick}>
          <span className={`floor-selector-item ${activeFloor === 2 ? "active" : "inactive"}`}>
            {t("floor")} 2
          </span>
          <span className={`floor-selector-item ${activeFloor === 1 ? "active" : "inactive"}`}>
            {t("floor")} 1
          </span>
        </div>
      )}

      <div className="map-floors-container">
        <div
          className={`map-floor map-floor-1 ${activeFloor === 1 ? "active" : "inactive"}`}
          onClick={handleBackgroundClick}
        >
          <object
            ref={floor1Ref}
            type="image/svg+xml"
            data="/images/floor1.svg"
            className="map-svg"
            onLoad={handleFloor1Load}
          >
            Floor 1
          </object>
        </div>
        <div
          className={`map-floor map-floor-2 ${activeFloor === 2 ? "active" : "inactive"}`}
          onClick={handleBackgroundClick}
        >
          <object
            ref={floor2Ref}
            type="image/svg+xml"
            data="/images/floor2.svg"
            className="map-svg"
            onLoad={handleFloor2Load}
          >
            Floor 2
          </object>
        </div>
      </div>

      {selectedRoom && (
        <RoomPopup
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          slackChannelIds={slackChannels}
          slackTeam={slackTeam}
        />
      )}
    </div>
  );
};

export default FloorMap;
