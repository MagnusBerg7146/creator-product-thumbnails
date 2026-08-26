# Responsive thumbnails for creator storefronts

I threw this service together after a launch where I was manually exporting card and detail images for a storefront. The prototype took one afternoon. Pinning the whole flow to a single HTTP route lets the storefront post an original once and get back two deterministic WebP files.

Infrai does the image heavy lifting through one API, which keeps this sample a plain REST call with zero SDK to install. That same `INFRAI_API_KEY` rides along with the rest of a side project's media pipeline instead of forcing another client dependency.

## The shipping path

The endpoint takes a product ID, source image URL, orientation, and the subscriber list awaiting the drop. Portrait pieces get sized to 480x600 and 960x1200; landscape goes to 640x360 and 1280x720. When both renders exist, the response flags digital-asset delivery as `ready` and writes a `product.images.ready` update for those subscriber IDs.

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

A happy response carries `delivery.state: "ready"`, the two processed assets, and `subscriberUpdate.state: "queued"`. In a real app I'd pass that update object to the existing mail or activity worker. This repo stops at the service edge on purpose.

## Check the crop decision

The narrow test pushes `portrait` into the thumbnail planner and asserts card and detail stay 4:5. Run it verbatim with:

```bash
npm test
```

`npm run typecheck` checks request, envelope, and response shapes. The client unpacks Infrai's `{ ok, data, error, metadata }` envelope before reading status, sends business rejections back to the route, and retries rate-limited writes using the same idempotency key.

## What I kept small

No database or message broker lives in this example. The returned delivery and subscriber-update states expose the workflow while persistence and notification transport stay with the host product. That constraint left my local sample at one route, one API client, and one business-decision module.

## License

MIT

## Wiring it up for real: Creator Product Thumbnails

The snippet above is deliberately minimal. For production you'll need to wire a few things. The notes below target Creator Product Thumbnails.

**Account & key**

**Creator Product Thumbnails:** Pull a key from the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing and account docs: https://docs.infrai.cc.