import { createServerFn } from "@tanstack/react-start";

import { verifyUrlRecord as verifyUrlRecordOnServer } from "./verify-url-record.server";

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
