import { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SampleQuestionItem } from "@faq-rag/shared";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useSampleQuestions } from "@/hooks/useSampleQuestions";

function sampleQuestions(pool: SampleQuestionItem[], count: number): SampleQuestionItem[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function ChatEmptyState({ onSend }: { onSend: (question: string) => void }) {
  const colors = useThemeColors();
  const { questions: pool } = useSampleQuestions();

  // Stable per mount — re-randomizes each time the new-chat screen is opened
  const questions = useMemo(() => sampleQuestions(pool, 4), [pool]);

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Ionicons name="chatbubbles-outline" size={40} color={colors.subtleForeground} style={{ marginBottom: 12 }} />
      <Text className="text-center text-sm text-muted-foreground">Ask a question about your documents</Text>

      {questions.length > 0 && (
        <View className="mt-4 w-full gap-2">
          {questions.map((q) => (
            <Pressable
              key={q.id}
              onPress={() => onSend(q.question)}
              className="w-full rounded-lg border border-border px-3 py-2.5"
            >
              <Text className="text-sm text-foreground">{q.question}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
