import { createServerFn } from "@tanstack/react-start";

import type {
  CreateDnsTxtRecordInput,
  DnsTxtVerificationPreparation,
} from "@thenamespace/record-verification";

import {
  createUrlDnsRecord as createUrlDnsRecordOnServer,
  prepareUrlDnsVerification as prepareUrlDnsVerificationOnServer,
  verifyUrlRecord as verifyUrlRecordOnServer,
} from "./verify-url-record.server";

const validateInput = (input: unknown) => {
  const name =
    typeof input === "object" && input !== null
      ? Reflect.get(input, "name")
      : undefined;

  if (typeof name !== "string" || name.length === 0 || name.length > 255) {
    throw new Error("A valid ENS name is required.");
  }

  return { name } as const;
};

export const verifyUrlRecord = createServerFn({ method: "POST" })
  .validator(validateInput)
  .handler(({ data }) => verifyUrlRecordOnServer(data.name));

export const prepareUrlDnsVerification = createServerFn({ method: "POST" })
  .validator(validateInput)
  .handler(({ data }) => prepareUrlDnsVerificationOnServer(data.name));

const validateDnsRecordInput = (input: unknown): CreateDnsTxtRecordInput => {
  if (typeof input !== "object" || input === null) {
    throw new Error("A DNS verification preparation is required.");
  }

  const preparation = Reflect.get(input, "preparation");
  const authoritySignature = Reflect.get(input, "authoritySignature");
  if (
    typeof preparation !== "object" ||
    preparation === null ||
    typeof authoritySignature !== "string" ||
    !/^0x[0-9A-Fa-f]+$/.test(authoritySignature)
  ) {
    throw new Error("The signed DNS verification preparation is invalid.");
  }

  return {
    preparation: preparation as DnsTxtVerificationPreparation,
    authoritySignature: authoritySignature as `0x${string}`,
  };
};

export const createUrlDnsRecord = createServerFn({ method: "POST" })
  .validator(validateDnsRecordInput)
  .handler(({ data }) => createUrlDnsRecordOnServer(data));
