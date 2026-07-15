import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import Button from "../../components/Button";
import InfoCard from "../../components/InfoCard";
import Loader from "../../components/Loader";
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
export default ({ loading, memberName, memberStatus, verified, invite, onAcceptInvite, onDeclineInvite, liabilityDate, liabilityOutdated, isFamily, registered, excluded, expensesAllowed, hasNewMessages, messageCount, announcementCount, latestMessageDate, latestAnnouncementDate, hasNewMessage, hasNewAnnouncement }) => {
  const { t, i18n } = useTranslation();

  if (loading) {
    return <MainContent>
      <Logo />
      <Loader />
    </MainContent>;
  }

  if (excluded) {
    const name = memberName?.split(" ")[0];
    return <MainContent>
      <Logo />
      <h3 className="text-center">{name ? `${t("welcome")} ${name}!` : `${t("welcome")}!`}</h3>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("membershipSuspended")}</p>
      <p className="flex flex-col items-center text-center mt-2 mb-4 text-sm text-gray-600">{t("suspendedContactBoard")}</p>
    </MainContent>;
  }

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
      <section className="mt-4 mb-2 grid grid-cols-2 gap-3">
        <InfoCard to="/tool" Icon={MagnifyingGlassIcon} title={t("viewTools")} />
        {expensesAllowed && (
          <InfoCard to="/expenses" Icon={DocumentTextIcon} title={t("expenses")} />
        )}
        <InfoCard
          href="https://tutorial.uppsalamakerspace.se"
          Icon={BookOpenIcon}
          title={t("tutorials")}
        />
      </section>
      {(messageCount > 0 || announcementCount > 0) && (
        <Link
          to="/messages"
          className={`block mt-4 mb-2 px-4 py-3 rounded-lg no-underline text-inherit border ${hasNewMessages ? "border-brand-green bg-green-50" : "border-gray-200 bg-gray-50"} hover:shadow-sm`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 font-medium">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 flex-shrink-0"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
              {t("viewMessages")}
            </span>
            {hasNewMessages && (
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-brand-green text-white">
                {t("newIndicator")}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {hasNewAnnouncement && (
                  <span className="inline-block w-2 h-2 rounded-full bg-brand-green flex-shrink-0"></span>
                )}
                <span className="text-gray-700">{t("tagAnnouncements")} ({announcementCount})</span>
              </span>
              {latestAnnouncementDate && (
                <span className="text-xs text-gray-500">
                  {new Date(latestAnnouncementDate).toLocaleDateString(i18n.language === "sv" ? "sv-SE" : "en-US")}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {hasNewMessage && (
                  <span className="inline-block w-2 h-2 rounded-full bg-brand-green flex-shrink-0"></span>
                )}
                <span className="text-gray-700">{t("tagPrivateMessages")} ({messageCount})</span>
              </span>
              {latestMessageDate && (
                <span className="text-xs text-gray-500">
                  {new Date(latestMessageDate).toLocaleDateString(i18n.language === "sv" ? "sv-SE" : "en-US")}
                </span>
              )}
            </div>
          </div>
        </Link>
      )}
      {!registered && (
        <p className="flex flex-col items-center text-center mt-5 mb-4">{t("notRegisteredText")}</p>
      )}
      {timeToRenew && (
        <div>
          <p className="flex flex-col items-center text-center mt-5 mb-4">
            {t("AlertEndDate")}
            {daysLeftOfLab} {t("days")}
          </p>
          {isFamily ? (
            <p className="flex flex-col items-center text-center mb-4 text-gray-600">
              {t("familyRenewalWarning")}
            </p>
          ) : (
            <Link to="/membership" className="w-full block no-underline text-center">
              <Button fullWidth>{t("RenewMembership")}</Button>
            </Link>
          )}
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