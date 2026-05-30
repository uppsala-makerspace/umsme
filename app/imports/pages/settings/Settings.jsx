import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import MainContent from "../../components/MainContent";

const PAGE_OPTIONS = [
  { value: "home", labelKey: "navHome" },
  { value: "unlock", labelKey: "navDoors" },
  { value: "map", labelKey: "navMap" },
  { value: "calendar", labelKey: "navCalendar" },
];

export default ({ defaultPage, onChangeDefaultPage }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <MainContent>
      <div className="flex flex-col gap-6">
        <h3 className="text-center">{t("settings")}</h3>

        <section>
          <h4 className="font-bold mb-1">{t("defaultPage")}</h4>
          <p className="text-sm text-gray-600 mb-3">{t("defaultPageInfo")}</p>
          <div className="flex flex-col gap-2">
            {PAGE_OPTIONS.map(({ value, labelKey }) => (
              <label
                key={value}
                className="flex items-center gap-3 p-3 border border-gray-300 rounded cursor-pointer bg-white hover:border-brand-green"
              >
                <input
                  type="radio"
                  name="default-page"
                  value={value}
                  checked={defaultPage === value}
                  onChange={() => onChangeDefaultPage(value)}
                  className="w-[18px] h-[18px] accent-brand-green"
                />
                <span className="font-medium">{t(labelKey)}</span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate("/notification-settings")}
          >
            {t("notificationSettings")}
          </Button>
        </section>
      </div>
    </MainContent>
  );
};
