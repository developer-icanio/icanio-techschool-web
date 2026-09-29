import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-2xl place-items-center px-4 py-20 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-navy">404</p>
        <h1 className="mt-2 text-4xl font-bold">This page has moved or does not exist</h1>
        <p className="mt-4 text-lg text-body">Pick where you want to go next.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/internships" className="btn btn-primary">Browse internships</Link>
          <Link href="/college-programs" className="btn btn-outline">College programs</Link>
          <Link href="/contact" className="btn btn-outline">Contact us</Link>
        </div>
      </div>
    </main>
  );
}
