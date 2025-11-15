import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Snowflake, Zap, Droplets, ThermometerSnowflake } from "lucide-react";
import { Machine } from "@shared/schema";
import { Link } from "wouter";

interface MachineCardProps {
  machine: Machine;
}

const statusMap = {
  AVAILABLE: { 
    label: "Disponible", 
    variant: "default" as const,
    className: "bg-success/10 text-success hover:bg-success/20"
  },
  UNAVAILABLE: { 
    label: "Réservée", 
    variant: "destructive" as const,
    className: "bg-destructive/10 text-destructive"
  },
  MAINTENANCE: { 
    label: "Maintenance", 
    variant: "secondary" as const,
    className: "bg-yellow-100 text-yellow-800"
  }
};

export default function MachineCard({ machine }: MachineCardProps) {
  const status = statusMap[machine.status as keyof typeof statusMap];
  const isAvailable = machine.status === "AVAILABLE";

  return (
    <Card className={`rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 ${!isAvailable ? 'opacity-75' : ''}`}>
      <div className="relative">
        <img 
          src="https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400" 
          alt="Machine à granité Ninja professionnelle" 
          className={`w-full h-56 object-cover ${!isAvailable ? 'grayscale' : ''}`}
          data-testid={`img-machine-${machine.id}`}
        />
        <div className="absolute top-4 right-4">
          <Badge className={`${status.className} shadow-lg`} data-testid={`badge-status-${machine.id}`}>
            {status.label}
          </Badge>
        </div>
        {isAvailable && (
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-primary">
            🍹 Prête à l'emploi
          </div>
        )}
      </div>
      
      <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-foreground mb-2" data-testid={`text-machine-name-${machine.id}`}>
            {machine.name}
          </h3>
          <p className="text-sm text-muted-foreground">Machine professionnelle Ninja</p>
        </div>
        
        <div className="bg-muted/50 rounded-2xl p-4 mb-6">
          <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Snowflake className="w-4 h-4 text-primary" />
            Ninja Slushi 2,5L - 5 programmes
          </h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2" data-testid={`feature-capacity-${machine.id}`}>
              <Droplets className="w-4 h-4 text-primary" />
              <span><strong>Capacité :</strong> 2,5 litres</span>
            </div>
            <div className="flex items-center gap-2" data-testid={`feature-programs-${machine.id}`}>
              <Zap className="w-4 h-4 text-primary" />
              <span><strong>5 programmes :</strong> Slushi, Milkshake, Frozen Drink, Smoothie, Glace italienne</span>
            </div>
            <div className="flex items-center gap-2" data-testid={`feature-cooling-${machine.id}`}>
              <ThermometerSnowflake className="w-4 h-4 text-primary" />
              <span>Refroidissement rapide et efficace</span>
            </div>
            <div className="flex items-center gap-2" data-testid={`feature-clean-${machine.id}`}>
              <CheckCircle className="w-4 h-4 text-success" />
              <span>Facile à nettoyer</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-2">
              ✅ Livraison et installation incluses
            </p>
            <p className="flex items-center gap-2">
              📖 Manuel d'utilisation fourni
            </p>
            <p className="flex items-center gap-2">
              🎯 Support technique 7j/7
            </p>
          </div>
        </div>
        
        {isAvailable ? (
          <Link href="/booking">
            <Button 
              className="w-full rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
              data-testid={`button-book-machine-${machine.id}`}
            >
              Réserver cette machine
            </Button>
          </Link>
        ) : (
          <Button 
            disabled 
            className="w-full rounded-2xl cursor-not-allowed bg-muted"
            data-testid={`button-unavailable-${machine.id}`}
          >
            {machine.status === 'MAINTENANCE' ? 'En maintenance' : 'Déjà réservée'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
