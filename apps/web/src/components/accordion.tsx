"use client";

import type { ReactNode } from "react";

import { Accordion as AccordionCore } from "@thenamespace/uikit";

export type AccordionProps = {
  allowsMultipleExpanded?: boolean;
  children: ReactNode;
};

export type AccordionItemProps = {
  children: ReactNode;
  title: ReactNode;
};

export function Accordion({
  allowsMultipleExpanded,
  children,
}: AccordionProps) {
  return (
    <AccordionCore
      allowsMultipleExpanded={Boolean(allowsMultipleExpanded)}
      className="w-full border border-muted"
    >
      {children}
    </AccordionCore>
  );
}

export function AccordionItem({ children, title }: AccordionItemProps) {
  return (
    <AccordionCore.Item>
      <AccordionCore.Heading>
        <AccordionCore.Trigger>
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
