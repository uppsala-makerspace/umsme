import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';

const msPerDay = 1000 * 60 * 60 * 24;

/**
 * Home view shows current status of a signed in user. Three situations may occur:
 * 1. No memberName indicating that the user should provide a member profile (the member object)
 * 2. The member has no active membership
 * 3. The member has an active membership
 *
 * @param {string} memberName a name or an empty string
 * @param {object} memberStatus information about active membership etc.
 * @returns {React.JSX.Element}
 */
export default ({ memberName, memberStatus }) => {
  const { t } = useTranslation();

  let daysLeftOfLab = null;
  if (memberStatus && (memberStatus.labEnd || memberStatus.memberEnd)) {
    const today = new Date();
    daysLeftOfLab = Math.floor(
      (memberStatus.labEnd || memberStatus.memberEnd).getTime() - today.getTime()) / msPerDay;
  }
  const timeToRenew = typeof daysLeftOfLab === "number" &&
    daysLeftOfLab >= 0 && daysLeftOfLab < 8;

  const name = memberName?.split(" ")[0];

  const activeMembership = memberStatus && memberStatus.memberEnd >= new Date();
  if (memberName === '') {
    return <>
      <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />
      <h3 className="text-h3">{t("welcome")} {name}!</h3>
      <p className="text-container">{t("noMembertext1")}</p>
      <p className="text-container">{t("noMembertext2")}</p>
      <Link to="/createMember" className="wideButton">
        <button className="form-button">{t("becomeMember")}</button>
      </Link>
    </>;
  } else if (activeMembership) {
    return <>
      <Link to="/LoggedInAsMember/keys" style={{width: "100%", "text-align": "center"}}>
        <button className="round-button"></button>
      </Link>
      <h3 className="text-h3">{t("greeting2")} {name}!</h3>
      <div style={{marginTop: "0"}}> {t("PressToOpen")}</div>
      {timeToRenew && (
        <div>
          <p style={{textAlign: "center"}}>
            {t("AlertEndDate")}
            {daysLeftOfLab.toFixed(0)} {t("days")}
          </p>
          <Link to="/LoggedInAsMember/HandleMembership" className="wideButton">
            <button className="form-button">{t("RenewMembership")}</button>
          </Link>
        </div>
      )}
    </>;
  } else {
    return <>
      <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />
      <h3 className="text-h3">{t("welcome")} {name}!</h3>
      <p className="text-container">{t("noMembershiptext1")}</p>
      <p className="text-container">{t("noMembershiptext2")}</p>
      <Link to="/payment" className="wideButton">
        <button className="form-button">{t("getMembership")}</button>
      </Link>
    </>;
  }
};