import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import RoomPopup from "./RoomPopup";
import "./style.css";

const Map = ({ slackTeam, roomsConfig, slackChannels }) => {
  const { t } = useTranslation();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeFloor, setActiveFloor] = useState(2); // Floor 2 on top by default
  const activeFloorRef = useRef(activeFloor); // Ref to access current floor in event handlers
  const floor1Ref = useRef(null);
  const floor2Ref = useRef(null);

  // Keep ref in sync with state
  useEffect(() => {
    activeFloorRef.current = activeFloor;
  }, [activeFloor]);

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
          }
          // Otherwise let the click propagate to switch floors
        };
        floor.addEventListener("click", handleRoomClick);
        marker.addEventListener("click", handleRoomClick);
      }
    });
  };

  // Apply icon placements for a specific floor — reads `icon` (and optional
  // `iconSize`) from each room entry in roomsConfig.
  const applyIconsForFloor = (svgDoc, floorKey) => {
    if (!svgDoc || !roomsConfig) return;
    const rooms = roomsConfig[floorKey] || {};
    Object.entries(rooms).forEach(([roomId, room]) => {
      if (!room.icon) return;
      placeIcon(svgDoc, `${roomId}-marker`, `/mapicons/${room.icon}`, room.iconSize);
    });
  };

  // Handle SVG load for floor 1
  const handleFloor1Load = () => {
    const obj = floor1Ref.current;
    if (obj) {
      const svgDoc = obj.contentDocument;
      setupRoomClickHandlers(svgDoc, "floor1", 1);
      applyIconsForFloor(svgDoc, "floor1");
    }
  };

  // Handle SVG load for floor 2
  const handleFloor2Load = () => {
    const obj = floor2Ref.current;
    if (obj) {
      const svgDoc = obj.contentDocument;
      setupRoomClickHandlers(svgDoc, "floor2", 2);
      applyIconsForFloor(svgDoc, "floor2");
    }
  };

  // Re-setup handlers when rooms config loads
  useEffect(() => {
    if (roomsConfig) {
      handleFloor1Load();
      handleFloor2Load();
    }
  }, [roomsConfig]);

  // Update marker visibility based on active floor
  useEffect(() => {
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
    <div className="map-container" onClick={handleBackgroundClick}>
      {/* Floor selector */}
      <div className="floor-selector" onClick={handleFloorSelectorClick}>
        <span className={`floor-selector-item ${activeFloor === 2 ? "active" : "inactive"}`}>
          {t("floor")} 2
        </span>
        <span className={`floor-selector-item ${activeFloor === 1 ? "active" : "inactive"}`}>
          {t("floor")} 1
        </span>
      </div>

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

export default Map;
