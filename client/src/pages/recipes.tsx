import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Snowflake, IceCream, Coffee, Grape, Cake } from "lucide-react";

const recipes = [
  {
    category: "Slushi",
    icon: Snowflake,
    color: "bg-blue-500",
    recipes: [
      {
        name: "Slushi Tropical",
        ingredients: ["250ml jus d'ananas", "250ml jus de mangue", "50ml sirop de passion", "Glaçons"],
        instructions: "Mélangez tous les ingrédients et versez dans la machine. Sélectionnez le programme Slushi et laissez agir 15-20 minutes.",
        tips: "Servez avec une tranche d'ananas frais pour la décoration"
      },
      {
        name: "Slushi Fraise-Citron",
        ingredients: ["400ml jus de fraise", "100ml jus de citron", "50ml sirop de sucre de canne", "Glaçons"],
        instructions: "Combinez les jus et le sirop. Lancez le programme Slushi pour obtenir une texture granuleuse parfaite.",
        tips: "Ajoutez des morceaux de fraise fraîche pour plus de gourmandise"
      }
    ]
  },
  {
    category: "Milkshake",
    icon: Coffee,
    color: "bg-amber-600",
    recipes: [
      {
        name: "Milkshake Vanille Caramel",
        ingredients: ["300ml lait entier", "2 boules glace vanille", "50ml sirop de caramel", "Crème fouettée"],
        instructions: "Placez tous les ingrédients dans la machine et sélectionnez le programme Milkshake pour un mélange onctueux.",
        tips: "Décorez avec de la crème fouettée et un filet de caramel"
      },
      {
        name: "Milkshake Chocolat Banane",
        ingredients: ["250ml lait", "1 banane", "2 boules glace chocolat", "20g cacao en poudre"],
        instructions: "Utilisez le programme Milkshake pour obtenir une texture crémeuse et homogène en 2-3 minutes.",
        tips: "Servez immédiatement avec des copeaux de chocolat"
      }
    ]
  },
  {
    category: "Frozen Drink",
    icon: Grape,
    color: "bg-purple-500",
    recipes: [
      {
        name: "Mojito Glacé",
        ingredients: ["200ml jus de citron vert", "150ml sirop de menthe", "150ml eau gazeuse", "Feuilles de menthe", "Glaçons"],
        instructions: "Mélangez les liquides et lancez le programme Frozen Drink pour une texture granité rafraîchissante.",
        tips: "Garnissez de feuilles de menthe fraîche et de rondelles de citron vert"
      },
      {
        name: "Piña Colada Frozen",
        ingredients: ["200ml jus d'ananas", "150ml lait de coco", "50ml sirop de coco", "Glaçons pilés"],
        instructions: "Sélectionnez Frozen Drink pour transformer ces ingrédients en cocktail glacé tropical.",
        tips: "Décorez avec un morceau d'ananas et une cerise"
      }
    ]
  },
  {
    category: "Smoothie",
    icon: IceCream,
    color: "bg-green-500",
    recipes: [
      {
        name: "Smoothie Fruits Rouges",
        ingredients: ["100g fraises", "100g framboises", "1 banane", "200ml yaourt nature", "50ml miel"],
        instructions: "Utilisez le programme Smoothie pour mixer tous les fruits et obtenir une texture lisse et onctueuse.",
        tips: "Ajoutez des graines de chia pour plus de nutriments"
      },
      {
        name: "Smoothie Mangue Passion",
        ingredients: ["1 mangue", "2 fruits de la passion", "150ml yaourt grec", "50ml lait de coco", "Glaçons"],
        instructions: "Le programme Smoothie garantit un mélange parfait sans grumeaux en quelques minutes.",
        tips: "Servez dans un bol avec des morceaux de fruits frais"
      }
    ]
  },
  {
    category: "Glace Italienne",
    icon: Cake,
    color: "bg-pink-500",
    recipes: [
      {
        name: "Glace Vanille Classique",
        ingredients: ["400ml crème liquide", "100ml lait concentré sucré", "2 cuillères à café extrait vanille"],
        instructions: "Mélangez les ingrédients et utilisez le programme Glace italienne pour une texture crémeuse parfaite.",
        tips: "Servez immédiatement en cornet ou en coupe"
      },
      {
        name: "Glace Noix de Coco",
        ingredients: ["300ml lait de coco", "200ml crème de coco", "100ml sirop de coco", "Copeaux de coco"],
        instructions: "Le programme Glace italienne transforme ce mélange en dessert glacé onctueux en 20-25 minutes.",
        tips: "Parsemez de copeaux de coco grillés pour plus de croquant"
      }
    ]
  }
];

export default function Recipes() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background">
      <Navbar />
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4" data-testid="text-recipes-title">
              Recettes Ninja Slushi
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto" data-testid="text-recipes-subtitle">
              Découvrez toutes les possibilités de votre machine Ninja Slushi 2,5L avec ses 5 programmes.
              Des slushis rafraîchissants aux glaces onctueuses, laissez libre cours à votre créativité !
            </p>
          </div>

          <div className="space-y-12">
            {recipes.map((category, categoryIndex) => (
              <div key={categoryIndex} data-testid={`category-${categoryIndex}`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 ${category.color} rounded-xl flex items-center justify-center`}>
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground" data-testid={`text-category-${categoryIndex}`}>
                    {category.category}
                  </h2>
                  <Badge variant="secondary" className="ml-2">
                    {category.recipes.length} recette{category.recipes.length > 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {category.recipes.map((recipe, recipeIndex) => (
                    <Card 
                      key={recipeIndex} 
                      className="rounded-2xl shadow-lg border border-border hover:shadow-xl transition-shadow"
                      data-testid={`card-recipe-${categoryIndex}-${recipeIndex}`}
                    >
                      <CardContent className="p-6">
                        <h3 className="text-xl font-bold text-foreground mb-4" data-testid={`text-recipe-name-${categoryIndex}-${recipeIndex}`}>
                          {recipe.name}
                        </h3>

                        <div className="mb-4">
                          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                            📋 Ingrédients
                          </h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {recipe.ingredients.map((ingredient, i) => (
                              <li key={i} className="flex items-start gap-2" data-testid={`ingredient-${categoryIndex}-${recipeIndex}-${i}`}>
                                <span className="text-primary">•</span>
                                {ingredient}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mb-4">
                          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                            👨‍🍳 Préparation
                          </h4>
                          <p className="text-sm text-muted-foreground" data-testid={`instructions-${categoryIndex}-${recipeIndex}`}>
                            {recipe.instructions}
                          </p>
                        </div>

                        <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                          <p className="text-sm text-foreground">
                            <strong className="text-primary">💡 Astuce :</strong> {recipe.tips}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 bg-gradient-tropical rounded-3xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">Envie de créer vos propres recettes ?</h3>
            <p className="text-lg mb-6 text-white/90">
              Avec la machine Ninja Slushi 2,5L et ses 5 programmes, les possibilités sont infinies. 
              Expérimentez avec vos fruits préférés, vos sirops favoris et partagez vos créations avec nous !
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Badge variant="secondary" className="text-sm px-4 py-2">Programme Slushi</Badge>
              <Badge variant="secondary" className="text-sm px-4 py-2">Programme Milkshake</Badge>
              <Badge variant="secondary" className="text-sm px-4 py-2">Programme Frozen Drink</Badge>
              <Badge variant="secondary" className="text-sm px-4 py-2">Programme Smoothie</Badge>
              <Badge variant="secondary" className="text-sm px-4 py-2">Programme Glace italienne</Badge>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
