import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { models } from "/imports/common/lib/models";

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
    <form onSubmit={handleSubmit} className="login-form">

      <div className="form-group">
        <label htmlFor="name">{t("Name")}</label>
        <input
          type="text"
          id="name"
          placeholder={t("names")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={nameMaxLength}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="mobile">{t("number")}</label>
        <input
          type="tel"
          id="mobile"
          placeholder="0701234567"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          maxLength={mobileMaxLength}
        />
      </div>

      <div className="form-group">
        <label htmlFor="birthyear">{t("birthyear")}</label>
        <input
          type="number"
          id="birthyear"
          placeholder="1990"
          value={birthyear}
          onChange={(e) => setBirthyear(e.target.value)}
          min="1900"
          max={new Date().getFullYear()}
        />
      </div>

      <button type="submit" className="form-button">
        {t("Save")}
      </button>
    </form>
  );
};
