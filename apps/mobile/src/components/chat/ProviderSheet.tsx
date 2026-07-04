import { Modal, Text, Pressable } from "react-native";
import type { Provider } from "../../lib/api/chat";
import { PROVIDERS, PROVIDER_LABEL } from "../../context/provider-context";

interface Props {
  visible: boolean;
  current: Provider;
  onSelect: (p: Provider) => void;
  onClose: () => void;
}

/** Bottom-anchored action sheet for switching the LLM provider. */
export function ProviderSheet({ visible, current, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-2xl bg-white pb-8 pt-2" onPress={(e) => e.stopPropagation()}>
          <Text className="px-5 py-3 text-xs font-medium uppercase text-gray-400">LLM Provider</Text>
          {PROVIDERS.map((p) => (
            <Pressable
              key={p}
              className="flex-row items-center justify-between px-5 py-3.5 active:bg-gray-50"
              onPress={() => {
                onSelect(p);
                onClose();
              }}
            >
              <Text className={`text-base ${p === current ? "font-semibold text-blue-600" : "text-gray-800"}`}>
                {PROVIDER_LABEL[p]}
              </Text>
              {p === current && <Text className="text-blue-600">✓</Text>}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
