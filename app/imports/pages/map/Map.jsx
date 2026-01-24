import React, { useState, useEffect, useRef } from "react";
import { Meteor } from "meteor/meteor";
import { useTranslation } from "react-i18next";
import RoomPopup from "./RoomPopup";
import "./style.css";

const Map = () => {
  const { t } = useTranslation();
  const [roomsConfig, setRoomsConfig] = useState(null);
  const [slackChannels, setSlackChannels] = useState(null);
  const slackTeam = Meteor.settings?.public?.slack?.team;
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeFloor, setActiveFloor] = useState(2); // Floor 2 on top by default
  const floor1Ref = useRef(null);
  const floor2Ref = useRef(null);

  // Load room configuration and slack channels
  useEffect(() => {
    fetch("/data/rooms.json")
      .then((res) => res.json())
      .then((data) => setRoomsConfig(data))
      .catch((err) => console.error("Failed to load rooms config:", err));

    fetch("/data/slack-channels.json")
      .then((res) => res.json())
      .then((data) => setSlackChannels(data))
      .catch((err) => console.error("Failed to load slack channels:", err));
  }, []);

  // Setup click handlers for rooms after SVG loads
  const setupRoomClickHandlers = (svgDoc, floorKey) => {
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
        // Set marker base styles (visibility controlled by activeFloor effect)
        marker.style.display = "block";
        marker.style.visibility = "visible";
        marker.style.opacity = "1";
        marker.style.strokeWidth = "2";
        floor.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent floor switching when clicking a room
          setSelectedRoom({ ...rooms[roomId], id: roomId });
        });
      }
    });
  };

  // Handle SVG load for floor 1
  const handleFloor1Load = () => {
    const obj = floor1Ref.current;
    if (obj) {
      const svgDoc = obj.contentDocument;
      setupRoomClickHandlers(svgDoc, "floor1");
    }
  };

  // Handle SVG load for floor 2
  const handleFloor2Load = () => {
    const obj = floor2Ref.current;
    if (obj) {
      const svgDoc = obj.contentDocument;
      setupRoomClickHandlers(svgDoc, "floor2");
    }
  };

  // Re-setup handlers when config loads
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
