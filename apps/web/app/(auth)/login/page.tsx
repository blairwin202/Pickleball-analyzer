import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-green-700">PickleIQ</h1>
          <p className="mt-2 text-gray-500">AI-powered pickleball analysis</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
