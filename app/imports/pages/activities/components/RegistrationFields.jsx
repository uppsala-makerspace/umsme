import React from "react";
import { useTranslation } from "react-i18next";
import { checkInSettings, DEFAULT_CHECK_IN } from "/imports/common/lib/activityRules";
import { TextField, SelectField, CheckField, Row, Card } from "./fields";

/**
 * How one signs up, as in admin: whether, how many, how few make it happen,
 * a queue, information asked for, a certificate required, and check-in, with
 * its window: the default's (shown, not to edit) or a custom one. On an event
 * of an activity (`inherited`) empty is as the activity; there the yes/no
 * fields are three-way.
 */
const RegistrationFields = ({ values, onChange, choices, inherited = null, event = false }) => {
  const { t } = useTranslation();
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
  // Whether it asks for information, its own or as the activity: then the field's help text.
  const asksInfo = values.infoRequired === true || values.infoRequired === "yes"
    || (values.infoRequired === "" && !!inherited?.infoRequired);
  const ownCheckIn = values.checkIn || (inherited ? "" : "none");
  const checkIn = ownCheckIn || inherited?.checkIn || "none";
  const editable = ownCheckIn === "custom";
  const shown = editable ? null : checkInSettings(ownCheckIn ? { checkIn: ownCheckIn } : inherited);
  const checkIns = ["none", "default", "custom"].map((value) => ({ value, label: t(`registrationCheckIn_${value}`) }));
  // A custom window starts from the default's times, to change what differs.
  const chooseCheckIn = (value) => {
    onChange("checkIn", value);
    if (value !== "custom") return;
    for (const [name, setting] of [["checkInOpensDaysBefore", "opensDaysBefore"], ["checkInOpensAt", "opensAt"],
      ["checkInClosesDaysBefore", "closesDaysBefore"], ["checkInClosesAt", "closesAt"]]) {
      if (values[name] === "" || values[name] === undefined) onChange(name, String(DEFAULT_CHECK_IN[setting]));
    }
  };
  const windowField = (name, setting, label, inputMode) => (editable
    ? <TextField label={label} {...text(name, { inputMode })} />
    : <TextField id={`registration-${name}`} label={label} value={String(shown[setting])} onChange={() => {}} disabled />);

  return (
    <>
      <Card title={t("registrationHeading")}>
        <SelectField id="registration-registration" label={t("registrationFieldKind")} value={values.registration} onChange={set("registration")}
          empty={event ? (inherited ? asActivity(t(`registrationKind_${inherited.registration || "none"}`)) : t("registrationKind_none")) : undefined}
          options={kinds} />
        {registration !== "none" && (
          <>
            <Row>
              <TextField label={t("registrationFieldSeats")} hint={t("registrationFieldSeatsHint")} {...text("maxSeats", { inputMode: "numeric" })} />
              <TextField label={t("registrationFieldFewest")} hint={t("registrationFieldFewestHint")} {...text("minSeats", { inputMode: "numeric" })} />
            </Row>
            {flag("infoRequired", t("registrationFieldInfo"))}
            {asksInfo && <TextField label={t("registrationFieldInfoPlaceholder")} hint={t("registrationFieldInfoPlaceholderHint")} {...text("infoPlaceholder")} />}
            {flag("queueAllowed", t("registrationFieldQueue"))}
          </>
        )}
      </Card>
      {registration !== "none" && (
        <Card title={t("formCardCheckIn")}>
          <SelectField id="registration-checkIn" label={t("registrationFieldCheckIn")} hint={t("registrationFieldCheckInHint")}
            value={values.checkIn} onChange={chooseCheckIn}
            empty={event ? (inherited ? asActivity(t(`registrationCheckIn_${inherited.checkIn || "none"}`)) : t("registrationCheckIn_none")) : undefined}
            options={checkIns} />
          {checkIn !== "none" && (
            <>
              <Row>
                {windowField("checkInOpensDaysBefore", "opensDaysBefore", t("registrationFieldOpensDays"), "numeric")}
                {windowField("checkInOpensAt", "opensAt", t("registrationFieldOpensAt"), "numeric")}
              </Row>
              <Row>
                {windowField("checkInClosesDaysBefore", "closesDaysBefore", t("registrationFieldClosesDays"), "numeric")}
                {windowField("checkInClosesAt", "closesAt", t("registrationFieldClosesAt"), "numeric")}
              </Row>
            </>
          )}
        </Card>
      )}
    </>
  );
};

export default RegistrationFields;
