"use client";

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PROVIDER, PROVIDER_LABEL, type Provider } from "@/lib/llm/providers";
import { cn } from "@/lib/utils";

interface Props {
  value: Provider;
  onChange: (v: Provider) => void;
  className?: string;
}

export function ProviderSelect({ value, onChange, className }: Props) {
  return (
    <Tooltip>
      <Select value={value} onValueChange={(v) => onChange(v as Provider)}>
        <TooltipTrigger render={<SelectTrigger className={cn("w-28", className)} />}>
          <span>{PROVIDER_LABEL[value]}</span>
        </TooltipTrigger>
        <SelectContent>
          <SelectItem value={PROVIDER.CLAUDE}>{PROVIDER_LABEL[PROVIDER.CLAUDE]}</SelectItem>
          <SelectItem value={PROVIDER.DEEPSEEK}>{PROVIDER_LABEL[PROVIDER.DEEPSEEK]}</SelectItem>
          <SelectItem value={PROVIDER.OPENAI}>{PROVIDER_LABEL[PROVIDER.OPENAI]}</SelectItem>
        </SelectContent>
      </Select>
      <TooltipContent>LLM Provider</TooltipContent>
    </Tooltip>
  );
}
