import sources from "../data/blog-image-sources.json";
import { imageSrc } from "./responsive-image";
import { loadGallery, type GalleryPhoto } from "./gallery";
import { localizedPosts } from "../utils/localized-posts";

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

/** Karenin kendi sayfasi (EXIF, hikaye, onceki/sonraki). */
export const galleryHref = (p: GalleryPhoto) => "/galeri/" + p.id;

/** Ters esleme: galeri karesi -> gectigi yazilarin slug'lari (kapak once). */
export function postSlugsByPhoto(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const entries = Object.entries(map).sort(([a], [b]) => Number(b.endsWith("/cover.webp")) - Number(a.endsWith("/cover.webp")));
  for (const [src, id] of entries) {
    const slug = src.match(/^\/blog\/([^/]+)\//)?.[1];
    if (!slug) continue;
    const list = out.get(id) ?? [];
    if (!list.includes(slug)) list.push(slug);
    out.set(id, list);
  }
  return out;
}

/** Karenin gectigi yayindaki ilk yazi (kapak once): galeri/kare sayfasinda "Yazıda: …". */
export async function photoPostFinder(): Promise<(photoId: string) => { href: string; title: string } | null> {
  const { entries: posts } = await localizedPosts("tr", { orderBy: { published_at: "desc" } });
  const titleBySlug = new Map(posts.map((post) => [post.id, post.data.title]));
  const slugsByPhoto = postSlugsByPhoto();
  return (photoId) => {
    const slug = (slugsByPhoto.get(photoId) ?? []).find((s) => titleBySlug.has(s));
    return slug ? { href: "/" + slug, title: titleBySlug.get(slug) ?? "" } : null;
  };
}
