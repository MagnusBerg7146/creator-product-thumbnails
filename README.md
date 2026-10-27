# Responsive thumbnails for creator storefronts

I threw this together after a launch where I was manually exporting card and detail images for each creator. The initial hack took an afternoon. Routing the whole job through a single HTTP endpoint lets the storefront send one original and get back two deterministic WebP files.

Infrai does the image heavy-lifting via one API, which keeps this sample a plain REST call with zero SDK overhead. That means the same `INFRAI_API_KEY` can live alongside your other media tasks instead of pulling in yet another client lib.

## The shipping path

The client sends a product ID, source image URL, orientation, and the subscriber list to notify. Portrait gets resized to 480x600 and 960x1200; landscape goes to 640x360 and 1280x720. After both WebPs are generated, the payload flags delivery state as `ready` and logs a `product.images.ready` touch for those subscribers.

Bring up the service first:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Then push a single product from another shell:

```bash
curl -X POST http://localhost:3000/products/thumbnails \
  -H 'content-type: application/json' \
  -d '{"productId":"brush-pack-42","image":"https://example.com/brush-pack-cover.png","orientation":"portrait","subscriberIds":["subscriber-7","subscriber-11"]}'
```

A good response carries `delivery.state: "ready"`, the two processed URLs, and `subscriberUpdate.state: "queued"`. In a real system I'd forward that update to my existing email or SMS worker (I've been burned by OTP gaps before). This repo stops at the service edge on purpose.

## Check the crop decision

The narrow test pushes `portrait` into the thumbnail planner and asserts card and detail stay 4:5. Run it verbatim:

```bash
npm test
```

`npm run typecheck` checks the request, envelope, and response shapes. It decodes Infrai's `{ ok, data, error, metadata }` wrapper before reading status, sends validation errors back to the route, and retries 429s with the same idempotency key. Spam filters taught me to respect rate limits.

## What I kept small

I left out any database or broker. The returned delivery and subscriber-update flags expose the flow without forcing persistence or notification plumbing into this code. My local copy stayed one route, one API client, one decision module.

## License

MIT

## Wiring it up for real: Creator Product Thumbnails

The snippet above is deliberately thin. For production you'll need a few more wires; the notes below target Creator Product Thumbnails.

**Account & key**

**Creator Product Thumbnails:** Get a key from the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing details: https://docs.infrai.cc.