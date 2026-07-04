import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, Modal, ActivityIndicator } from "react-native";
import type { DocumentItem } from "@faq-rag/shared";
import { useDocuments } from "../../src/hooks/useDocuments";
import { formatBytes } from "../../src/lib/utils/format";
import { relativeDate } from "../../src/lib/utils/relative-date";

const STATUS_STYLE: Record<DocumentItem["status"], { badge: string; text: string; label: string }> = {
  indexed: { badge: "bg-green-100", text: "text-green-700", label: "indexed" },
  indexing: { badge: "bg-blue-100", text: "text-blue-700", label: "indexing" },
  failed: { badge: "bg-red-100", text: "text-red-700", label: "failed" },
  pending: { badge: "bg-gray-100", text: "text-gray-600", label: "pending" },
  uploaded: { badge: "bg-gray-100", text: "text-gray-600", label: "uploaded" },
};

function StatusBadge({ status }: { status: DocumentItem["status"] }) {
  const s = STATUS_STYLE[status];
  return (
    <View className={`rounded-full px-2 py-0.5 ${s.badge}`}>
      <Text className={`text-xs font-medium ${s.text}`}>{s.label}</Text>
    </View>
  );
}

function chunkLabel(doc: DocumentItem): string {
  if (doc.status === "indexing" && doc.totalChunks) return `${doc._count.chunks} / ${doc.totalChunks} chunks`;
  return `${doc._count.chunks} chunks`;
}

function DocumentRow({
  doc,
  expanded,
  onPress,
  onLongPress,
}: {
  doc: DocumentItem;
  expanded: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      className="border-b border-gray-100 bg-white px-4 py-3 active:bg-gray-50"
      testID={`doc-row-${doc.id}`}
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 flex-row items-center gap-2">
          <Text className="shrink text-sm font-medium text-gray-900" numberOfLines={1}>
            {doc.name}
          </Text>
          {doc.isBuiltIn && (
            <View className="rounded-full border border-gray-200 px-1.5 py-0.5">
              <Text className="text-[10px] text-gray-500">built-in</Text>
            </View>
          )}
        </View>
        <StatusBadge status={doc.status} />
      </View>
      <Text className="mt-1 text-xs text-gray-500">
        {formatBytes(doc.sizeBytes)} · {chunkLabel(doc)} · {relativeDate(new Date(doc.createdAt).getTime())}
      </Text>
      {doc.status === "failed" && expanded && doc.errorMsg && (
        <Text className="mt-1.5 text-xs text-red-600">{doc.errorMsg}</Text>
      )}
    </Pressable>
  );
}

function DocumentActionSheet({
  doc,
  onReindex,
  onDelete,
  onClose,
}: {
  doc: DocumentItem | null;
  onReindex: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const canReindex = doc?.status === "indexed" || doc?.status === "failed";
  return (
    <Modal visible={doc !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-2xl bg-white pb-8 pt-2" onPress={(e) => e.stopPropagation()}>
          <Text className="px-5 py-3 text-xs font-medium uppercase text-gray-400" numberOfLines={1}>
            {doc?.name}
          </Text>
          <Pressable
            className={`px-5 py-3.5 active:bg-gray-50 ${canReindex ? "" : "opacity-40"}`}
            disabled={!canReindex}
            onPress={() => {
              onClose();
              onReindex();
            }}
          >
            <Text className="text-base text-gray-800">Reindex</Text>
          </Pressable>
          <Pressable
            className="px-5 py-3.5 active:bg-gray-50"
            onPress={() => {
              onClose();
              onDelete();
            }}
          >
            <Text className="text-base text-red-600">Delete</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function KnowledgeScreen() {
  const { documents, isLoading, handleDelete, handleReindex } = useDocuments();
  const [actionDoc, setActionDoc] = useState<DocumentItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const startReindex = useCallback(
    (doc: DocumentItem) => {
      // Failure rolls the optimistic status back via revalidation inside the
      // hook; Alert is a no-op on react-native-web, so just log here.
      handleReindex(doc.id).catch((err) => {
        console.warn("Reindex failed:", err instanceof Error ? err.message : String(err));
      });
    },
    [handleReindex],
  );

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
        <Text className="text-lg font-semibold text-gray-800">Knowledge</Text>
        {/* Upload flow lands in Step 6 */}
        <View className="rounded-lg bg-gray-200 px-3 py-1.5">
          <Text className="text-sm font-medium text-gray-400">Upload</Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : documents.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-gray-500">No documents yet</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => (
            <DocumentRow
              doc={item}
              expanded={expandedId === item.id}
              onPress={() => setExpandedId((cur) => (cur === item.id ? null : item.id))}
              onLongPress={() => {
                if (!item.isBuiltIn) setActionDoc(item);
              }}
            />
          )}
        />
      )}

      <DocumentActionSheet
        doc={actionDoc}
        onReindex={() => actionDoc && startReindex(actionDoc)}
        onDelete={() => actionDoc && void handleDelete(actionDoc.id)}
        onClose={() => setActionDoc(null)}
      />
    </View>
  );
}
