"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentTable } from "@/components/knowledge/DocumentTable";
import { PublicDocumentTable } from "@/components/knowledge/PublicDocumentTable";
import { UploadZone } from "@/components/knowledge/UploadZone";

const MY_DOCUMENTS_TAB = "my-documents";
const PUBLIC_DOCUMENTS_TAB = "public-documents";

export function KnowledgeWorkspace() {
  const [activeTab, setActiveTab] = useState(MY_DOCUMENTS_TAB);
  const [hasVisitedPublicDocuments, setHasVisitedPublicDocuments] = useState(false);

  function handleTabChange(value: unknown) {
    if (typeof value !== "string") return;
    setActiveTab(value);
    if (value === PUBLIC_DOCUMENTS_TAB) {
      setHasVisitedPublicDocuments(true);
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList aria-label="Knowledge workspace sections">
        <TabsTrigger value={MY_DOCUMENTS_TAB}>My documents</TabsTrigger>
        <TabsTrigger value={PUBLIC_DOCUMENTS_TAB}>Public documents</TabsTrigger>
      </TabsList>
      <TabsContent value={MY_DOCUMENTS_TAB} keepMounted className="space-y-8">
        <UploadZone />
        <DocumentTable />
      </TabsContent>
      <TabsContent value={PUBLIC_DOCUMENTS_TAB} keepMounted>
        {hasVisitedPublicDocuments && <PublicDocumentTable />}
      </TabsContent>
    </Tabs>
  );
}
