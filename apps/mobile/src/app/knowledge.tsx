import { useState, useCallback, memo } from "react";
import { View, Text, Pressable, Modal, ActivityIndicator, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { DocumentItem } from "@faq-rag/shared";
import { useDocuments } from "@/hooks/useDocuments";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { UploadProgressModal } from "@/components/knowledge/UploadProgressModal";
import { IconButton } from "@/components/ui/icon-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/logger";
import { formatBytes } from "@/lib/utils/format";
import { relativeDate } from "@/lib/utils/relative-date";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useThemeVars } from "@/hooks/useThemeVars";

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
      className="border-b border-border-muted bg-background px-4 py-3 active:bg-pressed"
      testID={`doc-row-${doc.id}`}
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 flex-row items-center gap-2">
          <Text className="shrink text-sm font-medium text-foreground" numberOfLines={1}>
            {doc.name}
          </Text>
          {doc.isBuiltIn && (
            <View className="rounded-full border border-border px-1.5 py-0.5">
              <Text className="text-[10px] text-muted-foreground">built-in</Text>
            </View>
          )}
        </View>
        <StatusBadge status={doc.status} />
      </View>
      <Text className="mt-1 text-xs text-muted-foreground">
        {formatBytes(doc.sizeBytes)} · {chunkLabel(doc)} · {relativeDate(new Date(doc.createdAt).getTime())}
      </Text>
      {doc.status === "failed" && expanded && doc.errorMsg && (
        <Text className="mt-1.5 text-xs text-destructive">{doc.errorMsg}</Text>
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
  const colors = useThemeColors();
  const vars = useThemeVars();

  return (
    <Modal visible={doc !== null} transparent animationType="fade" onRequestClose={onClose}>
      {/* Modal content is portaled outside the DOM subtree that carries our
          CSS-variable tokens on react-native-web, so re-apply them here. */}
      <Pressable style={vars} className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-2xl bg-card pb-8 pt-2" onPress={(e) => e.stopPropagation()}>
          <Text className="px-5 py-3 text-xs font-medium uppercase text-subtle-foreground" numberOfLines={1}>
            {doc?.name}
          </Text>
          <Pressable
            className={`flex-row items-center gap-3 px-5 py-3.5 active:bg-pressed ${canReindex ? "" : "opacity-40"}`}
            disabled={!canReindex}
            onPress={() => {
              onClose();
              onReindex();
            }}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.icon} />
            <Text className="text-base text-foreground">Reindex</Text>
          </Pressable>
          <Pressable
            className="flex-row items-center gap-3 px-5 py-3.5 active:bg-pressed"
            onPress={() => {
              onClose();
              onDelete();
            }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            <Text className="text-base text-destructive">Delete</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function KnowledgeScreen() {
  const { documents, error, isLoading, refetch, handleDelete, handleReindex } = useDocuments();
  const { state: uploadState, pickAndUpload, reset: resetUpload } = useDocumentUpload();
  const [actionDoc, setActionDoc] = useState<DocumentItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const colors = useThemeColors();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

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
        logger.warn("Reindex failed:", err instanceof Error ? err.message : String(err));
      });
    },
    [handleReindex],
  );

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: "Knowledge", animation: "none" }} />

      <ScreenHeader>
        <IconButton
          icon="chevron-back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          accessibilityLabel="Go back"
          size={26}
        />
        <Text numberOfLines={1} className="flex-1 px-1 text-center text-base font-semibold text-foreground">
          Knowledge
        </Text>
        <IconButton
          icon="cloud-upload-outline"
          onPress={() => void pickAndUpload()}
          disabled={uploadState.phase !== "idle" && uploadState.phase !== "error"}
          accessibilityLabel="Upload document"
          testID="upload-button"
          size={26}
        />
      </ScreenHeader>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Text className="text-center text-sm text-destructive">{error}</Text>
          <Pressable
            className="rounded-full border border-border px-4 py-1.5 active:bg-pressed"
            onPress={() => void refetch()}
          >
            <Text className="text-sm text-muted-foreground">Retry</Text>
          </Pressable>
        </View>
      ) : documents.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-muted-foreground">No documents yet</Text>
        </View>
      ) : (
        <FlashList
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.icon} />
          }
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
