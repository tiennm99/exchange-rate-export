import ExchangeRateViewer from "./components/ExchangeRateViewer";

export default function Home() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground font-[family-name:var(--font-geist-sans)]">
      <main className="w-full flex flex-col items-center">
        <ExchangeRateViewer />
      </main>
    </div>
  );
}
