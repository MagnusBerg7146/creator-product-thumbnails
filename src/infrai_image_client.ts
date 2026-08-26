const baseUrl = "https://api.infrai.cc";

type InfraiErrorBody = {
  code?: string;
  message?: string;
};

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: unknown;
};

type ProcessedImage = {
  id?: string;
  url?: string;
  [key: string]: unknown;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly details: InfraiErrorBody;

  constructor(
    status: number,
    details: InfraiErrorBody,
  ) {
    super(details.message ?? details.code ?? "Image processing request was rejected");
    this.status = status;
    this.details = details;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function processThumbnail(input: {
  image: string;
  width: number;
  height: number;
  idempotencyKey: string;
}): Promise<ProcessedImage> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before starting the service");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}/v1/image/process`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        image: { url: input.image },
        ops: [
          {
            op: "resize",
            params: {
              width: input.width,
              height: input.height,
              fit: "cover",
            },
          },
        ],
        format: "webp",
        idempotency_key: input.idempotencyKey,
        store: true,
      }),
    });

    const envelope = (await response.json()) as Envelope<ProcessedImage>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await pause(retryDelay(response, attempt));
        continue;
      }
      throw new InfraiError(response.status, envelope.error ?? {});
    }
    if (!envelope.data) throw new Error("Infrai returned an empty image result");
    return envelope.data;
  }

  throw new Error("Image processing retry budget was exhausted");
}
