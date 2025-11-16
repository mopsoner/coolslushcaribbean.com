import { Link, useLocation } from "wouter";
import { Snowflake, Calendar, DollarSign, Droplet, LayoutDashboard, Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminNav() {
  const [location] = useLocation();

  const navItems = [
    {
      href: "/admin/bookings",
      label: "Réservations",
      icon: Calendar,
    },
    {
      href: "/admin/machines",
      label: "Machines",
      icon: Snowflake,
    },
    {
      href: "/admin/pricing",
      label: "Prix",
      icon: DollarSign,
    },
    {
      href: "/admin/syrups",
      label: "Sirops",
      icon: Droplet,
    },
    {
      href: "/admin/settings",
      label: "Paramètres",
      icon: Settings,
    },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <Snowflake className="text-primary text-3xl" />
            <span className="text-2xl font-bold text-foreground">Cool'Slush</span>
            <span className="hidden sm:inline text-muted-foreground text-sm">Admin</span>
          </Link>
          
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link 
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="mr-2 w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground font-medium transition-colors"
              data-testid="nav-home"
            >
              <Home className="mr-2 w-4 h-4" />
              Accueil
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
