"use client";

import type { ReactNode } from "react";

import { Accordion as AccordionCore } from "@thenamespace/uikit";

export type AccordionProps = {
  allowsMultipleExpanded?: boolean;
  children: ReactNode;
};

export type AccordionItemProps = {
  children: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
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

export function AccordionItem({ children, icon, title }: AccordionItemProps) {
  return (
    <AccordionCore.Item>
      <AccordionCore.Heading>
        <AccordionCore.Trigger>
          {icon ? (
            <span className="text-muted mr-3 size-4 shrink-0">{icon}</span>
          ) : null}
          {title}
          <AccordionCore.Indicator />
        </AccordionCore.Trigger>
      </AccordionCore.Heading>
      <AccordionCore.Panel>
        <AccordionCore.Body>{children}</AccordionCore.Body>
      </AccordionCore.Panel>
    </AccordionCore.Item>
  );
}
