import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { models } from "/imports/common/lib/models";
import Button from "../../components/Button";
import Input from "../../components/Input";
import MainContent from "../../components/MainContent";

export default ({ onSubmit, initialName = "", initialMobile = "", initialBirthyear = "", initialGender = "", initialRfid = "" }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [mobile, setMobile] = useState(initialMobile);
  const [birthyear, setBirthyear] = useState(initialBirthyear);
  const [gender, setGender] = useState(initialGender);
  const [rfid, setRfid] = useState(initialRfid);

  const nameMaxLength = models.member.name.max;
  const mobileMaxLength = models.member.mobile.max;

  const rfidMaxLength = models.member.rfid.max;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, mobile, birthyear, gender, rfid });
  };

  return (
    <MainContent>
    <form onSubmit={handleSubmit}>

      <Input
        label={`${t("Name")} *`}
        id="name"
        type="text"
        placeholder={t("names")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={nameMaxLength}
        required
      />

      <div className="w-full mb-4">
        <label htmlFor="gender" className="block mb-1 font-bold">
          {t("gender")} **
        </label>
        <select
          id="gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="select-chevron appearance-none pr-10 w-full py-2.5 px-3 text-base font-mono bg-surface border border-black rounded box-border focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
        >
          <option value=""></option>
          <option value="male">{t("genderMale")}</option>
          <option value="female">{t("genderFemale")}</option>
          <option value="undisclosed">{t("genderUndisclosed")}</option>
        </select>
      </div>

      <Input
        label={`${t("birthyear")} **`}
        id="birthyear"
        type="number"
        placeholder="1990"
        value={birthyear}
        onChange={(e) => setBirthyear(e.target.value)}
        min="1900"
        max={new Date().getFullYear()}
      />

      <Input
        label={t("number")}
        id="mobile"
        type="tel"
        placeholder="0701234567"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        maxLength={mobileMaxLength}
      />

      <Input
        label={`${t("rfid")} ***`}
        id="rfid"
        type="text"
        placeholder="A1B2C3D4"
        value={rfid}
        onChange={(e) => setRfid(e.target.value.toUpperCase())}
        maxLength={rfidMaxLength}
        pattern="([0-9A-Fa-f]{2})+"
      />

      <Button type="submit" fullWidth className="mt-8">
        {t("Save")}
      </Button>

      <p className="text-sm text-gray-500 mt-4">
        * {t("requiredFieldExplanation")}
      </p>
      <p className="text-sm text-gray-500 mt-2">
        ** {t("recommendedFieldsExplanation")}
      </p>
      <p className="text-sm text-gray-500 mt-2">
        *** {t("rfidExplanation")}
      </p>
    </form>
    </MainContent>
  );
};
