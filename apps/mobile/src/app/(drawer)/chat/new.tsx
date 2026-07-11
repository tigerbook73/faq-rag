import { LoadedChatScreen } from "@/components/chat/ChatScreen";

// Ephemeral "new chat" screen (mirrors apps/web's /chat/new): chatId is null,
// so nothing is persisted server-side until the first message is sent. This
// keeps "+ New Chat" from creating an empty session that immediately shows up
// in history.
export default function NewChatScreen() {
  return <LoadedChatScreen key="new" chatId={null} initialSession={null} />;
}
