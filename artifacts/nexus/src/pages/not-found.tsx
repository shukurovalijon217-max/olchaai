import { Link } from "wouter";
import { Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background">
      <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center glow-primary">
        <Zap className="w-8 h-8 text-primary" />
      </div>
      <div className="text-center">
        <h1 className="text-5xl font-bold aurora-text mb-2">404</h1>
        <p className="text-muted-foreground">This dimension doesn't exist.</p>
      </div>
      <Link href="/">
        <button className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
          Back to NEXUS
        </button>
      </Link>
    </div>
  );
}
