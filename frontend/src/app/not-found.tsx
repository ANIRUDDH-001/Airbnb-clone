import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24">
      <p className="text-[96px] font-extrabold leading-none text-ink">Oops!</p>
      <h1 className="mt-6 text-[26px] font-semibold">We can&apos;t seem to find the page you&apos;re looking for.</h1>
      <p className="mt-2 text-muted">Error code: 404. The listing may have been removed, or the link is wrong.</p>
      <p className="mt-8 font-semibold">Here are some helpful links instead:</p>
      <ul className="mt-3 space-y-2 text-[#008489]">
        <li><Link href="/" className="underline">Home</Link></li>
        <li><Link href="/s/anywhere/homes" className="underline">Search all homes</Link></li>
        <li><Link href="/trips" className="underline">Trips</Link></li>
      </ul>
    </div>
  );
}
