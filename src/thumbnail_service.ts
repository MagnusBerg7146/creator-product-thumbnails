import { createServer } from "node:http";
import { z } from "zod";
import { InfraiError, processThumbnail } from "./infrai_image_client.js";
import { chooseThumbnailSpecs } from "./thumbnail_plan.js";

const requestSchema = z.object({
  productId: z.string().min(1),
  image: z.string().url(),
  orientation: z.enum(["portrait", "landscape"]),
  subscriberIds: z.array(z.string().min(1)).max(100),
});

async function readJson(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.method !== "POST" || request.url !== "/products/thumbnails") {
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const input = requestSchema.parse(await readJson(request));
    const specs = chooseThumbnailSpecs(input.orientation);
    const assets = await Promise.all(
      specs.map(async (spec) => ({
        slot: spec.slot,
        width: spec.width,
        height: spec.height,
        asset: await processThumbnail({
          image: input.image,
          width: spec.width,
          height: spec.height,
          idempotencyKey: `${input.productId}:${spec.slot}:${spec.width}x${spec.height}`,
        }),
      })),
    );

    response.statusCode = 201;
    response.end(
      JSON.stringify({
        productId: input.productId,
        delivery: { state: "ready", assets },
        subscriberUpdate: {
          state: "queued",
          recipients: input.subscriberIds,
          event: "product.images.ready",
        },
      }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.statusCode = 400;
      response.end(JSON.stringify({ error: "Invalid request", issues: error.issues }));
      return;
    }
    if (error instanceof InfraiError) {
      response.statusCode = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.end(JSON.stringify({ error: error.message, details: error.details }));
      return;
    }
    response.statusCode = 500;
    response.end(JSON.stringify({ error: "Could not prepare thumbnails" }));
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`Thumbnail service listening on http://localhost:${port}`);
});
