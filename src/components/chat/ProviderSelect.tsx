"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LABELS: Record<string, string> = {
  deepseek: "DeepSeek",
  claude: "Claude",
};

interface Props {
  value: "claude" | "deepseek";
  onChange: (v: "claude" | "deepseek") => void;
}

export function ProviderSelect({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as "claude" | "deepseek")}>
      <SelectTrigger className="w-36">
        <span>{LABELS[value]}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="deepseek">DeepSeek</SelectItem>
        <SelectItem disabled value="claude">
          Claude
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
