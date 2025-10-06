import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
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
    <Card className={`rounded-3xl overflow-hidden hover:shadow-xl transition-shadow ${!isAvailable ? 'opacity-75' : ''}`}>
      <img 
        src="https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400" 
        alt="Machine à granité EZBASICS" 
        className={`w-full h-48 object-cover ${!isAvailable ? 'grayscale' : ''}`}
        data-testid={`img-machine-${machine.id}`}
      />
      
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-foreground" data-testid={`text-machine-name-${machine.id}`}>
            {machine.name}
          </h3>
          <Badge className={status.className} data-testid={`badge-status-${machine.id}`}>
            {status.label}
          </Badge>
        </div>
        
        <div className="space-y-3 text-sm text-muted-foreground mb-6">
          <div className="flex items-center gap-2" data-testid={`feature-capacity-${machine.id}`}>
            <CheckCircle className="w-4 h-4" />
            <span>Double cuve 12L chacune</span>
          </div>
          <div className="flex items-center gap-2" data-testid={`feature-cooling-${machine.id}`}>
            <CheckCircle className="w-4 h-4" />
            <span>Réfrigération rapide</span>
          </div>
          <div className="flex items-center gap-2" data-testid={`feature-clean-${machine.id}`}>
            <CheckCircle className="w-4 h-4" />
            <span>Facile à nettoyer</span>
          </div>
        </div>
        
        {isAvailable ? (
          <Link href="/booking">
            <Button 
              className="w-full rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              data-testid={`button-book-machine-${machine.id}`}
            >
              Réserver cette machine
            </Button>
          </Link>
        ) : (
          <Button 
            disabled 
            className="w-full rounded-2xl cursor-not-allowed"
            data-testid={`button-unavailable-${machine.id}`}
          >
            Non disponible
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
