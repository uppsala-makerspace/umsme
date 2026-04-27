import React from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import MainContent from "/imports/components/MainContent";
import { useBlocks } from "/imports/hooks/useBlocks";

// Context is fixed for the tool web setup; the entry id is the :id route param.
// See /toolweb.js routes mapping: /tool/(.+)$ → store/1/resource/${1}
const TOOLWEB_CONTEXT = "1";

export default function ToolDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  useBlocks(`toolDetail`);

  return (
    <Layout>
      <MainContent>
        <Link to="/tool" className="text-sm text-gray-600 no-underline">
          &larr; {t("back")}
        </Link>
        <div
          data-entryscape="toolDetail"
          data-entryscape-entry={id}
          data-entryscape-context={TOOLWEB_CONTEXT}
          className="mt-3"
        />
      </MainContent>
    </Layout>
  );
}
