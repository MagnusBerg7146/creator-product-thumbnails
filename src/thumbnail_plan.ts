export type ProductImage = {
  productId: string;
  image: string;
  orientation: "portrait" | "landscape";
  subscriberIds: string[];
};

export type ThumbnailSpec = {
  slot: "card" | "detail";
  width: number;
  height: number;
};

export function chooseThumbnailSpecs(
  orientation: ProductImage["orientation"],
): ThumbnailSpec[] {
  return orientation === "portrait"
    ? [
        { slot: "card", width: 480, height: 600 },
        { slot: "detail", width: 960, height: 1200 },
      ]
    : [
        { slot: "card", width: 640, height: 360 },
        { slot: "detail", width: 1280, height: 720 },
      ];
}
