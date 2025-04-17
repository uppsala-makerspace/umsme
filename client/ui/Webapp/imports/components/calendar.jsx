import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "./langueSwitcher";
import { HamburgerMenu } from "./HamburgerMenu";
import { useTranslation } from "react-i18next";

export const calendar = () => {
  const user = Meteor.userId();
  const { t, i18n } = useTranslation();
  return (
    <div>
      <div>
        <LanguageSwitcher />
        <HamburgerMenu />
      </div>
      <div className="login-form">{t("calender")}</div>
    </div>
  );
};
