import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "./langueSwitcher";
import { HamburgerMenu } from "./HamburgerMenu";
import { t } from "i18next";

export const calendar = () => {
  const user = Meteor.userId();
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
