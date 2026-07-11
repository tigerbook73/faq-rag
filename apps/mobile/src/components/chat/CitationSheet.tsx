import { forwardRef } from "react";
import { View, Text } from "react-native";
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import type { Citation } from "@faq-rag/shared";
import { useThemeColors } from "@/hooks/useThemeColors";

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
  const colors = useThemeColors();

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={["50%"]}
      enableDynamicSizing={false}
      backdropComponent={Backdrop}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {citation && (
          <View className="gap-3">
            <Text className="text-base font-semibold text-foreground">
              [{citation.id}] {citation.documentName}
            </Text>
            <View className="flex-row gap-2">
              <View className="rounded-full bg-muted px-2.5 py-1">
                <Text className="text-xs text-muted-foreground">score {citation.score.toFixed(3)}</Text>
              </View>
              <View className="rounded-full border border-border px-2.5 py-1">
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {citation.documentName}
                </Text>
              </View>
            </View>
            <Text className="text-sm leading-5 text-muted-foreground">{citation.preview}</Text>
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
