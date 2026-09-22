import sources from "../data/blog-image-sources.json";
import { imageSrc } from "./responsive-image";
import { loadGallery, type GalleryPhoto } from "./gallery";

// Blog gorselleri galerideki Immich karelerinden turetildi (eski markdown'daki
// asset id'leri). Eslesen kare: EXIF satiri + galeride derin baglanti.
const map = sources as Record<string, string>;

export async function galleryPhotoFor(image: unknown): Promise<GalleryPhoto | undefined> {
  const src = imageSrc(image);
  const id = src ? map[src] : undefined;
  if (!id) return undefined;
  const photos = await loadGallery();
  return photos.find((p) => p.id === id);
}

export const galleryHref = (p: GalleryPhoto) => "/galeri#kare-" + p.id;
