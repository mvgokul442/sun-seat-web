
import { SeatRecommendation } from "@/components/seat-recommendation";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-background overflow-x-hidden">
      {/* Decorative background elements */}
      <div className="fixed top-0 left-0 w-full h-1/2 bg-gradient-to-b from-primary/10 to-transparent -z-10 pointer-events-none" />
      <div className="fixed -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-24 -left-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10" />

      <header className="w-full py-12 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
          Sun <span className="text-primary">Seat</span> Guide
        </h1>
        <p className="max-w-xl mx-auto text-muted-foreground text-lg font-medium">
          Whether you're traveling by bus, train, or car — know exactly where to sit to stay cool or soak up the sun.
        </p>
      </header>

      <section className="w-full max-w-4xl pb-20">
        <SeatRecommendation />
      </section>

      <footer className="w-full py-8 text-center text-muted-foreground text-sm border-t mt-auto">
        <p>© {new Date().getFullYear()} Sun Seat Guide. Travel smarter, arrive happier.</p>
      </footer>
      
      <Toaster />
    </main>
  );
}
