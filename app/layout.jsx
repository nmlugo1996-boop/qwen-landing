import "../styles/globals.css";
import Header from "../components/Header";

export const metadata = {
  title: "Генератор уникальных Мясных продуктов",
  description: "По методике Когнитивно-Сенсорного Маркетинга (“Полярная звезда”)"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="relative min-h-screen text-[#222222]">
        <Header />
        <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 lg:py-16">
          {children}
        </main>
        <div id="toast" className="toast" role="status" aria-live="assertive" aria-atomic="true" />
      </body>
    </html>
  );
}

