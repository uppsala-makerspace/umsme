import React from "react";
import { useTranslation } from "react-i18next";
import { localized } from "/imports/common/lib/groupRules";
import { TextField, SelectField, CheckField, Row } from "./fields";

/**
 * The fields an activity and an event share. On an event of an activity
 * (`inherited`, the activity as stored) what is left empty is the activity's:
 * its value shows greyed in the field, and a choice offers "as the activity".
 * `event` makes the yes/no fields three-way rather than checkboxes.
 */
const SharedFields = ({ values, onChange, choices, inherited = null, event = false }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const set = (name) => (value) => onChange(name, value);
  const hint = (value) => (inherited && value !== undefined && value !== null && value !== "" ? String(value) : undefined);
  const text = (name, field, lang2) => ({
    id: `activity-${name}`,
    value: values[name],
    onChange: set(name),
    placeholder: hint(lang2 ? inherited?.[field]?.[lang2] : inherited?.[field]),
  });
  const options = (docs) => docs.map((d) => ({ value: d._id, label: localized(d.name, lang) || d._id }));
  const none = (field, docs) => {
    const id = inherited?.[field];
    const doc = id && docs.find((d) => d._id === id);
    return doc ? t("activityFieldAsActivity", { value: localized(doc.name, lang) }) : t("activityFieldNone");
  };
  const yesNo = (value) => t(value ? "activityYes" : "activityNo");
  const flag = (name, label) => (event ? (
    <SelectField id={`activity-${name}`} label={label} value={values[name]} onChange={set(name)}
      empty={inherited ? t("activityFieldAsActivity", { value: yesNo(inherited[name]) }) : t("activityNo")}
      options={[{ value: "yes", label: t("activityYes") }, { value: "no", label: t("activityNo") }]} />
  ) : (
    <CheckField id={`activity-${name}`} label={label} checked={!!values[name]} onChange={set(name)} />
  ));

  return (
    <>
      <Row>
        <TextField label={t("activityFieldNameSv")} required={!inherited} {...text("nameSv", "name", "sv")} />
        <TextField label={t("activityFieldNameEn")} {...text("nameEn", "name", "en")} />
      </Row>
      <TextField multiline label={t("activityFieldDescriptionSv")} {...text("descriptionSv", "description", "sv")} />
      <TextField multiline label={t("activityFieldDescriptionEn")} {...text("descriptionEn", "description", "en")} />
      <Row>
        <SelectField id="activity-categoryId" label={t("activityFieldCategory")} value={values.categoryId} onChange={set("categoryId")}
          empty={none("categoryId", choices.categories)} options={options(choices.categories)} />
        <SelectField id="activity-workshopId" label={t("activityFieldWorkshop")} value={values.workshopId} onChange={set("workshopId")}
          empty={none("workshopId", choices.workshops)} options={options(choices.workshops)} />
      </Row>
      <Row>
        <SelectField id="activity-spaceId" label={t("activityFieldSpace")} value={values.spaceId} onChange={set("spaceId")}
          empty={none("spaceId", choices.spaces)} options={options(choices.spaces)} />
        <TextField label={t("activityFieldDuration")} inputMode="numeric" {...text("durationMinutes", "durationMinutes")} />
        <TextField label={t("activityFieldCost")} inputMode="decimal" {...text("cost", "cost")} />
      </Row>
      <Row>
        <TextField label={t("activityFieldSlack")} {...text("slackChannel", "slackChannel")} />
        <TextField label={t("activityFieldContact")} type="email" {...text("contactEmail", "contactEmail")} />
      </Row>
      <Row>
        {flag("membersOnly", t("activityFieldMembersOnly"))}
        {flag("published", t("activityFieldPublished"))}
      </Row>
    </>
  );
};

export default SharedFields;
