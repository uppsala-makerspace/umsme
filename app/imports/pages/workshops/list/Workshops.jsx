import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import { localized } from "/imports/common/lib/groupRules";
import { markdownExcerpt } from "/imports/utils/markdown";
import WorkshopStatusBadge from "../components/WorkshopStatusBadge";

const Workshops = ({ loading, workshops }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  return (
    <MainContent topPadding={false}>
      <h2 className="text-2xl mb-6 text-center">{t("workshops")}</h2>
      {workshops.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">{t("noWorkshops")}</p>
      ) : (
        <ul className="list-none p-0 m-0">
          {workshops.map((workshop) => (
            <li key={workshop._id} className="mb-4 rounded-lg bg-white border border-gray-200 overflow-hidden">
              <Link
                to={`/workshops/${workshop._id}`}
                className="block no-underline text-inherit transition-colors hover:bg-gray-50"
              >
                {workshop.imageUrl && (
                  <img
                    src={workshop.imageUrl}
                    alt={localized(workshop.name, lang)}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold leading-snug">
                      {localized(workshop.name, lang)}
                    </span>
                    <WorkshopStatusBadge status={workshop.status} />
                  </div>
                  {localized(workshop.description, lang) && (
                    <p className="text-sm text-gray-500 mt-1 mb-0">
                      {markdownExcerpt(localized(workshop.description, lang))}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MainContent>
  );
};

Workshops.propTypes = {
  loading: PropTypes.bool,
  workshops: PropTypes.array,
};

Workshops.defaultProps = {
  loading: false,
  workshops: [],
};

export default Workshops;
