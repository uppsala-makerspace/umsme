import React from "react";
import { useTranslation } from "react-i18next";
import PropTypes from 'prop-types';
import { formatDate } from './util';

const Memberships = ({ memberships = [] }) => {
  const { t, i18n } = useTranslation();

  const getMembershipTypeLabel = (membership) => {
    const { type, discount, family } = membership;

    if (family) {
      switch (type) {
        case 'member':
          return t('familyBaseType');
        case 'lab':
        case 'labandmember':
          return t('familyLabType');
      }
    }

    switch (type) {
      case 'member':
        return discount ? t('memberDiscountedBaseType') : t('memberBaseType');
      case 'lab':
        return t('memberQuarterlyLabType');
      case 'labandmember':
        return discount ? t('memberDiscountedLabType') : t('memberLabType');
      default:
        return type;
    }
  };

  const getEndDate = (membership) => {
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
              {formatDate(membership.start, i18n.language)} - {getEndDate(membership) ? formatDate(getEndDate(membership), i18n.language) : '-'}
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
