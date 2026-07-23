import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import MainContent from "../MainContent";
import Loader from "../Loader";
import Markdown from "../Markdown";

/**
 * The rules page for a workshop or group: the entity name with a "Rules"
 * subheading and the rules markdown. Purely presentational — the container
 * fetches the entity and passes its name and localized rules text.
 */
const RulesView = ({ loading, error, name, rules }) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (error) {
    return (
      <MainContent>
        <p className="text-center text-red-600 p-8">{error}</p>
      </MainContent>
    );
  }

  return (
    <MainContent>
      {name && <h2 className="text-2xl m-0 mb-1">{name}</h2>}
      <p className="text-sm text-gray-500 mt-0 mb-4">{t("rules")}</p>
      {rules ? (
        <Markdown className="text-gray-700" startLevel={3}>
          {rules}
        </Markdown>
      ) : (
        <p className="text-center text-gray-500 p-8 italic">{t("noRules")}</p>
      )}
    </MainContent>
  );
};

RulesView.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  name: PropTypes.string,
  rules: PropTypes.string,
};

RulesView.defaultProps = {
  loading: false,
  error: null,
  name: "",
  rules: "",
};

export default RulesView;
