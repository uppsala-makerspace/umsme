import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
//import AddFamilyMember from "../addFamilyMember";
import { useTranslation } from "react-i18next";
import "./acounts.css";

export default ({memberInfo}) => {
  const { t  } = useTranslation();

  let membershipType = t("memberBase");
  if (memberInfo.memberships?.length > 0) {
//       t("memberIndivdual");
    const membership = memberInfo.memberships[0];
    const type = membership.type;
    if (membership.family) {
      membershipType = t("memberFamily");
    } else if (type === "labandmember" || type === "lab") {
      membershipType = t("memberIndivdual");
    } else if (type === "member") {
      membershipType = t("memberBase");
    }
  }
  const inFamily = !!memberInfo.member.infamily;
  const payingFamilyMember = memberInfo.member.family && !memberInfo.member.infamily;
  //const member_family = member.family;
  return (
    <>
      <button className="round-prof">
        <a href="/profile" className="profile-link">
          {t("AddPic")}
        </a>
      </button>

      <button className="login-form"> {memberInfo.member.name}</button>

      <h1 className="middle-text"> {t("MyAccount")}</h1>

      {/*  {member_family ? <span>{t("FamilyMember")}</span> : null} */}
      <div className="middle-text">
        {t("TypeOfMembership")} {inFamily ? t("memberFamily") : membershipType}
      </div>
      <div className="middle-text">
        {t("MemberID")}: {memberInfo.member.mid}
      </div>
      <br />
      <div className="middle-text">
        {t("MemberSince")} {memberInfo.status.memberStart.toLocaleDateString()}
      </div>
      <div className="middle-text">
        {t("EndDate")} {memberInfo.status.memberEnd.toLocaleDateString()}
      </div>
      <br />
      <div className="middle-text">
        {payingFamilyMember && (
          <div>
            <div>{t("FamilyMembers")}</div>
            <div className="vertical-divider">
              {memberInfo.familyMembers.map((fm, index) => (
                <div key={index} className="family-row">
                  <span className="family-email">{`${fm.name}${fm.email ? ` <${fm.email}>` : ''}`}</span>
                  {!memberInfo.infamily && (
                    <a href="/profile" className="remove-link">
                      {t("Remove")}
                    </a>
                  )}
                </div>
              ))}
            </div>
            <br />
          </div>
        )}
        {payingFamilyMember && memberInfo.familyMembers.length < 4 && (
          <Link to="/addFamilyMember" className="wideButton">
            <button className="form-button">{t("AddFamilyMember")}</button>
          </Link>
        )}
      </div>
    </>
  );
};