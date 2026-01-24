import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

const RoomPopup = ({ room, onClose, slackChannelIds, slackTeam }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "sv" ? "sv" : "en";

  // Get slack:// deep link URL for a channel
  const getSlackUrl = (channelName) => {
    const name = channelName.replace("#", "");
    const channelId = slackChannelIds?.[name];
    if (!channelId || !slackTeam) {
      return null;
    }
    return `slack://channel?team=${slackTeam}&id=${channelId}`;
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  if (!room) return null;

  const name = room.name?.[lang] || room.name?.en || "";
  const description = room.description?.[lang] || room.description?.en || "";
  const slackChannels = room.slackChannels || [];

  const handleOverlayClick = (e) => {
    e.stopPropagation();
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCloseClick = (e) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div className="room-popup-overlay" onClick={handleOverlayClick}>
      <div className="room-popup" onClick={(e) => e.stopPropagation()}>
        <button className="room-popup-close" onClick={handleCloseClick}>
          &times;
        </button>
        <h2 className="room-popup-title">{name}</h2>
        <p className="room-popup-description">{description}</p>
        {slackChannels.length > 0 && (
          <div className="room-popup-slack">
            <span className="room-popup-slack-label">{t("slackChannels")}:</span>
            {slackChannels.map((channel) => {
              const url = getSlackUrl(channel);
              if (!url) {
                return <span key={channel} className="room-popup-slack-link">{channel}</span>;
              }
              return (
                <a
                  key={channel}
                  href={url}
                  className="room-popup-slack-link"
                >
                  {channel}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPopup;
