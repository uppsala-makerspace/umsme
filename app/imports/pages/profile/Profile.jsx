import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { models } from "/imports/common/lib/models";
import Button from "../../components/Button";
import Input from "../../components/Input";
import MainContent from "../../components/MainContent";

export default ({ onSubmit, initialName = "", initialMobile = "", initialBirthyear = "" }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [mobile, setMobile] = useState(initialMobile);
  const [birthyear, setBirthyear] = useState(initialBirthyear);

  const nameMaxLength = models.member.name.max;
  const mobileMaxLength = models.member.mobile.max;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, mobile, birthyear });
  };

  return (
    <MainContent>
    <form onSubmit={handleSubmit}>

      <Input
        label={t("Name")}
        id="name"
        type="text"
        placeholder={t("names")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={nameMaxLength}
        required
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
        label={t("birthyear")}
        id="birthyear"
        type="number"
        placeholder="1990"
        value={birthyear}
        onChange={(e) => setBirthyear(e.target.value)}
        min="1900"
        max={new Date().getFullYear()}
      />

      <Button type="submit" fullWidth>
        {t("Save")}
      </Button>
    </form>
    </MainContent>
  );
};
