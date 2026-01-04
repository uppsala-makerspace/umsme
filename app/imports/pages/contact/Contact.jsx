import React from "react";
import { useTranslation } from "react-i18next";

const Contact = () => {
  const { t } = useTranslation();

  return (
    <>
      <h3 className="text-h3">{t("contactUs")}</h3>

      <section className="mt-4">
        <h4 className="font-bold mb-2">{t("contactBoard")}</h4>
        <p className="text-sm mb-2">{t("contactBoardDescription")}</p>
        <ul className="text-sm list-disc ml-5">
          <li>
            <a href="mailto:kansliet@uppsalamakerspace.se" className="text-blue-600 underline">
              kansliet@uppsalamakerspace.se
            </a>
          </li>
          <li>
            {t("slackChannel")}: <strong>#fråga-styrelsen</strong>
          </li>
        </ul>
        <p className="text-sm mt-2">
          {t("checkBeforeContact")}{" "}
          <a href="https://www.uppsalamakerspace.se/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{t("webpage")}</a>
          {t("our")}
          {" "}<a href="https://wiki.uppsalamakerspace.se/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{t("wiki")}</a>
          {" "}{t("especially")}{" "}
          <a href="https://www.uppsalamakerspace.se/vanliga-fragor/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{t("faq")}</a>{" "}
        </p>
      </section>

      <section className="mt-6">
        <h4 className="font-bold mb-2">{t("boardInformation")}</h4>
        <p className="text-sm mb-2">{t("boardInformationDescription")}</p>
        <ul className="text-sm list-disc ml-5">
          <li>{t("infoNewsletter")}</li>
          <li>{t("infoSlackGeneral")}</li>
          <li>{t("infoCalendar")}</li>
          <li>{t("infoBlogpost")}</li>
        </ul>
      </section>

      <section className="mt-6">
        <h4 className="font-bold mb-2">{t("memberCommunication")}</h4>
        <p className="text-sm mb-2">{t("memberCommunicationDescription")}</p>
        <ul className="text-sm list-disc ml-5">
          <li>
            <strong>#lokalen</strong> - {t("channelLokalenDescription")}
          </li>
          <li>
            <strong>#random</strong> - {t("channelRandomDescription")}
          </li>
        </ul>
        <p className="text-sm mt-2">{t("moreChannelsDescription")}</p>
      </section>
    </>
  );
};

export default Contact;
