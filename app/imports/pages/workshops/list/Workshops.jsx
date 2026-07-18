import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import WorkshopCard from "../../../components/WorkshopCard";

const Workshops = ({ loading, workshops }) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  return (
    <MainContent>
      {workshops.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">{t("noWorkshops")}</p>
      ) : (
        <ul className="list-none p-0 m-0">
          {workshops.map((workshop) => (
            <WorkshopCard key={workshop._id} workshop={workshop} />
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
