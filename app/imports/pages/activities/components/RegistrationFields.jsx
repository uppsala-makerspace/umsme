import React from "react";
import { useTranslation } from "react-i18next";
import { localized } from "/imports/common/lib/groupRules";
import { TextField, SelectField, CheckField, DayField, ClockField, Row } from "./fields";

/**
 * How one signs up, as in admin: whether, how many, how few make it happen,
 * a queue, information asked for, a certificate required, and check-in. On
 * an event of an activity (`inherited`) empty is as the activity; there the
 * yes/no fields are three-way and the check-in deadline is asked for.
 */
const RegistrationFields = ({ values, onChange, choices, inherited = null, event = false }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const set = (name) => (value) => onChange(name, value);
  const yesNo = (value) => t(value ? "activityYes" : "activityNo");
  const asActivity = (value) => t("activityFieldAsActivity", { value });
  const text = (name, extra = {}) => ({
    id: `registration-${name}`, value: values[name], onChange: set(name),
    placeholder: inherited?.[name] !== undefined && inherited?.[name] !== null ? String(inherited[name]) : undefined,
    ...extra,
  });
  const flag = (name, label) => (event ? (
    <SelectField id={`registration-${name}`} label={label} value={values[name]} onChange={set(name)}
      empty={inherited ? asActivity(yesNo(inherited[name])) : t("activityNo")}
      options={[{ value: "yes", label: t("activityYes") }, { value: "no", label: t("activityNo") }]} />
  ) : (
    <CheckField id={`registration-${name}`} label={label} checked={!!values[name]} onChange={set(name)} />
  ));
  const kinds = ["none", "optional", "required"].map((value) => ({ value, label: t(`registrationKind_${value}`) }));
  const registration = values.registration || inherited?.registration || "none";
  const checkIn = values.checkInEnabled === true || values.checkInEnabled === "yes"
    || (values.checkInEnabled === "" && !!inherited?.checkInEnabled);
  const certificates = (choices.certificates || []).map((c) => ({ value: c._id, label: localized(c.name, lang) }));
  const certificateName = (id) => certificates.find((c) => c.value === id)?.label || id;

  return (
    <>
      <h3 className="text-lg mt-2 mb-3">{t("registrationHeading")}</h3>
      <Row>
        <SelectField id="registration-registration" label={t("registrationFieldKind")} value={values.registration} onChange={set("registration")}
          empty={event ? (inherited ? asActivity(t(`registrationKind_${inherited.registration || "none"}`)) : t("registrationKind_none")) : undefined}
          options={kinds} />
        <TextField label={t("registrationFieldSeats")} hint={t("registrationFieldSeatsHint")} {...text("maxSeats", { inputMode: "numeric" })} />
        <TextField label={t("registrationFieldFewest")} hint={t("registrationFieldFewestHint")} {...text("minSeats", { inputMode: "numeric" })} />
      </Row>
      {registration !== "none" && (
        <>
          <Row>
            {flag("queueAllowed", t("registrationFieldQueue"))}
            {flag("infoRequired", t("registrationFieldInfo"))}
          </Row>
          <Row>
            <TextField label={t("registrationFieldInfoPlaceholder")} {...text("infoPlaceholder")} />
            <SelectField id="registration-requiredCertificateId" label={t("registrationFieldCertificate")} value={values.requiredCertificateId}
              onChange={set("requiredCertificateId")}
              empty={inherited?.requiredCertificateId ? asActivity(certificateName(inherited.requiredCertificateId)) : t("activityFieldNone")}
              options={certificates} />
          </Row>
          <Row>
            {flag("checkInEnabled", t("registrationFieldCheckIn"))}
            {checkIn && (
              <TextField label={t("registrationFieldCheckInOpens")} hint={t("registrationFieldCheckInOpensHint")}
                {...text("checkInOpensHoursBefore", { inputMode: "numeric" })} />
            )}
          </Row>
          {event && checkIn && (
            <Row>
              <DayField id="registration-checkInDeadlineDay" label={t("registrationFieldDeadlineDay")} hint={t("registrationFieldDeadlineDayHint")}
                value={values.checkInDeadlineDay} onChange={set("checkInDeadlineDay")} />
              <ClockField id="registration-checkInDeadlineTime" label={t("registrationFieldDeadlineTime")} hint={t("registrationFieldDeadlineTimeHint")}
                value={values.checkInDeadlineTime} onChange={set("checkInDeadlineTime")} />
            </Row>
          )}
        </>
      )}
    </>
  );
};

export default RegistrationFields;
