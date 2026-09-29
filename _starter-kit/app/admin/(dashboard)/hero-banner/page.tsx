import Link from "next/link";
import { getAllHeroSlidesForAdmin } from "@/lib/heroSlides";
import { deleteHeroSlide, moveHeroSlide, toggleHeroSlideActive } from "./actions";

export default async function AdminHeroBannerPage() {
  const slides = await getAllHeroSlidesForAdmin();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Hero Banner</h1>
          <p className="mt-2 text-gray-500">
            The homepage carousel - {slides.length} slide{slides.length === 1 ? "" : "s"}, shown
            in this order.
          </p>
        </div>
        <Link
          href="/admin/hero-banner/new"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Add slide
        </Link>
      </div>

      <div className="space-y-4">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm"
          >
            <div
              className={`relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br ${slide.gradient}`}
            >
              {slide.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- small admin-list thumbnail, next/image adds nothing here
                <img src={slide.imageUrl} alt={slide.headline} className="h-full w-full object-cover" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-500">{slide.eyebrow}</p>
              <p className="truncate font-semibold text-gray-900">{slide.headline}</p>
              <p className="text-xs text-gray-500">
                {slide.ctaLabel} → {slide.ctaHref}
              </p>
            </div>

            <form action={async () => {
              "use server";
              await toggleHeroSlideActive(slide.id, !slide.isActive);
            }}>
              <button
                type="submit"
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  slide.isActive
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {slide.isActive ? "Live" : "Hidden"}
              </button>
            </form>

            <div className="flex flex-col gap-1">
              <form action={async () => {
                "use server";
                await moveHeroSlide(slide.id, "up");
              }}>
                <button
                  type="submit"
                  disabled={i === 0}
                  className="rounded border px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
              </form>
              <form action={async () => {
                "use server";
                await moveHeroSlide(slide.id, "down");
              }}>
                <button
                  type="submit"
                  disabled={i === slides.length - 1}
                  className="rounded border px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
              </form>
            </div>

            <Link
              href={`/admin/hero-banner/${slide.id}`}
              className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </Link>

            <form action={async () => {
              "use server";
              await deleteHeroSlide(slide.id);
            }}>
              <button
                type="submit"
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </form>
          </div>
        ))}

        {slides.length === 0 && (
          <p className="rounded-xl border bg-white p-10 text-center text-gray-500">
            No slides yet - the homepage banner won&apos;t render anything until you add one.
          </p>
        )}
      </div>
    </div>
  );
}
