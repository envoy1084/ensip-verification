"use client";

import type { ReactNode } from "react";

import { Accordion as AccordionCore } from "@thenamespace/uikit/accordion";

export type AccordionProps = {
  allowsMultipleExpanded?: boolean;
  children: ReactNode;
};

export type AccordionItemProps = {
  children: ReactNode;
};

export type AccordionSlotProps = {
  children: ReactNode;
};

export function Accordion({
  allowsMultipleExpanded,
  children,
}: AccordionProps) {
  return (
    <AccordionCore
      allowsMultipleExpanded={Boolean(allowsMultipleExpanded)}
      className="w-full border border-(--vocs-border-color-primary) rounded-lg"
    >
      {children}
    </AccordionCore>
  );
}

export function AccordionItem({ children }: AccordionItemProps) {
  return <AccordionCore.Item>{children}</AccordionCore.Item>;
}

export function AccordionTitle({ children }: AccordionSlotProps) {
  return (
    <AccordionCore.Heading>
      <AccordionCore.Trigger>
        {children}
        <AccordionCore.Indicator />
      </AccordionCore.Trigger>
    </AccordionCore.Heading>
  );
}

export function AccordionIcon({ children }: AccordionSlotProps) {
  return <span className="text-muted mr-3 size-4 shrink-0">{children}</span>;
}

export function AccordionContent({ children }: AccordionSlotProps) {
  return (
    <AccordionCore.Panel>
      <AccordionCore.Body>
        <div
          className="space-y-6 text-base text-(--vocs-text-color-primary)"
          data-v-content
        >
          {children}
        </div>
      </AccordionCore.Body>
    </AccordionCore.Panel>
  );
}
