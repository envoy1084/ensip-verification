const ensSubgraphUrl = import.meta.env.VITE_ENS_SUBGRAPH_URL;

const searchQuery = `
  query SearchEnsNames($query: String!, $now: BigInt!) {
    domains(
      first: 6
      orderBy: name
      orderDirection: asc
      where: { name_starts_with_nocase: $query, expiryDate_gt: $now }
    ) {
      id
      name
      expiryDate
    }
  }
`;

const detailsQuery = `
  query EnsNameDetails($name: String!) {
    domains(first: 1, where: { name: $name }) {
      id
      name
      createdAt
      expiryDate
      owner {
        id
      }
      registration {
        registrationDate
        expiryDate
      }
    }
  }
`;

export interface EnsNameSuggestion {
  expiresAt: number | null;
  id: string;
  name: string;
}

interface SearchResponse {
  data?: {
    domains?: Array<{
      id?: unknown;
      name?: unknown;
      expiryDate?: unknown;
    }>;
  };
  errors?: Array<{ message?: string }>;
}

export interface EnsNameDetails {
  id: string;
  name: string;
  owner: string;
  registeredAt: number | null;
  expiresAt: number | null;
}

interface DetailsResponse {
  data?: {
    domains?: Array<{
      id?: unknown;
      name?: unknown;
      createdAt?: unknown;
      expiryDate?: unknown;
      owner?: { id?: unknown };
      registration?: {
        registrationDate?: unknown;
        expiryDate?: unknown;
      } | null;
    }>;
  };
  errors?: Array<{ message?: string }>;
}

const requestSubgraph = async <Response>(
  query: string,
  variables: Record<string, string>,
  signal?: AbortSignal,
): Promise<Response> => {
  if (!ensSubgraphUrl) {
    throw new Error("VITE_ENS_SUBGRAPH_URL is not configured.");
  }

  const response = await fetch(ensSubgraphUrl, {
    body: JSON.stringify({ query, variables }),
    headers: { "content-type": "application/json" },
    method: "POST",
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw new Error(
      `ENS subgraph request failed with status ${response.status}.`,
    );
  }

  return (await response.json()) as Response;
};

const timestamp = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function searchEnsNames(
  query: string,
  signal?: AbortSignal,
): Promise<ReadonlyArray<EnsNameSuggestion>> {
  const result = await requestSubgraph<SearchResponse>(
    searchQuery,
    { now: Math.floor(Date.now() / 1000).toString(), query },
    signal,
  );
  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? "ENS search failed.");
  }

  return (result.data?.domains ?? []).flatMap((domain) =>
    typeof domain.id === "string" && typeof domain.name === "string"
      ? [
          {
            expiresAt: timestamp(domain.expiryDate),
            id: domain.id,
            name: domain.name,
          },
        ]
      : [],
  );
}

export async function getEnsNameDetails(
  name: string,
  signal?: AbortSignal,
): Promise<EnsNameDetails | null> {
  const result = await requestSubgraph<DetailsResponse>(
    detailsQuery,
    { name },
    signal,
  );
  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? "ENS name lookup failed.");
  }

  const domain = result.data?.domains?.[0];
  if (
    !domain ||
    typeof domain.id !== "string" ||
    typeof domain.name !== "string" ||
    typeof domain.owner?.id !== "string"
  ) {
    return null;
  }

  return {
    expiresAt: timestamp(domain.expiryDate ?? domain.registration?.expiryDate),
    id: domain.id,
    name: domain.name,
    owner: domain.owner.id,
    registeredAt: timestamp(
      domain.registration?.registrationDate ?? domain.createdAt,
    ),
  };
}
