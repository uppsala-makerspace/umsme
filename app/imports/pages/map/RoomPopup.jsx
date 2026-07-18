import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import GroupCard from "/imports/components/GroupCard";
import WorkshopStatusBadge from "/imports/pages/workshops/components/WorkshopStatusBadge";
import { localized } from "/imports/common/lib/groupRules";
import { markdownExcerpt } from "/imports/utils/markdown";

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

  const workshop = room.workshop || null;
  const groups = room.groups || [];
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
        {workshop ? (
          /* A space corresponds to at most one workshop — it is the hero and
             replaces the space's own name/description/channels. */
          <Link
            to={`/workshops/${workshop._id}`}
            className="block no-underline text-inherit"
          >
            <h2 className="room-popup-title flex items-center gap-2">
              {localized(workshop.name, lang)}
              <WorkshopStatusBadge status={workshop.status} />
            </h2>
            {workshop.imageUrl && (
              <img
                src={workshop.imageUrl}
                alt={localized(workshop.name, lang)}
                className="w-full max-h-48 object-cover rounded-lg mb-3"
              />
            )}
            <p className="room-popup-description">
              {markdownExcerpt(localized(workshop.description, lang), 180)}
            </p>
            <span className="block text-right text-gray-400 text-xl leading-none">&rarr;</span>
          </Link>
        ) : (
          <>
            <h2 className="room-popup-title">{name}</h2>
            <p className="room-popup-description">{description}</p>
          </>
        )}
        {!workshop && slackChannels.length > 0 && (
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
        {groups.length > 0 && (
          /* Secondary section: the groups sit on a shaded, edge-to-edge
             background below the (white) workshop/space information. */
          <div className="-mx-6 -mb-6 mt-4 px-6 pt-4 pb-1 bg-gray-100 rounded-b-xl">
            <ul className="list-none p-0 m-0">
              {groups.map((group) => (
                <GroupCard key={group._id} group={group} compact />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPopup;
