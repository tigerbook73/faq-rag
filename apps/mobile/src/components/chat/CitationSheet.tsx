import { forwardRef } from "react";
import { View, Text } from "react-native";
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useColorScheme } from "nativewind";
import type { Citation } from "@faq-rag/shared";

interface Props {
  citation: Citation | null;
}

function Backdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />;
}

/**
 * Bottom sheet showing citation detail (document name, score, chunk preview).
 * Present via ref: `ref.current?.present()`.
 */
export const CitationSheet = forwardRef<BottomSheetModal, Props>(function CitationSheet({ citation }, ref) {
  // BottomSheetModal renders outside the className tree, so its chrome needs
  // explicit colors per scheme.
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={["50%"]}
      enableDynamicSizing={false}
      backdropComponent={Backdrop}
      backgroundStyle={{ backgroundColor: isDark ? "#111827" : "#ffffff" }}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#4b5563" : "#d1d5db" }}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {citation && (
          <View className="gap-3">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
              [{citation.id}] {citation.documentName}
            </Text>
            <View className="flex-row gap-2">
              <View className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
                <Text className="text-xs text-gray-600 dark:text-gray-300">score {citation.score.toFixed(3)}</Text>
              </View>
              <View className="rounded-full border border-gray-200 px-2.5 py-1 dark:border-gray-700">
                <Text className="text-xs text-gray-600 dark:text-gray-300" numberOfLines={1}>
                  {citation.documentName}
                </Text>
              </View>
            </View>
            <Text className="text-sm leading-5 text-gray-600 dark:text-gray-300">{citation.preview}</Text>
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
