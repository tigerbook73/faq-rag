import { Modal, View, Text, Pressable, ActivityIndicator } from "react-native";
import type { UploadState } from "../../hooks/useDocumentUpload";

function phaseLabel(state: UploadState): string {
  switch (state.phase) {
    case "hashing":
      return "正在计算文件哈希…";
    case "preparing":
      return "正在创建上传任务…";
    case "uploading":
      return `正在上传… ${Math.round(state.progress * 100)}%`;
    case "confirming":
      return "正在解析文档…";
    case "embedding":
      return state.totalChunks > 0 ? `正在嵌入 ${state.embedded}/${state.totalChunks} chunks…` : "正在嵌入 chunks…";
    default:
      return "";
  }
}

/** Blocking progress modal for the document upload pipeline. */
export function UploadProgressModal({ state, onDismiss }: { state: UploadState; onDismiss: () => void }) {
  const visible = state.phase !== "idle";
  const isError = state.phase === "error";
  const fraction =
    state.phase === "uploading"
      ? state.progress
      : state.phase === "embedding" && state.totalChunks > 0
        ? state.embedded / state.totalChunks
        : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={isError ? onDismiss : undefined}>
      <View className="flex-1 items-center justify-center bg-black/40 px-8">
        <View className="w-full max-w-sm rounded-2xl bg-white p-5">
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
            {state.fileName ?? "Upload"}
          </Text>

          {isError ? (
            <>
              <Text className="mt-3 text-sm text-red-600" testID="upload-error">
                {state.error}
              </Text>
              <Pressable
                onPress={onDismiss}
                className="mt-4 self-end rounded-lg bg-gray-100 px-4 py-2"
                testID="upload-dismiss"
              >
                <Text className="text-sm font-medium text-gray-700">关闭</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View className="mt-3 flex-row items-center gap-2">
                <ActivityIndicator size="small" />
                <Text className="text-sm text-gray-600" testID="upload-phase">
                  {phaseLabel(state)}
                </Text>
              </View>
              {fraction !== null && (
                <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <View className="h-full rounded-full bg-blue-600" style={{ width: `${fraction * 100}%` }} />
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
