import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Save, Eye, EyeOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Setting } from "@shared/schema";
import AdminNav from "@/components/admin-nav";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";

const TRACKING_CODES = [
  {
    key: "google_analytics",
    label: "Google Analytics 4",
    placeholder: "G-XXXXXXXXXX",
    description: "ID de mesure Google Analytics 4 (commence par G-)",
  },
  {
    key: "facebook_pixel",
    label: "Facebook Pixel",
    placeholder: "1234567890",
    description: "ID du Facebook Pixel (numérique)",
  },
  {
    key: "google_tag_manager",
    label: "Google Tag Manager",
    placeholder: "GTM-XXXXXXX",
    description: "ID de conteneur Google Tag Manager (commence par GTM-)",
  },
  {
    key: "microsoft_clarity",
    label: "Microsoft Clarity",
    placeholder: "abcd1234",
    description: "Project ID Microsoft Clarity",
  },
  {
    key: "tiktok_pixel",
    label: "TikTok Pixel",
    placeholder: "ABCDEF1234567890",
    description: "ID du TikTok Pixel",
  },
];

export default function AdminSettings() {
  useAdminAuth();

  const [showValues, setShowValues] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [localSettings, setLocalSettings] = useState<Record<string, { value: string; active: boolean }>>({});

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setLocation("/admin/login");
    }
  }, [setLocation]);

  const { data: settings, isLoading } = useQuery<Setting[]>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/settings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        setLocation("/admin/login");
        throw new Error("Non autorisé");
      }
      return response.json();
    },
  });

  // Initialize local settings from fetched data
  useEffect(() => {
    if (settings) {
      const settingsMap: Record<string, { value: string; active: boolean }> = {};
      settings.forEach((setting) => {
        settingsMap[setting.key] = {
          value: setting.value || "",
          active: setting.active,
        };
      });
      setLocalSettings(settingsMap);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (settingsToSave: Array<{ key: string; value: string; active: boolean }>) => {
      const token = localStorage.getItem("adminToken");
      const promises = settingsToSave.map((setting) =>
        apiRequest("POST", "/api/admin/settings", setting, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Paramètres sauvegardés",
        description: "Les codes de tracking ont été mis à jour",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const settingsToSave = TRACKING_CODES.map((code) => ({
      key: code.key,
      value: localSettings[code.key]?.value || "",
      active: localSettings[code.key]?.active ?? true,
    }));
    saveMutation.mutate(settingsToSave);
  };

  const updateLocalSetting = (key: string, field: "value" | "active", newValue: string | boolean) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: newValue,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            Paramètres de tracking
          </h1>
          <p className="text-muted-foreground mt-2">
            Configurez les codes de tracking pour analyser les visites et conversions
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Codes de tracking</CardTitle>
            <CardDescription>
              Ajoutez vos identifiants pour activer le suivi des visiteurs et des événements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {showValues ? "Masquer les valeurs" : "Afficher les valeurs"}
                </span>
              </div>
              <Switch checked={showValues} onCheckedChange={setShowValues} />
            </div>

            {TRACKING_CODES.map((code) => (
              <div key={code.key} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor={code.key} className="text-base font-semibold">
                      {code.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">{code.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Actif</span>
                    <Switch
                      checked={localSettings[code.key]?.active ?? true}
                      onCheckedChange={(checked) => updateLocalSetting(code.key, "active", checked)}
                      data-testid={`switch-${code.key}`}
                    />
                  </div>
                </div>
                <Input
                  id={code.key}
                  type={showValues ? "text" : "password"}
                  placeholder={code.placeholder}
                  value={localSettings[code.key]?.value || ""}
                  onChange={(e) => updateLocalSetting(code.key, "value", e.target.value)}
                  data-testid={`input-${code.key}`}
                />
              </div>
            ))}

            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="w-full"
              size="lg"
              data-testid="button-save-settings"
            >
              <Save className="mr-2 w-4 h-4" />
              {saveMutation.isPending ? "Sauvegarde..." : "Sauvegarder les paramètres"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                • Les codes actifs seront automatiquement intégrés dans votre site pour tracker les
                visites
              </p>
              <p>
                • Les événements suivis incluent : pages vues, réservations, paiements, navigation
              </p>
              <p>• Les données sont envoyées uniquement aux services activés ci-dessus</p>
              <p>
                • Pour obtenir vos codes de tracking, créez des comptes sur les plateformes
                correspondantes
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
