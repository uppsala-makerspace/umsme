import React from "react";
import { Link } from "react-router-dom";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

/**
 * One tile in a 2-per-row card grid (see the workshop and group detail
 * pages): an icon, a title, an optional second line, and an internal or
 * external link target. External web links open in a new tab and get an
 * open-in-new indicator, matching the guides button on the home page.
 * A disabled card is rendered grayed out and without its link. `badge`
 * renders a green counter bubble in the card's top-right corner (hidden
 * when falsy/zero).
 */
const InfoCard = ({ to, href, Icon, title, subtitle, disabled, badge }) => {
  const external = !disabled && !!href && href.startsWith("http");
  const content = (
    <>
      {badge > 0 && (
        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-green text-white text-xs font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
      <Icon
        className={`w-6 h-6 flex-shrink-0 ${disabled ? "text-gray-300" : "text-gray-500"}`}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="block font-semibold leading-snug">{title}</span>
        {subtitle && (
          <span className={`block text-xs mt-1 truncate ${disabled ? "" : "text-gray-500"}`}>
            {subtitle}
          </span>
        )}
      </span>
      {external && (
        <ArrowTopRightOnSquareIcon
          className="w-4 h-4 flex-shrink-0 ml-auto text-gray-500"
          aria-hidden="true"
        />
      )}
    </>
  );
  const className = `relative flex items-center gap-3 p-4 rounded-lg border border-gray-200 ${
    disabled
      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
      : "bg-white no-underline text-inherit hover:bg-gray-50"
  }`;
  if (!disabled && to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }
  if (!disabled && href) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }
  return <div className={className}>{content}</div>;
};

export default InfoCard;
