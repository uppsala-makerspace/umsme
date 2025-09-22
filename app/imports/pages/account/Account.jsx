import PropTypes from 'prop-types';
import React from "react";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import "./acounts.css";

const Account = ({member, familyMembers, status}) => {
  const { t  } = useTranslation();
  let membershipType;
  if (member.family || member.infamily) {
    switch (status.type) {
      case 'member':
        membershipType = t('memberFamilyBaseType');
        break;
      case 'lab':
      case 'labandmember':
        membershipType = t('memberFamilyLabType');
    }
  } else {
    switch (status.type) {
      case 'member':
        if (status.discounted) {
          membershipType = t('memberDiscountedBaseType');
        } else {
          membershipType = t('memberBaseType');
        }
        break;
      case 'lab':
      case 'labandmember':
        if (status.quarterly) {
          if (status.discounted) {
            membershipType = t('memberDiscountedQuarterlyLabType');
          } else {
            membershipType = t('memberQuarterlyLabType');
          }
        } else if (status.discounted) {
          membershipType = t('memberDiscountedLabType');
        } else {
          membershipType = t('memberLabType');
        }
        break;
      case 'none':
        membershipType = 'fix';
    }
  }

  const payingFamilyMember = member.family && !member.infamily;
  return (
    <>
      <button className="round-prof">
        <a href="/profile" className="profile-link">
          {t("AddPic")}
        </a>
      </button>

      <div className="login-form"> {member.name}</div>
      <h1 className="middle-text"> {t("MyAccount")}</h1>
      <div className="middle-text">
        {t("TypeOfMembership")} {membershipType}
      </div>
      <div className="middle-text">
        {t("MemberID")}: {member.mid}
      </div>
      <br />
      <div className="middle-text">
        {t("MemberSince")} {status.memberStart.toLocaleDateString()}
      </div>
      <div className="middle-text">
        {t("EndDate")} {status.memberEnd.toLocaleDateString()}
      </div>
      <br />
      <div className="middle-text">
        {payingFamilyMember && (
          <div>
            <div>{t("FamilyMembers")}</div>
            <div className="vertical-divider">
              {familyMembers?.map((fm, index) => (
                <div key={index} className="family-row">
                  <span className="family-email">{`${fm.name}${fm.email ? ` <${fm.email}>` : ''}`}</span>
                  <a href="/profile" className="remove-link">{t("Remove")}</a>
                </div>
              ))}
            </div>
            <br />
          </div>
        )}
        {payingFamilyMember && familyMembers?.length < 4 && (
          <Link to="/addFamilyMember" className="wideButton">
            <button className="form-button">{t("AddFamilyMember")}</button>
          </Link>
        )}
      </div>
    </>
  );
};

Account.propTypes = {
  /** The member object for the current user */
  member: PropTypes.object,
  /** The memberships of the current member, only if it is a paying member */
  memberships: PropTypes.array,
  /** The family members of a paying member on the family plan */
  familyMembers: PropTypes.array,
  /** The status containing start and enddates for regular and lab membership, current family status and type of membership */
  status: PropTypes.object,
  arr: PropTypes.array
};

export default Account;
