import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-2">404 - Page Not Found</h1>
      <p className="text-gray-600 mb-4">The page you’re looking for doesn’t exist.</p>
      <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Go Home
      </Link>
    </main>
  );
}
