import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { Toaster } from "@/components/ui/toast";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        דילוג לתוכן הראשי
      </a>
      <Header />
      <main id="main" className="min-h-[60vh]">{children}</main>
      <Footer />
      <Toaster />
    </>
  );
}
