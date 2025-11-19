import { Link } from "wouter";
import { Snowflake, Calendar } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <Snowflake className="text-primary text-3xl" />
            <span className="text-2xl font-bold text-foreground">Cool Slush</span>
          </Link>
          <div className="flex items-center space-x-6">
            <a href="#services" className="hidden md:inline text-foreground hover:text-primary transition-colors">Services</a>
            <a href="#tarifs" className="hidden md:inline text-foreground hover:text-primary transition-colors">Tarifs</a>
            <a href="#comment-ca-marche" className="hidden md:inline text-foreground hover:text-primary transition-colors">Comment ça marche</a>
            <Link 
              href="/booking" 
              className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              data-testid="button-book-now"
            >
              <Calendar className="mr-2 w-4 h-4" />
              Réserver
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
