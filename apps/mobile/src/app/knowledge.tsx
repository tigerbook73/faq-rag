import { useState, useCallback, memo } from "react";
import { View, Text, FlatList, Pressable, Modal, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import type { DocumentItem } from "@faq-rag/shared";
import { useDocuments } from "../hooks/useDocuments";
import { useDocumentUpload } from "../hooks/useDocumentUpload";
import { UploadProgressModal } from "../components/knowledge/UploadProgressModal";
import { IconButton } from "../components/ui/icon-button";
import { Badge } from "../components/ui/badge";
import { formatBytes } from "../lib/utils/format";
import { relativeDate } from "../lib/utils/relative-date";

const STATUS_TONE: Record<DocumentItem["status"], { tone: "success" | "info" | "danger" | "neutral"; label: string }> =
  {
    indexed: { tone: "success", label: "indexed" },
    indexing: { tone: "info", label: "indexing" },
    failed: { tone: "danger", label: "failed" },
    pending: { tone: "neutral", label: "pending" },
    uploaded: { tone: "neutral", label: "uploaded" },
  };

function StatusBadge({ status }: { status: DocumentItem["status"] }) {
  const s = STATUS_TONE[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

function chunkLabel(doc: DocumentItem): string {
  if (doc.status === "indexing" && doc.totalChunks) return `${doc._count.chunks} / ${doc.totalChunks} chunks`;
  return `${doc._count.chunks} chunks`;
}

// memo + doc-parameterized callbacks keep unchanged rows from re-rendering on
// every 3s poll while a document is indexing.
const DocumentRow = memo(function DocumentRow({
  doc,
  expanded,
  onPress,
  onLongPress,
}: {
  doc: DocumentItem;
  expanded: boolean;
  onPress: (doc: DocumentItem) => void;
  onLongPress: (doc: DocumentItem) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(doc)}
      onLongPress={() => onLongPress(doc)}
      delayLongPress={400}
      className="border-b border-gray-100 bg-white px-4 py-3 active:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:active:bg-gray-900"
      testID={`doc-row-${doc.id}`}
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 flex-row items-center gap-2">
          <Text className="shrink text-sm font-medium text-gray-900 dark:text-gray-100" numberOfLines={1}>
            {doc.name}
          </Text>
          {doc.isBuiltIn && (
            <View className="rounded-full border border-gray-200 px-1.5 py-0.5 dark:border-gray-700">
              <Text className="text-[10px] text-gray-500 dark:text-gray-400">built-in</Text>
            </View>
          )}
        </View>
        <StatusBadge status={doc.status} />
      </View>
      <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {formatBytes(doc.sizeBytes)} · {chunkLabel(doc)} · {relativeDate(new Date(doc.createdAt).getTime())}
      </Text>
      {doc.status === "failed" && expanded && doc.errorMsg && (
        <Text className="mt-1.5 text-xs text-red-600 dark:text-red-400">{doc.errorMsg}</Text>
      )}
    </Pressable>
  );
});

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
  const { colorScheme } = useColorScheme();
  const reindexColor = colorScheme === "dark" ? "#e5e7eb" : "#1f2937";
  const deleteColor = colorScheme === "dark" ? "#f87171" : "#dc2626";

  return (
    <Modal visible={doc !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-2xl bg-white pb-8 pt-2 dark:bg-gray-900" onPress={(e) => e.stopPropagation()}>
          <Text className="px-5 py-3 text-xs font-medium uppercase text-gray-400 dark:text-gray-500" numberOfLines={1}>
            {doc?.name}
          </Text>
          <Pressable
            className={`flex-row items-center gap-3 px-5 py-3.5 active:bg-gray-50 dark:active:bg-gray-800 ${canReindex ? "" : "opacity-40"}`}
            disabled={!canReindex}
            onPress={() => {
              onClose();
              onReindex();
            }}
          >
            <Ionicons name="refresh-outline" size={18} color={reindexColor} />
            <Text className="text-base text-gray-800 dark:text-gray-200">Reindex</Text>
          </Pressable>
          <Pressable
            className="flex-row items-center gap-3 px-5 py-3.5 active:bg-gray-50 dark:active:bg-gray-800"
            onPress={() => {
              onClose();
              onDelete();
            }}
          >
            <Ionicons name="trash-outline" size={18} color={deleteColor} />
            <Text className="text-base text-red-600 dark:text-red-400">Delete</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function KnowledgeScreen() {
  const { documents, isLoading, handleDelete, handleReindex } = useDocuments();
  const { state: uploadState, pickAndUpload, reset: resetUpload } = useDocumentUpload();
  const [actionDoc, setActionDoc] = useState<DocumentItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = useCallback((doc: DocumentItem) => {
    setExpandedId((cur) => (cur === doc.id ? null : doc.id));
  }, []);

  const openActions = useCallback((doc: DocumentItem) => {
    if (!doc.isBuiltIn) setActionDoc(doc);
  }, []);

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
    <View className="flex-1 bg-white dark:bg-gray-950">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Knowledge",
          headerBackTitle: "Back",
          headerRight: () => (
            <IconButton
              icon="cloud-upload-outline"
              onPress={() => void pickAndUpload()}
              disabled={uploadState.phase !== "idle" && uploadState.phase !== "error"}
              accessibilityLabel="Upload document"
              testID="upload-button"
            />
          ),
        }}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : documents.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-gray-500 dark:text-gray-400">No documents yet</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => (
            <DocumentRow
              doc={item}
              expanded={expandedId === item.id}
              onPress={toggleExpanded}
              onLongPress={openActions}
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

      <UploadProgressModal state={uploadState} onDismiss={resetUpload} />
    </View>
  );
}
