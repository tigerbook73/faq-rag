"use client";

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { PROVIDER, PROVIDER_LABEL, type Provider } from "@/lib/llm/providers";

interface Props {
  value: Provider;
  onChange: (v: Provider) => void;
}

export function ProviderSelect({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Provider)}>
      <SelectTrigger className="w-36">
        <span>{PROVIDER_LABEL[value]}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={PROVIDER.DEEPSEEK}>{PROVIDER_LABEL[PROVIDER.DEEPSEEK]}</SelectItem>
        <SelectItem value={PROVIDER.CLAUDE}>{PROVIDER_LABEL[PROVIDER.CLAUDE]}</SelectItem>
      </SelectContent>
    </Select>
  );
}
