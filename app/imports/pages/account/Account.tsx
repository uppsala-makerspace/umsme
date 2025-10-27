import { faHome, faPen, faSave, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import moment from 'moment';
import PropTypes from 'prop-types';
import { default as React, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';
import "./acounts.css";

interface INewFamilyMember {
  name?: string;
  email?: string;
}

interface INewFamilyMemberValidation {
  nameEmpty?: boolean,
  emailEmpty?: boolean,
  emailInvalid?: boolean,
  errorMassages?: string[]
}

const Account = ({ member, familyMembers, status }) => {
  const [addFamilyMemberMode, setAddFamilyMemberMode] = useState(false);
  const [newFamilyMemberInfo, setNewFamilyMemberInfo] = useState<INewFamilyMember>({});
  const [newFamilyMemberError, setNewFamilyMemberError] = useState<INewFamilyMemberValidation>({});


  const { t } = useTranslation();
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
      default:
        membershipType = 'fix';
    }
  }

  const payingFamilyMember = member.family && !!member.infamily;
  const daysRemaining = moment(status.memberEnd).diff(moment.now(), 'days');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateNewFamilyMemberInfo = (): boolean => {
    const validation: INewFamilyMemberValidation = {
      nameEmpty: false,
      emailEmpty: false,
      emailInvalid: false,
      errorMassages: []
    }

    const errors = []

    if (!newFamilyMemberInfo.name || newFamilyMemberInfo.name?.length == 0) {
      validation.nameEmpty = true
      errors.push(t("names"))
    }

    if (!newFamilyMemberInfo.email || newFamilyMemberInfo.email?.length == 0) {
      validation.emailEmpty = true
      errors.push(t("email"))
    } else {
      validation.emailInvalid = !validateEmail(newFamilyMemberInfo.email)
    }

    // Generate error messages
    if (errors.length > 0) {
      validation.errorMassages.push(errors.join(t("and")) + " " + t("CantBeEmpty"))
    }
    if (validation.emailInvalid) {
      validation.errorMassages.push(t("email") + " " + t("IsInvalid"))
    }

    setNewFamilyMemberError(validation)

    return !validation.nameEmpty && !validation.emailEmpty && !validation.emailInvalid
  }

  const saveNewMember = () => {
    if (validateNewFamilyMemberInfo()) {
      // Save new family member info here
      familyMembers.push({
        name: newFamilyMemberInfo.name,
        email: newFamilyMemberInfo.email,
      })

      setNewFamilyMemberInfo({})
      setAddFamilyMemberMode(false)
    }
  }

  const showNewMemberInfo = () => {
    setNewFamilyMemberError({})
    setAddFamilyMemberMode(true)
  }

  const handleUpdateNewFamilyMember = (field: "name" | "email", value: string) => {
    newFamilyMemberInfo[field] = value
    setNewFamilyMemberInfo(newFamilyMemberInfo)
  }

  const handleRemoveFamilyMember = (email: string) => {
    // Only paying family member can remove family members
    if (member.infamily != member._id) return;

    // Add a confirmation dialog here
    // Send family member's email to backend to be removed
    familyMembers = familyMembers.filter(fm => fm.email === email)
  }

  return (
    <div className='flex flex-col min-h-full h-svh flex-1 gap-5'>
      <div className='flex flex-col flex-1 gap-5'>
        <div className='border-b-2 border-black'>
          <FontAwesomeIcon icon={faHome} /> / <span className="text-lg font-bold"> {t("MyAccount")}</span>
        </div>
        <span className="font-bold text-center text-xl"> {member.name}</span>
        <div className='flex w-full justify-center relative'>
          <div className='absolute w-full h-full border'>
            <div className='flex h-1/3'></div>
            <div className='flex h-1/3 bg-gray-300'></div>
            <div className='flex h-1/3'></div>
          </div>
          <button className="relative round-prof bg-gray-300">
            <FontAwesomeIcon
              className='absolute top-0 right-0 border-4 bg-white border-gray-500 rounded-full w-8 h-8 p-1.5 text-gray-500'
              icon={faPen} />
          </button>
        </div>

        <div className='flex justify-around'>
          <div className='flex flex-col text-center gap-1'>
            <span className="middle-text text-gray-600">
              {t("TypeOfMembership")}
            </span>
            <span>{membershipType}</span>
          </div>
          <div className='flex flex-col text-center gap-1'>
            <span className="middle-text text-gray-600">
              {t("MemberID")}:
            </span>
            <span>{member.mid}</span>
          </div>
        </div>
        <div className='flex w-full justify-around'>
          <div className="flex flex-col text-center">
            <span className='text-gray-600'>{t("MemberSince")}</span>
            <span>{status.memberStart?.toLocaleDateString()}</span>
          </div>
          <div className="flex flex-col text-center">
            <span className='text-gray-600'>{t("EndDate")}</span>
            <span>{status.memberEnd?.toLocaleDateString()}</span>
            <span className={daysRemaining > 60 ? 'text-green-600' : 'text-red-600 font-bold'}>{daysRemaining} {t("daysRemaining")}</span>
          </div>
        </div>
      </div>

      <div className="middle-text flex flex-col gap-3">
        {payingFamilyMember && (
          <div>
            <div className='flex justify-between border-b-2 border-gray-600'>
              <span className='text-gray-600'>{t("FamilyMembers")}</span>
              <span className='text-gray-600 text-sm'>[{familyMembers?.length || 0}/4]</span>
            </div>
            <div className="">
              {familyMembers?.map((fm, index) => (
                <div key={index} className="family-row items-center">
                  <div className='flex flex-col'>
                    <span className="font-bold">{`${fm.name}`}</span>
                    <span className='text-sm'>{fm.email ? `${fm.email}` : ''}</span>
                  </div>
                  <FontAwesomeIcon className={'' + (member.infamily != member._id ? 'cursor-not-allowed text-gray-300' : 'cursor-pointer text-gray-600')} icon={faTrash} onClick={() => handleRemoveFamilyMember(fm.email)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {addFamilyMemberMode ?
          <>
            <form className='flex flex-col justify-stretch border rounded border-gray-400 p-1 gap-1 my-2'>
              <input
                id='family_member_name'
                className={'border rounded  !w-full !m-0 ' + (newFamilyMemberError.nameEmpty ? 'border-red-600' : 'border-gray-300')}
                type="text"
                name="name"
                placeholder={t("names")}
                autoFocus
                onChange={(e) => handleUpdateNewFamilyMember("name", e.target.value)}
              />

              <input
                id='family_member_email'
                className={'border rounded  !w-full !m-0 ' + (newFamilyMemberError.emailEmpty || newFamilyMemberError.emailInvalid ? 'border-red-600' : 'border-gray-300')}
                type="email"
                placeholder={t("email")}
                onChange={(e) => handleUpdateNewFamilyMember("email", e.target.value)}
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
          payingFamilyMember && familyMembers?.length < 4 && (
            <Link to="/addFamilyMember" className="wideButton flex self-center">
              <button className="form-button" onClick={showNewMemberInfo}>{t("AddFamilyMember")}</button>
            </Link>
          )
        }
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
  /** The status containing start and enddates for regular and lab membership, current family status and type of membership */
  status: PropTypes.object,
  arr: PropTypes.array
};

export default Account;
