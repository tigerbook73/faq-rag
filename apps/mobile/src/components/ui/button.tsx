import React from "react";
import { Pressable, Text, PressableProps } from "react-native";
import { tva } from "@gluestack-ui/nativewind-utils/tva";

const buttonStyle = tva({
  base: "rounded-lg px-4 py-2 items-center justify-center flex-row",
  variants: {
    variant: {
      solid: "bg-primary",
      outline: "bg-transparent border border-primary-text",
      ghost: "bg-transparent",
    },
    size: {
      sm: "px-3 py-1.5",
      md: "px-4 py-2",
      lg: "px-5 py-3",
    },
  },
  defaultVariants: { variant: "solid", size: "md" },
});

const textStyle = tva({
  base: "font-medium text-sm",
  variants: {
    variant: {
      solid: "text-on-primary",
      outline: "text-primary-text",
      ghost: "text-primary-text",
    },
  },
  defaultVariants: { variant: "solid" },
});

interface ButtonProps extends Omit<PressableProps, "children"> {
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: string | React.ReactNode;
}

export function Button({ variant = "solid", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <Pressable className={buttonStyle({ variant, size, class: className })} {...props}>
      {typeof children === "string" ? <Text className={textStyle({ variant })}>{children}</Text> : children}
    </Pressable>
  );
}
