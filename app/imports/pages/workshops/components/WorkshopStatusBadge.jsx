import React from "react";
import { useTranslation } from "react-i18next";

const variantClasses = {
  established: "bg-green-100 text-green-800",
  trial: "bg-amber-100 text-amber-800",
  forming: "bg-blue-100 text-blue-800",
  decommissioned: "bg-gray-100 text-gray-500",
};

const labelKeys = {
  established: "workshopStatusEstablished",
  trial: "workshopStatusTrial",
  forming: "workshopStatusForming",
  decommissioned: "workshopStatusDecommissioned",
};

// Status marker per the guideline: members should clearly see when a workshop
// is on trial (or forming/being decommissioned). Established renders nothing
// unless showEstablished is set.
const WorkshopStatusBadge = ({ status, showEstablished = false, className = "" }) => {
  const { t } = useTranslation();
  if (!status || (status === "established" && !showEstablished)) return null;
  const colors = variantClasses[status] || variantClasses.forming;
  return (
    <span className={`inline-block text-xs font-semibold rounded-full py-0.5 px-2 ${colors} ${className}`}>
      {t(labelKeys[status] || status)}
    </span>
  );
};

export default WorkshopStatusBadge;
