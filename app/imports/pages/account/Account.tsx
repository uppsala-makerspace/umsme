import { faPen, faSave, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import moment from 'moment';
import PropTypes from 'prop-types';
import { default as React, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';
import "./acounts.css";
import Memberships from "./Memberships";
import MembershipStatus from "/imports/components/MembershipStatus";

interface INewFamilyMember {
  email?: string;
}

interface INewFamilyMemberValidation {
  emailEmpty?: boolean,
  emailInvalid?: boolean,
  errorMassages?: string[]
}

const Account = ({ member, memberships, familyMembers, familyInvites = [], status, paying, addFamilyInvite, cancelFamilyInvite, removeFamilyMember }) => {
  const [addFamilyMemberMode, setAddFamilyMemberMode] = useState(false);
  const [newFamilyMemberInfo, setNewFamilyMemberInfo] = useState<INewFamilyMember>({});
  const [newFamilyMemberError, setNewFamilyMemberError] = useState<INewFamilyMemberValidation>({});


  const { t } = useTranslation();

  const payingFamilyMember = member.family && !member.infamily;
  const memberDaysRemaining = status.memberEnd ? moment(status.memberEnd).diff(moment.now(), 'days') : null;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateNewFamilyMemberInfo = (): boolean => {
    const validation: INewFamilyMemberValidation = {
      emailEmpty: false,
      emailInvalid: false,
      errorMassages: []
    }

    if (!newFamilyMemberInfo.email || newFamilyMemberInfo.email?.length == 0) {
      validation.emailEmpty = true
      validation.errorMassages.push(t("email") + " " + t("CantBeEmpty"))
    } else {
      validation.emailInvalid = !validateEmail(newFamilyMemberInfo.email)
      if (validation.emailInvalid) {
        validation.errorMassages.push(t("email") + " " + t("IsInvalid"))
      }
    }

    setNewFamilyMemberError(validation)

    return !validation.emailEmpty && !validation.emailInvalid
  }

  const saveNewMember = () => {
    if (validateNewFamilyMemberInfo()) {
      if (addFamilyInvite) {
        addFamilyInvite(newFamilyMemberInfo.email);
      }

      setNewFamilyMemberInfo({})
      setAddFamilyMemberMode(false)
    }
  }

  const showNewMemberInfo = () => {
    setNewFamilyMemberError({})
    setAddFamilyMemberMode(true)
  }

  const handleUpdateNewFamilyMemberEmail = (value: string) => {
    setNewFamilyMemberInfo({email: value})
  }

  const handleRemoveFamilyMember = (email: string) => {
    if (removeFamilyMember) {
      removeFamilyMember(email);
    }
  }

  return (
    <div className='flex flex-col min-h-full h-svh flex-1 gap-5'>
      <div className='flex flex-col flex-1 gap-5'>
        <span className="font-bold text-center text-xl"> {member.name}</span>
        {/*<div className='flex w-full justify-center relative'>
          <div className='absolute w-full h-full border'>
            <div className='flex h-1/3'></div>
            <div className='flex h-1/3 bg-gray-300'></div>
            <div className='flex h-1/3'></div>
          </div>
          <button className="round-prof bg-gray-300">
            <FontAwesomeIcon
              className='absolute top-0 right-0 border-4 bg-white border-gray-500 rounded-full w-8 h-8 p-1.5 text-gray-500'
              icon={faPen} />
          </button>
        </div>*/}

        <MembershipStatus member={member} status={status} />
      </div>
      <Link to="/membership" className="wideButton">
        <button className={`form-button ${memberDaysRemaining >= 14 ? "white" : ""}`}>
          {t(memberDaysRemaining < 14 ? "renewMembership" : "extendMembership")}
        </button>
      </Link>
      <div className="middle-text flex flex-col gap-3">
        {member.infamily && paying && (
          <div className="flex flex-col gap-1">
            <div className='flex justify-between border-b-2 border-gray-600'>
              <span className='text-gray-600'>{t("FamilyMembership")}</span>
            </div>
            <p>{t("familyPayerText")}</p>
            <div className='flex flex-col'>
              <span className="font-bold">{paying.name}</span>
              <span className='text-sm'>{paying.email}</span>
            </div>
          </div>
        )}

        {payingFamilyMember && (
          <div className="flex flex-col gap-4">
            <div>
              <div className='flex justify-between border-b-2 border-gray-600'>
                <span className='text-gray-600'>{t("FamilyMembers")}</span>
                <span className='text-gray-600 text-sm'>[{(familyMembers?.length || 0) + (familyInvites?.length || 0)}/4]</span>
              </div>
              <div className="">
                {familyMembers?.map((fm, index) => (
                  <div key={index} className="family-row items-center">
                    <div className='flex flex-col'>
                      <span className="font-bold">{`${fm.name}`}</span>
                      <span className='text-sm'>{fm.email ? `${fm.email}` : ''}</span>
                    </div>
                    <FontAwesomeIcon className='cursor-pointer text-gray-600 hover:text-gray-800' icon={faTrash} onClick={() => handleRemoveFamilyMember(fm.email)} />
                  </div>
                ))}
              </div>
            </div>
            {familyInvites?.length > 0 && (
              <div>
                <div className='flex justify-between border-b-2 border-gray-600'>
                  <span className='text-gray-600'>{t("Invites")}</span>
                </div>
                <div className="">
                  {familyInvites.map((invite, index) => (
                    <div key={index} className="family-row items-center">
                      <div className='flex flex-col'>
                        <span className='text-sm'>{invite.email}</span>
                      </div>
                      <FontAwesomeIcon
                        className='cursor-pointer text-gray-600 hover:text-gray-800'
                        icon={faTrash}
                        onClick={() => cancelFamilyInvite && cancelFamilyInvite(invite.email)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {addFamilyMemberMode ?
          <>
            <form className='flex flex-col justify-stretch border rounded border-gray-400 p-1 gap-1 my-2'>
              <input
                id='family_member_email'
                className={'border rounded  !w-full !m-0 ' + (newFamilyMemberError.emailEmpty || newFamilyMemberError.emailInvalid ? 'border-red-600' : 'border-gray-300')}
                type="email"
                placeholder={t("email")}
                autoFocus
                onChange={(e) => handleUpdateNewFamilyMemberEmail(e.target.value)}
              />

              <ul className='text-sm list-disc text-red-600 pl-5'>
                {newFamilyMemberError.errorMassages?.map(err => {
                  return <li>{err}</li>
                })}
              </ul>
            </form>
            <button className="form-button !w-full" onClick={saveNewMember}><FontAwesomeIcon icon={faSave} /> {t("Save")}</button>
          </>
          :
          payingFamilyMember && (familyMembers?.length || 0) + (familyInvites?.length || 0) < 4 && (
            <button className="form-button" onClick={showNewMemberInfo}>{t("AddFamilyMember")}</button>
          )
        }

        {!member.infamily && memberships && (
          <Memberships memberships={memberships} />
        )}
      </div>
    </div>
  );
};

Account.propTypes = {
  /** The member object for the current user */
  member: PropTypes.object,
  /** The memberships of the current member, only if it is a paying member */
  memberships: PropTypes.array,
  /** The family members of a paying member on the family plan */
  familyMembers: PropTypes.array,
  /** Pending invites for family members */
  familyInvites: PropTypes.array,
  /** The status containing start and enddates for regular and lab membership, current family status and type of membership */
  status: PropTypes.object,
  /** The paying member (either self or family payer) */
  paying: PropTypes.object,
  /** Callback to invite a new family member by email */
  addFamilyInvite: PropTypes.func,
  /** Callback to cancel a pending family member invite */
  cancelFamilyInvite: PropTypes.func,
  /** Callback to remove an accepted family member */
  removeFamilyMember: PropTypes.func,
};

export default Account;
