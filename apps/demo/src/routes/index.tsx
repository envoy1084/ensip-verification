import { useCallback, useState } from "react";

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@thenamespace/uikit/button";
import { FieldError } from "@thenamespace/uikit/field-error";
import { SearchField } from "@thenamespace/uikit/search-field";
import { normalize } from "viem/ens";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [isInvalid, setIsInvalid] = useState(false);

  const search = useCallback(
    (value: string) => {
      try {
        const normalizedName = normalize(value.trim());
        setIsInvalid(false);
        void navigate({ to: "/$name", params: { name: normalizedName } });
      } catch {
        setIsInvalid(true);
      }
    },
    [navigate],
  );
  const handleChange = useCallback((value: string) => {
    setName(value);
    setIsInvalid(false);
  }, []);
  const handlePress = useCallback(() => search(name), [name, search]);

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="flex w-full max-w-xl items-start gap-2">
        <SearchField
          aria-label="ENS name"
          className="flex-1"
          isInvalid={isInvalid}
          onChange={handleChange}
          onSubmit={search}
          value={name}
        >
          <SearchField.Group className="h-11">
            <SearchField.SearchIcon />
            <SearchField.Input
              className="w-full"
              placeholder="Search an ENS name"
            />
            <SearchField.ClearButton />
          </SearchField.Group>
          <FieldError>Enter a valid ENS name.</FieldError>
        </SearchField>
        <Button className="h-11" onPress={handlePress}>
          Search
        </Button>
      </div>
    </main>
  );
}
