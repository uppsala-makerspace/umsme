import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';

const msPerDay = 1000 * 60 * 60 * 24;

/**
 * Home view shows current status of a signed in user. Four situations may occur:
 * 1. Email not verified - user needs to verify their email first
 * 2. No memberName indicating that the user should provide a member profile (the member object)
 * 3. The member has no active membership
 * 4. The member has an active membership
 *
 * @param {string} memberName a name or an empty string
 * @param {object} memberStatus information about active membership etc. (includes verified flag)
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

  if (!memberStatus?.verified) {
    return <>
      <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />
      <h3 className="text-h3">{t("welcome")}!</h3>
      <p className="text-container">{t("emailNotVerifiedText1")}</p>
      <p className="text-container">{t("emailNotVerifiedText2")}</p>
      <Link to="/waitforemailverification" className="wideButton">
        <button className="form-button">{t("verifyEmailButton")}</button>
      </Link>
    </>;
  }

  if (memberName === '') {
    return <>
      <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />
      <h3 className="text-h3">{t("welcome")}!</h3>
      <p className="text-container">{t("noNameText1")}</p>
      <p className="text-container">{t("noNameText2")}</p>
      <Link to="/profile" className="wideButton">
        <button className="form-button">{t("addNameButton")}</button>
      </Link>
    </>;
  } else if (activeMembership) {
    return <>
      <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />
      <h3 className="text-h3">{t("greeting2")} {name}!</h3>
      {timeToRenew && (
        <div>
          <p className="text-container">
            {t("AlertEndDate")}
            {daysLeftOfLab.toFixed(0)} {t("days")}
          </p>
          <Link to="/LoggedInAsMember/HandleMembership" className="wideButton">
            <button className="form-button">{t("RenewMembership")}</button>
          </Link>
        </div>
      )}
      <Link to="/unlock" style={{width: "100%", "text-align": "center"}}>
        <button className="form-button">{t("PressToOpen")}</button>
      </Link>
    </>;
  } else if (daysLeftOfLab < 0) {
    return <>
      <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />
      <h3 className="text-h3">{t("welcome")} {name}!</h3>
      <p className="text-container">{t("expiredMembershipText1")}</p>
      <p className="text-container">{t("expiredMembershipText2")}</p>
      <Link to="/payment" className="wideButton">
        <button className="form-button">{t("renewMembership")}</button>
      </Link>
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