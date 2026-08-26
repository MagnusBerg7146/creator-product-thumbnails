import assert from "node:assert/strict";
import test from "node:test";
import { processThumbnail } from "../src/infrai_image_client.js";
import { chooseThumbnailSpecs } from "../src/thumbnail_plan.js";

test("portrait product art keeps a 4:5 crop in both delivery slots", () => {
  assert.deepEqual(chooseThumbnailSpecs("portrait"), [
    { slot: "card", width: 480, height: 600 },
    { slot: "detail", width: 960, height: 1200 },
  ]);
});

test("landscape product art uses the wide storefront crop", () => {
  assert.deepEqual(chooseThumbnailSpecs("landscape"), [
    { slot: "card", width: 640, height: 360 },
    { slot: "detail", width: 1280, height: 720 },
  ]);
});

test("image processing uses the discovered Infrai request shape", async () => {
  const previousKey = process.env.INFRAI_API_KEY;
  const previousFetch = globalThis.fetch;
  let request: RequestInit | undefined;

  process.env.INFRAI_API_KEY = "test-key";
  globalThis.fetch = async (_url, init) => {
    request = init;
    return new Response(JSON.stringify({ ok: true, data: { id: "image-1" } }), {
      headers: { "content-type": "application/json" },
    });
  };

  try {
    await processThumbnail({
      image: "https://example.com/product.png",
      width: 480,
      height: 600,
      idempotencyKey: "product:card:480x600",
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.INFRAI_API_KEY;
    else process.env.INFRAI_API_KEY = previousKey;
  }

  assert.deepEqual(JSON.parse(String(request?.body)), {
    image: { url: "https://example.com/product.png" },
    ops: [
      {
        op: "resize",
        params: { width: 480, height: 600, fit: "cover" },
      },
    ],
    format: "webp",
    idempotency_key: "product:card:480x600",
    store: true,
  });
});
