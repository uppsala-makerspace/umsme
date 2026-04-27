import React from "react";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import MainContent from "/imports/components/MainContent";
import { useBlocks } from "/imports/hooks/useBlocks";
import { useBlocksRouteNavigation } from "/imports/hooks/useBlocksRouteNavigation";

export default function Tool() {
  const { t } = useTranslation();
  useBlocks("toolSearch");
  useBlocksRouteNavigation();

  return (
    <Layout>
      <MainContent>
        <h1 className="text-2xl font-bold mb-4">{t("toolsTitle")}</h1>
        <div data-entryscape="toolSearchInput" />
        <div data-entryscape="toolSearchFilters" />
        <div data-entryscape="toolSearchResults" />
      </MainContent>
    </Layout>
  );
}
