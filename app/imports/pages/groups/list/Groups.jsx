import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import { localized } from "/imports/common/lib/groupRules";

// Section order follows the guideline's emphasis in the app: workshop groups
// and function groups are lifted to encourage members to contribute.
const SECTIONS = [
  { type: "workshop", labelKey: "groupsSectionWorkshop" },
  { type: "function", labelKey: "groupsSectionFunction" },
  { type: "interest", labelKey: "groupsSectionInterest" },
  { type: "responsibility", labelKey: "groupsSectionResponsibility" },
];

const MembershipChip = ({ myState, myIsResponsible }) => {
  const { t } = useTranslation();
  if (myIsResponsible) {
    return (
      <span className="inline-block text-xs font-semibold rounded-full py-0.5 px-2 bg-green-100 text-green-800">
        {t("groupResponsible")}
      </span>
    );
  }
  if (myState === "active") {
    return (
      <span className="inline-block text-xs font-semibold rounded-full py-0.5 px-2 bg-green-100 text-green-800">
        {t("memberChip")}
      </span>
    );
  }
  if (myState === "pending") {
    return (
      <span className="inline-block text-xs font-semibold rounded-full py-0.5 px-2 bg-amber-100 text-amber-800">
        {t("pendingChip")}
      </span>
    );
  }
  return null;
};

const Groups = ({ loading, groups }) => {
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
      <h2 className="text-2xl mb-6 text-center">{t("groups")}</h2>
      {groups.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">{t("noGroups")}</p>
      ) : (
        SECTIONS.map(({ type, labelKey }) => {
          const sectionGroups = groups.filter((g) => g.type === type);
          if (sectionGroups.length === 0) return null;
          return (
            <section key={type} className="mb-8">
              <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">
                {t(labelKey)}
              </h3>
              <ul className="list-none p-0 m-0">
                {sectionGroups.map((group) => (
                  <li key={group._id} className="mb-3 rounded-lg bg-white border border-gray-200">
                    <Link
                      to={`/groups/${group._id}`}
                      className="flex justify-between items-center p-4 no-underline text-inherit transition-colors hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <span className="flex items-center gap-2 font-semibold leading-snug">
                          {localized(group.name, lang)}
                          <MembershipChip myState={group.myState} myIsResponsible={group.myIsResponsible} />
                        </span>
                        <span className="block text-xs text-gray-500 mt-0.5">
                          {group.memberCount}{" "}
                          {group.memberCount === 1 ? t("memberSingular") : t("memberPlural")}
                        </span>
                      </div>
                      <span className="text-gray-400 text-xl ml-2">&rarr;</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </MainContent>
  );
};

Groups.propTypes = {
  loading: PropTypes.bool,
  groups: PropTypes.array,
};

Groups.defaultProps = {
  loading: false,
  groups: [],
};

export default Groups;
