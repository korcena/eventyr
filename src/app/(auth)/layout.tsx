export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-xl font-bold text-white">
            E
          </div>
          <h1 className="text-xl font-bold text-text-primary">Eventyr</h1>
          <p className="mt-1 text-sm text-text-tertiary">
            Plan and manage your tech events
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}