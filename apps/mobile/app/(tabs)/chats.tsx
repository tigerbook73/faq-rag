import { View, Text } from "react-native";
import { Button } from "../../src/components/ui/button";

export default function ChatsScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white">
      <Text className="text-lg font-semibold text-gray-800">Chats</Text>
      <Button onPress={() => {}}>New Chat</Button>
    </View>
  );
}
