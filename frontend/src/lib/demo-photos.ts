// A ready-made set for the host form's "Add demo photos" button (uploads are out of scope; hosts paste URLs).
// Taken from the curated seed pools (backend/app/seed/photos.py), Unsplash License.

const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

export const DEMO_PHOTOS = [
  u("1596178067639-5c6e68aea6dc"), // house by a pool
  u("1600210492493-0946911123ea"), // living room
  u("1616594039964-ae9021a400a0"), // bedroom
  u("1625334782252-da92af3ad887"), // bedroom
  u("1620626011761-996317b8d101"), // bathroom
];
