import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';
import Button from "../../components/Button";
import Logo from "../../components/Logo";
import MainContent from "../../components/MainContent";
import { daysBetween } from "/imports/common/lib/dateUtils";

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
    const endDate = memberStatus.labEnd || memberStatus.memberEnd;
    daysLeftOfLab = daysBetween(new Date(), endDate);
  }
  const timeToRenew = typeof daysLeftOfLab === "number" &&
    daysLeftOfLab >= 0 && daysLeftOfLab < 14;

  const name = memberName?.split(" ")[0];
  const activeMembership = memberStatus && memberStatus.memberEnd >= new Date();

  if (!verified) {
    return <MainContent>
      <Logo />
      <h3 className="text-center">{t("welcome")}!</h3>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("emailNotVerifiedText1")}</p>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("emailNotVerifiedText2")}</p>
      <Link to="/waitforemailverification" className="w-full block no-underline text-center">
        <Button fullWidth>{t("verifyEmailButton")}</Button>
      </Link>
    </MainContent>;
  }

  if (memberName === '') {
    return <MainContent>
      <Logo />
      <h3 className="text-center">{t("welcome")}!</h3>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("noNameText1")}</p>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("noNameText2")}</p>
      <Link to="/profile" className="w-full block no-underline text-center">
        <Button fullWidth>{t("addNameButton")}</Button>
      </Link>
    </MainContent>;
  }

  if (invite) {
    return <MainContent>
      <Logo />
      <h3 className="text-center">{t("welcome")} {name}!</h3>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("familyInviteText")}</p>
      <div className="flex flex-col gap-3">
        <Button fullWidth onClick={onAcceptInvite}>
          {t("acceptInvite")}
        </Button>
        <Button variant="secondary" fullWidth onClick={onDeclineInvite}>
          {t("declineInvite")}
        </Button>
      </div>
    </MainContent>;
  }

  if (activeMembership) {
    const liabilityNeedsAttention = !liabilityDate || liabilityOutdated;

    return <MainContent>
      <Logo />
      <h3 className="text-center">{t("greeting2")} {name}!</h3>
      {timeToRenew && (
        <div>
          <p className="flex flex-col items-center text-center mt-5 mb-4">
            {t("AlertEndDate")}
            {daysLeftOfLab} {t("days")}
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
    </MainContent>;
  } else if (daysLeftOfLab < 0) {
    return <MainContent>
      <Logo />
      <h3 className="text-center">{t("welcome")} {name}!</h3>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("expiredMembershipText1")}</p>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("expiredMembershipText2")}</p>
      <Link to="/payment" className="w-full block no-underline text-center">
        <Button fullWidth>{t("renewMembership")}</Button>
      </Link>
    </MainContent>;
  } else {
    return <MainContent>
      <Logo />
      <h3 className="text-center">{t("welcome")} {name}!</h3>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("noMembershiptext1")}</p>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("noMembershiptext2")}</p>
      <Link to="/payment" className="w-full block no-underline text-center">
        <Button fullWidth>{t("getMembership")}</Button>
      </Link>
    </MainContent>;
  }
};