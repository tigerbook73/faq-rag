import { Modal, View, Text, Pressable, ActivityIndicator } from "react-native";
import type { UploadState } from "../../hooks/useDocumentUpload";
import { useThemeVars } from "../../hooks/useThemeVars";

function phaseLabel(state: UploadState): string {
  switch (state.phase) {
    case "hashing":
      return "Calculating file hash...";
    case "preparing":
      return "Creating upload job...";
    case "uploading":
      return `Uploading... ${Math.round(state.progress * 100)}%`;
    case "confirming":
      return "Parsing document...";
    case "embedding":
      return state.totalChunks > 0
        ? `Embedding ${state.embedded}/${state.totalChunks} chunks...`
        : "Embedding chunks...";
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
  const vars = useThemeVars();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={isError ? onDismiss : undefined}>
      {/* Modal content is portaled outside the DOM subtree that carries our
          CSS-variable tokens on react-native-web, so re-apply them here. */}
      <View style={vars} className="flex-1 items-center justify-center bg-black/40 px-8">
        <View className="w-full max-w-sm rounded-2xl bg-card p-5">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {state.fileName ?? "Upload"}
          </Text>

          {isError ? (
            <>
              <Text className="mt-3 text-sm text-destructive" testID="upload-error">
                {state.error}
              </Text>
              <Pressable
                onPress={onDismiss}
                className="mt-4 self-end rounded-lg bg-muted px-4 py-2"
                testID="upload-dismiss"
              >
                <Text className="text-sm font-medium text-muted-foreground">Close</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View className="mt-3 flex-row items-center gap-2">
                <ActivityIndicator size="small" />
                <Text className="text-sm text-muted-foreground" testID="upload-phase">
                  {phaseLabel(state)}
                </Text>
              </View>
              {fraction !== null && (
                <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <View className="h-full rounded-full bg-primary" style={{ width: `${fraction * 100}%` }} />
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
