"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Citation } from "@/lib/schemas/session";

export type { Citation };

interface Props {
  open: boolean;
  onClose: () => void;
  citation: Citation | null;
}

export function CitationDrawer({ open, onClose, citation }: Props) {
  return (
    <Drawer open={open} onClose={onClose}>
      <DrawerContent aria-describedby={undefined}>
        <div className="w-full md:mx-auto md:w-[80%]">
          <DrawerHeader>
            <DrawerTitle>{citation ? `[^${citation.id}] ${citation.documentName}` : "Citation"}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="max-h-[60vh] px-4 pb-6">
            {citation && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Badge variant="secondary">score {citation.score.toFixed(3)}</Badge>
                  <Badge variant="outline">{citation.documentName}</Badge>
                </div>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">{citation.preview}</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
