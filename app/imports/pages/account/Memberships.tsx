import React from "react";
import { useTranslation } from "react-i18next";
import PropTypes from 'prop-types';
import { formatDate } from './util';

interface Membership {
  _id: string;
  type: string;
  start: Date;
  memberend?: Date;
  labend?: Date;
  discount?: boolean;
  family?: boolean;
}

interface MembershipsProps {
  memberships: Membership[];
}

const Memberships = ({ memberships = [] }: MembershipsProps) => {
  const { t, i18n } = useTranslation();

  const getMembershipTypeLabel = (membership: Membership): string => {
    const { type, discount, family } = membership;

    if (family) {
      switch (type) {
        case 'member':
          return t('memberFamilyBaseType');
        case 'lab':
        case 'labandmember':
          return t('memberFamilyLabType');
      }
    }

    switch (type) {
      case 'member':
        return discount ? t('memberDiscountedBaseType') : t('memberBaseType');
      case 'lab':
      case 'labandmember':
        return discount ? t('memberDiscountedLabType') : t('memberLabType');
      default:
        return type;
    }
  };

  const getEndDate = (membership: Membership): Date | undefined => {
    const { type, memberend, labend } = membership;
    if (type === 'lab') {
      return labend;
    }
    return memberend;
  };

  if (!memberships || memberships.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className='flex justify-between border-b-2 border-gray-600'>
        <span className='text-gray-600'>{t("MembershipHistory")}</span>
      </div>
      <div className="flex flex-col gap-2">
        {memberships.map((membership, index) => (
          <div key={membership._id || index} className="flex justify-between text-sm">
            <span className="font-medium">{getMembershipTypeLabel(membership)}</span>
            <span>
              {formatDate(membership.start, i18n.language)} - {getEndDate(membership) ? formatDate(getEndDate(membership)!, i18n.language) : '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

Memberships.propTypes = {
  /** Array of membership objects */
  memberships: PropTypes.array,
};

export default Memberships;
