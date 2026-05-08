import { ChatWindow } from "@/components/chat/ChatWindow";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatWindow key={id} chatId={id} />;
}
