import { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Markdown, { type RenderRules } from "react-native-markdown-display";
import type { Citation } from "@faq-rag/shared";
import { TypingDots } from "./TypingDots";

interface Props {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  onCitationClick?: (c: Citation) => void;
  isLoading?: boolean;
}

// Mirrors apps/web/src/components/chat/MessageBubble.tsx: normalise all
// citation variants ([^n], [n], (^n)) to @@n@@ before markdown parsing so
// [^n] is not consumed as a footnote reference.
function normalizeCitations(content: string): string {
  return content
    .replace(/\[\^(\d+)\]/g, (_, n) => `@@${parseInt(n, 10)}@@`)
    .replace(/\[(\d+)\]/g, (_, n) => `@@${parseInt(n, 10)}@@`)
    .replace(/\(\^(\d+)\)/g, (_, n) => `@@${parseInt(n, 10)}@@`);
}

function makeRules(citations: Citation[] | undefined, onCitationClick?: (c: Citation) => void): RenderRules {
  return {
    text: (node, _children, _parents, styles) => {
      const parts = String(node.content).split(/(@@\d+@@)/g);
      if (parts.length === 1) {
        return (
          <Text key={node.key} style={styles.text}>
            {node.content}
          </Text>
        );
      }
      return (
        <Text key={node.key} style={styles.text}>
          {parts.map((part, i) => {
            const match = part.match(/^@@(\d+)@@$/);
            if (match) {
              const num = parseInt(match[1], 10);
              const citation = citations?.find((c) => c.id === num);
              if (citation) {
                return (
                  <Text key={i} style={sheetStyles.citationSup} onPress={() => onCitationClick?.(citation)}>
                    {" "}
                    [{num}]
                  </Text>
                );
              }
            }
            return <Text key={i}>{part}</Text>;
          })}
        </Text>
      );
    },
  };
}

const markdownStyle = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 21, color: "#111827" },
  code_inline: { backgroundColor: "#e5e7eb", borderRadius: 4, fontSize: 13 },
  code_block: { backgroundColor: "#1f2937", color: "#f9fafb", borderRadius: 8, padding: 10, fontSize: 12 },
  fence: { backgroundColor: "#1f2937", color: "#f9fafb", borderRadius: 8, padding: 10, fontSize: 12 },
});

const sheetStyles = StyleSheet.create({
  citationSup: { fontSize: 11, color: "#2563eb", fontWeight: "600" },
});

export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  citations,
  onCitationClick,
  isLoading,
}: Props) {
  const isUser = role === "user";

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
      <View className="max-w-[90%] rounded-2xl bg-gray-100 px-4 py-2.5">
        {isLoading && !content ? (
          <TypingDots />
        ) : (
          <>
            <Markdown style={markdownStyle} rules={makeRules(citations, onCitationClick)}>
              {normalizeCitations(content)}
            </Markdown>
            {citations && citations.length > 0 && (
              <View className="mt-2 border-t border-gray-200 pt-2">
                {citations.map((c) => (
                  <Pressable key={c.id} onPress={() => onCitationClick?.(c)} className="py-1">
                    <Text className="text-xs text-gray-500" numberOfLines={1}>
                      [{c.id}] {c.documentName} — {c.preview.slice(0, 60)}…
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
});
