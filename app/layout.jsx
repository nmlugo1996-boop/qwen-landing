import "../styles/globals.css";
import Header from "../components/Header";

export const metadata = {
  title: "Генератор уникальных Мясных продуктов",
  description: "По методике Когнитивно-Сенсорного Маркетинга ("Полярная звезда")"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true
};

const BUILD_SHA = process.env.VERCEL_GIT_COMMIT_SHA || "local";

export default function RootLayout({ children }) {
  return (
    <html lang="ru" data-build={BUILD_SHA}>
      <body className="relative min-h-screen bg-[#0f0f10] text-[#222222]">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10"
        >
          <div className="absolute inset-0 bg-[url('/bg-meats.webp')] bg-cover bg-center md:bg-fixed" />
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm md:backdrop-blur-md lg:backdrop-blur-lg" />
          <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_10%,transparent_35%,transparent_65%,black_95%)]" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col">
          <Header />
          <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:gap-10 px-3 md:px-6 py-6 md:py-12 lg:py-16">
            {children}
          </main>
          <footer className="mx-auto w-full max-w-6xl px-3 md:px-6 pb-4 md:pb-6 text-xs text-neutral-500">
            build: {BUILD_SHA.slice(0, 7)}
          </footer>
        </div>

        <div id="toast" className="toast" role="status" aria-live="assertive" aria-atomic="true" />
      </body>
    </html>
  );
}

