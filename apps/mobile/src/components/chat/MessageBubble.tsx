import { memo, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
import { useColorScheme } from "nativewind";
import type { Citation } from "@faq-rag/shared";
import { stripCitationMarks } from "../../lib/utils/citations";
import { TypingDots } from "./TypingDots";

interface Props {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  onCitationClick?: (c: Citation) => void;
  isLoading?: boolean;
}

// react-native-markdown-display takes StyleSheet objects, not classNames, so
// light/dark variants are precomputed and picked via useColorScheme.
const markdownStyleLight = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 21, color: "#111827" },
  code_inline: { backgroundColor: "#e5e7eb", borderRadius: 4, fontSize: 13 },
  code_block: { backgroundColor: "#1f2937", color: "#f9fafb", borderRadius: 8, padding: 10, fontSize: 12 },
  fence: { backgroundColor: "#1f2937", color: "#f9fafb", borderRadius: 8, padding: 10, fontSize: 12 },
});

const markdownStyleDark = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 21, color: "#f3f4f6" },
  code_inline: { backgroundColor: "#374151", color: "#f3f4f6", borderRadius: 4, fontSize: 13 },
  code_block: { backgroundColor: "#111827", color: "#f9fafb", borderRadius: 8, padding: 10, fontSize: 12 },
  fence: { backgroundColor: "#111827", color: "#f9fafb", borderRadius: 8, padding: 10, fontSize: 12 },
});

export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  citations,
  onCitationClick,
  isLoading,
}: Props) {
  const isUser = role === "user";
  const { colorScheme } = useColorScheme();
  const markdownStyle = colorScheme === "dark" ? markdownStyleDark : markdownStyleLight;

  // Re-computed only when inputs change; during streaming the bubble
  // re-renders per flush, so skipping the regex passes matters.
  const cleaned = useMemo(() => {
    if (isUser) return content;
    return stripCitationMarks(content, new Set(citations?.map((c) => c.id) ?? []));
  }, [isUser, content, citations]);

  if (isUser) {
    return (
      <View className="mb-3 flex-row justify-end">
        <View className="max-w-[85%] rounded-2xl bg-blue-600 px-4 py-2.5">
          <Text className="text-sm leading-5 text-white">{content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-3 flex-row justify-start">
      <View className="max-w-[90%] rounded-2xl bg-gray-100 px-4 py-2.5 dark:bg-gray-800">
        {isLoading && !content ? (
          <TypingDots />
        ) : (
          <>
            <Markdown style={markdownStyle}>{cleaned}</Markdown>
            {citations && citations.length > 0 && (
              <CitationList citations={citations} onCitationClick={onCitationClick} />
            )}
          </>
        )}
      </View>
    </View>
  );
});

function CitationList({
  citations,
  onCitationClick,
}: {
  citations: Citation[];
  onCitationClick?: (c: Citation) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
      <Pressable onPress={() => setOpen((v) => !v)} className="py-1">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {open ? "▾" : "▸"} 引用来源 ({citations.length})
        </Text>
      </Pressable>
      {open && (
        <View className="mt-1 gap-2">
          {citations.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => onCitationClick?.(c)}
              className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900"
            >
              <Text className="text-xs font-medium text-gray-500 dark:text-gray-400" numberOfLines={1}>
                [{c.id}] {c.documentName}{" "}
                <Text className="text-gray-400 dark:text-gray-500">{(c.score * 100).toFixed(0)}% 相似</Text>
              </Text>
              <Text className="mt-0.5 text-xs text-gray-700 dark:text-gray-300" numberOfLines={3}>
                {c.preview}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
