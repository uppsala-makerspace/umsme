import React from "react";
import { useTranslation } from "react-i18next";
import { Card } from "./fields";
import { FlagField } from "./SharedFields";

/**
 * Visibility: what of an activity or event the website shows. Whether it is
 * on the website at all, and whether its hosts are named there, by first name
 * only. An event of an activity takes either from the activity unless it says
 * otherwise; an activity's choice for the hosts applies to its events, since
 * the hosts are chosen per event.
 */
const VisibilityFields = ({ values, onChange, inherited = null, event = false }) => {
  const { t } = useTranslation();
  const flag = (name, label) => <FlagField name={name} label={label} values={values} onChange={onChange} inherited={inherited} event={event} />;
  return (
    <Card title={t("formCardVisibility")} kind={event ? "event" : "activity"}>
      {flag("published", t("activityFieldPublished"))}
      {flag("hostsPublished", t("activityFieldHostsPublished"))}
      <p className="text-gray-500 -mt-2 mb-2 text-xs">
        {t(event ? "activityFieldHostsPublishedHintEvent" : "activityFieldHostsPublishedHint")}
      </p>
    </Card>
  );
};

export default VisibilityFields;
