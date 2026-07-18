import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import GroupTypeTag from "../../../components/GroupTypeTag";
import { localized } from "/imports/common/lib/groupRules";

// One flat list: interest groups first, then function groups, and last the
// workshop-bound groups (workshop groups and their responsibility subgroups).
// Each row carries a type tag instead of section headings.
const TYPE_ORDER = ["interest", "function", "workshop", "responsibility"];

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
    <MainContent>
      {groups.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">{t("noGroups")}</p>
      ) : (
        <ul className="list-none p-0 m-0">
          {TYPE_ORDER.flatMap((type) => groups.filter((g) => g.type === type)).map((group) => (
            <li key={group._id} className="mb-3 rounded-lg bg-white border border-gray-200 overflow-hidden">
              <Link
                to={`/groups/${group._id}`}
                className="block no-underline text-inherit transition-colors hover:bg-gray-50"
              >
                {group.imageUrl && (
                  <img
                    src={group.imageUrl}
                    alt={localized(group.name, lang)}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="flex justify-between items-center p-4">
                  <div className="flex-1">
                    <span className="flex items-center gap-2 font-semibold leading-snug">
                      {localized(group.name, lang)}
                      <GroupTypeTag type={group.type} />
                      <MembershipChip myState={group.myState} myIsResponsible={group.myIsResponsible} />
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {group.memberCount}{" "}
                      {group.memberCount === 1 ? t("memberSingular") : t("memberPlural")}
                    </span>
                  </div>
                  <span className="text-gray-400 text-xl ml-2">&rarr;</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
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
