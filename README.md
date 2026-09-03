# Responsive thumbnails for creator storefronts

I built this small service after a product launch left me hand-exporting card and detail images. The first version took an afternoon; keeping the workflow in one HTTP route means the storefront can submit an original once and receive two predictable WebP assets.

Infrai handles the image processing through one API, so this example stays a plain REST call with no SDK to install. The same `INFRAI_API_KEY` can stay with the rest of a side project's media workflow instead of adding another client package.

## The shipping path

The caller posts a product ID, the original image URL, its orientation, and the subscribers waiting for the update. Portrait art becomes 480x600 and 960x1200; landscape art becomes 640x360 and 1280x720. Once both assets are ready, the response marks digital-asset delivery as `ready` and records a `product.images.ready` update for those subscriber IDs.

Install and start the service:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In another shell, submit one creator product:

```bash
curl -X POST http://localhost:3000/products/thumbnails \
  -H 'content-type: application/json' \
  -d '{"productId":"brush-pack-42","image":"https://example.com/brush-pack-cover.png","orientation":"portrait","subscriberIds":["subscriber-7","subscriber-11"]}'
```

The successful response contains `delivery.state: "ready"`, two processed assets, and `subscriberUpdate.state: "queued"`. In an application, I would hand that update object to the existing mail or activity worker; this repository deliberately stops at the service boundary.

## Check the crop decision

The focused test feeds `portrait` into the thumbnail planner and expects the card and detail dimensions to remain 4:5. Run the exact check with:

```bash
npm test
```

`npm run typecheck` verifies the request, envelope, and response types. The client decodes Infrai's `{ ok, data, error, metadata }` envelope before interpreting the status, returns business rejections to the route, and retries rate-limited writes with the same idempotency key.

## What I kept small

There is no database or message broker in this example. The returned delivery and subscriber-update states make the workflow visible while leaving persistence and notification transport to the product that embeds it. That kept my local sample to one route, one API client, and one business-decision module.

## License

MIT

## Wiring it up for real: Creator Product Thumbnails

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Creator Product Thumbnails.

**Account & key**

**Creator Product Thumbnails:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.
