"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { embedBatch } from "@/lib/client/documents-api";
import { fetcher } from "@/lib/client/swr";
import type { DocumentItem } from "@faq-rag/shared";

interface EmbedServiceContextValue {
  triggerEmbed: (docId: string) => void;
  activeDocIds: Set<string>;
}

const EmbedServiceContext = createContext<EmbedServiceContextValue>({
  triggerEmbed: () => {},
  activeDocIds: new Set(),
});

export function EmbedServiceProvider({ children }: { children: React.ReactNode }) {
  const { mutate } = useSWRConfig();
  const activeRef = useRef<Set<string>>(new Set());
  const [activeDocIds, setActiveDocIds] = useState<Set<string>>(new Set());

  const triggerEmbed = useCallback(
    (docId: string) => {
      if (activeRef.current.has(docId)) return;
      activeRef.current.add(docId);
      setActiveDocIds(new Set(activeRef.current));

      void (async () => {
        try {
          while (true) {
            const result = await embedBatch(docId);
            void mutate("/api/documents");
            if (result.remaining === 0 || result.status !== "indexing") break;
          }
        } catch {
          void mutate("/api/documents");
        } finally {
          activeRef.current.delete(docId);
          setActiveDocIds(new Set(activeRef.current));
        }
      })();
    },
    [mutate],
  );

  // On mount: resume any documents that were mid-indexing
  useEffect(() => {
    void (async () => {
      const data = (await fetcher("/api/documents").catch(() => null)) as { items: DocumentItem[] } | null;
      if (!data?.items) return;
      for (const doc of data.items) {
        if (doc.status === "indexing") triggerEmbed(doc.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <EmbedServiceContext.Provider value={{ triggerEmbed, activeDocIds }}>{children}</EmbedServiceContext.Provider>;
}

export function useEmbedService() {
  return useContext(EmbedServiceContext);
}
