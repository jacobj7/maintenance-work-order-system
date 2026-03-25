import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome</h1>
          <p className="text-gray-600">
            Get started by logging in or creating an account.
          </p>
        </div>

        <nav className="flex flex-col space-y-4">
          <Link
            href="/login"
            className="w-full text-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="w-full text-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Register
          </Link>

          <Link
            href="/submit"
            className="w-full text-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
          >
            Submit
          </Link>
        </nav>
      </div>
    </main>
  );
}
