"use client";

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { PROVIDER, PROVIDER_LABEL, type Provider } from "@/lib/llm/providers";
import { cn } from "@/lib/utils";

interface Props {
  value: Provider;
  onChange: (v: Provider) => void;
  className?: string;
}

export function ProviderSelect({ value, onChange, className }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Provider)}>
      <SelectTrigger className={cn("w-36", className)}>
        <span>{PROVIDER_LABEL[value]}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={PROVIDER.DEEPSEEK}>{PROVIDER_LABEL[PROVIDER.DEEPSEEK]}</SelectItem>
        <SelectItem value={PROVIDER.OPENAI}>{PROVIDER_LABEL[PROVIDER.OPENAI]}</SelectItem>
        <SelectItem value={PROVIDER.CLAUDE}>{PROVIDER_LABEL[PROVIDER.CLAUDE]}</SelectItem>
      </SelectContent>
    </Select>
  );
}
