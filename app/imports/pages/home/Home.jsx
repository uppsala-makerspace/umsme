import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';
import Button from "../../components/Button";

const msPerDay = 1000 * 60 * 60 * 24;

/**
 * Home view shows current status of a signed in user. Five situations may occur:
 * 1. Email not verified - user needs to verify their email first
 * 2. No memberName indicating that the user should provide a member profile (the member object)
 * 3. Pending family invite - user needs to accept or decline
 * 4. The member has no active membership
 * 5. The member has an active membership
 *
 * @param {string} memberName a name or an empty string
 * @param {object} memberStatus information about active membership etc.
 * @param {boolean} verified whether the user's email is verified
 * @param {object} invite pending family invite (if any)
 * @param {function} onAcceptInvite callback to accept family invite
 * @param {function} onDeclineInvite callback to decline family invite
 * @param {Date|null} liabilityDate date of approved liability (null if not approved)
 * @param {boolean} liabilityOutdated whether the approved liability is outdated
 * @returns {React.JSX.Element}
 */
export default ({ memberName, memberStatus, verified, invite, onAcceptInvite, onDeclineInvite, liabilityDate, liabilityOutdated }) => {
  const { t } = useTranslation();

  let daysLeftOfLab = null;
  if (memberStatus && (memberStatus.labEnd || memberStatus.memberEnd)) {
    const today = new Date();
    daysLeftOfLab = Math.floor(
      (memberStatus.labEnd || memberStatus.memberEnd).getTime() - today.getTime()) / msPerDay;
  }
  const timeToRenew = typeof daysLeftOfLab === "number" &&
    daysLeftOfLab >= 0 && daysLeftOfLab < 14;

  const name = memberName?.split(" ")[0];
  const activeMembership = memberStatus && memberStatus.memberEnd >= new Date();

  if (!verified) {
    return <>
      <img src="/images/UmLogo.png" alt="UM Logo" className="block max-w-[250px] w-full h-auto mt-6 mb-12 mx-auto" />
      <h3 className="text-center">{t("welcome")}!</h3>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("emailNotVerifiedText1")}</p>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("emailNotVerifiedText2")}</p>
      <Link to="/waitforemailverification" className="w-full block no-underline text-center">
        <Button fullWidth>{t("verifyEmailButton")}</Button>
      </Link>
    </>;
  }

  if (memberName === '') {
    return <>
      <img src="/images/UmLogo.png" alt="UM Logo" className="block max-w-[250px] w-full h-auto mt-6 mb-12 mx-auto" />
      <h3 className="text-center">{t("welcome")}!</h3>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("noNameText1")}</p>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("noNameText2")}</p>
      <Link to="/profile" className="w-full block no-underline text-center">
        <Button fullWidth>{t("addNameButton")}</Button>
      </Link>
    </>;
  }

  if (invite) {
    return <>
      <img src="/images/UmLogo.png" alt="UM Logo" className="block max-w-[250px] w-full h-auto mt-6 mb-12 mx-auto" />
      <h3 className="text-center">{t("welcome")} {name}!</h3>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("familyInviteText")}</p>
      <Button fullWidth onClick={onAcceptInvite}>
        {t("acceptInvite")}
      </Button>
      <Button variant="secondary" fullWidth onClick={onDeclineInvite}>
        {t("declineInvite")}
      </Button>
    </>;
  }

  if (activeMembership) {
    const liabilityNeedsAttention = !liabilityDate || liabilityOutdated;

    return <>
      <img src="/images/UmLogo.png" alt="UM Logo" className="block max-w-[250px] w-full h-auto mt-6 mb-12 mx-auto" />
      <h3 className="text-center">{t("greeting2")} {name}!</h3>
      {timeToRenew && (
        <div>
          <p className="flex flex-col items-center text-center mt-5 mb-4">
            {t("AlertEndDate")}
            {daysLeftOfLab.toFixed(0)} {t("days")}
          </p>
          <Link to="/membership" className="w-full block no-underline text-center">
            <Button fullWidth>{t("RenewMembership")}</Button>
          </Link>
        </div>
      )}
      {liabilityNeedsAttention && (
        <>
          <p className="flex flex-col items-center text-center mt-5 mb-4">
            {liabilityOutdated ? t("homeLiabilityOutdated") : t("homeLiabilityNotApproved")}
          </p>
          <Link to="/liability" className="w-full block no-underline text-center">
            <Button fullWidth>{t("homeLiabilityButton")}</Button>
          </Link>
        </>
      )}
    </>;
  } else if (daysLeftOfLab < 0) {
    return <>
      <img src="/images/UmLogo.png" alt="UM Logo" className="block max-w-[250px] w-full h-auto mt-6 mb-12 mx-auto" />
      <h3 className="text-center">{t("welcome")} {name}!</h3>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("expiredMembershipText1")}</p>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("expiredMembershipText2")}</p>
      <Link to="/payment" className="w-full block no-underline text-center">
        <Button fullWidth>{t("renewMembership")}</Button>
      </Link>
    </>;
  } else {
    return <>
      <img src="/images/UmLogo.png" alt="UM Logo" className="block max-w-[250px] w-full h-auto mt-6 mb-12 mx-auto" />
      <h3 className="text-center">{t("welcome")} {name}!</h3>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("noMembershiptext1")}</p>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("noMembershiptext2")}</p>
      <Link to="/payment" className="w-full block no-underline text-center">
        <Button fullWidth>{t("getMembership")}</Button>
      </Link>
    </>;
  }
};