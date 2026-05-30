import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';
import Button from "../../components/Button";
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
export default ({ loading, memberName, memberStatus, verified, invite, onAcceptInvite, onDeclineInvite, liabilityDate, liabilityOutdated, isFamily, registered, excluded, hasNewMessages, messageCount, announcementCount, latestMessageDate, latestAnnouncementDate, hasNewMessage, hasNewAnnouncement }) => {
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
      <Link
        to="/tool"
        className="block mt-4 mb-2 px-4 py-3 rounded-lg no-underline text-inherit border border-gray-200 bg-gray-50 hover:shadow-sm"
      >
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
              d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
            />
          </svg>
          {t("viewTools")}
        </span>
      </Link>
      <a
        href="https://tutorial.uppsalamakerspace.se"
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-4 mb-2 px-4 py-3 rounded-lg no-underline text-inherit border border-gray-200 bg-gray-50 hover:shadow-sm"
      >
        <div className="flex items-center justify-between">
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
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
            {t("readTutorials")}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4 flex-shrink-0 text-gray-500"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </div>
      </a>
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