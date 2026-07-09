import { memo, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
import { useColorScheme } from "nativewind";
import type { Citation } from "@faq-rag/shared";
import { stripCitationMarks } from "../../lib/utils/citations";
import { TypingDots } from "./TypingDots";
import { light, dark } from "../../lib/theme/colors";

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
  body: { fontSize: 14, lineHeight: 21, color: light.foreground },
  // Headings default to fontSize 32/24/18/16/13/11 (styles.js) — pinned to
  // match body so heading text doesn't change size, only weight.
  heading1: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  heading2: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  heading3: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  heading4: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  heading5: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  heading6: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  // react-native-markdown-display's default code_inline style adds
  // padding: 10 and a 1px border (styles.js) that a custom style prop merges
  // with rather than replaces — left alone, that inflates each inline-code
  // span to ~37px tall (vs. the 21px line-height) and makes it visually
  // overlap the line above/below when text wraps around it. Both must be
  // explicitly zeroed here to get a compact, single-line badge.
  code_inline: {
    backgroundColor: light.border,
    borderRadius: 4,
    borderWidth: 0,
    padding: 0,
    paddingHorizontal: 4,
    fontSize: 13,
    lineHeight: 21,
  },
  code_block: {
    backgroundColor: light.codeBlockBg,
    color: light.codeBlockText,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
  },
  fence: { backgroundColor: light.codeBlockBg, color: light.codeBlockText, borderRadius: 8, padding: 10, fontSize: 12 },
});

const markdownStyleDark = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 21, color: dark.foreground },
  heading1: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  heading2: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  heading3: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  heading4: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  heading5: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  heading6: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  code_inline: {
    backgroundColor: dark.border,
    color: dark.foreground,
    borderRadius: 4,
    borderWidth: 0,
    padding: 0,
    paddingHorizontal: 4,
    fontSize: 13,
    lineHeight: 21,
  },
  code_block: {
    backgroundColor: dark.codeBlockBg,
    color: dark.codeBlockText,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
  },
  fence: { backgroundColor: dark.codeBlockBg, color: dark.codeBlockText, borderRadius: 8, padding: 10, fontSize: 12 },
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
        <View className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5">
          <Text className="text-sm leading-5 text-on-primary">{content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-3 flex-row justify-start">
      <View className="max-w-[90%] rounded-2xl bg-muted px-4 py-2.5">
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
    <View className="mt-2 border-t border-border pt-2">
      <Pressable onPress={() => setOpen((v) => !v)} className="py-1">
        <Text className="text-xs text-muted-foreground">
          {open ? "▾" : "▸"} Sources ({citations.length})
        </Text>
      </Pressable>
      {open && (
        <View className="mt-1 gap-2">
          {citations.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => onCitationClick?.(c)}
              className="rounded-lg border border-border bg-card p-2"
            >
              <Text className="text-xs font-medium text-muted-foreground" numberOfLines={1}>
                [{c.id}] {c.documentName}{" "}
                <Text className="text-subtle-foreground">{(c.score * 100).toFixed(0)}% match</Text>
              </Text>
              <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={3}>
                {c.preview}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
