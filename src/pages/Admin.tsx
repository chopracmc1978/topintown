import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Pizza, Drumstick, GlassWater, Droplet, Layers, Users, Soup, UtensilsCrossed, UserCheck, Tag, Megaphone, Package, ImageIcon } from 'lucide-react';
import MenuItemsManager from '@/components/admin/MenuItemsManager';
import ToppingsManager from '@/components/admin/ToppingsManager';
import UsersManager from '@/components/admin/UsersManager';
import CustomersManager from '@/components/admin/CustomersManager';
import CouponsManager from '@/components/admin/CouponsManager';
import PromotionsManager from '@/components/admin/PromotionsManager';
import CombosManager from '@/components/admin/CombosManager';
import PopupPostersManager from '@/components/admin/PopupPostersManager';
import { GlobalSauceManager } from '@/components/admin/GlobalSauceManager';
import type { MenuCategory } from '@/hooks/useMenuItems';

const categoryIcons: Record<MenuCategory, React.ReactNode> = {
  pizza: <Pizza className="w-4 h-4" />,
  sides: <Pizza className="w-4 h-4" />, // Keep for type safety but won't be used
  drinks: <GlassWater className="w-4 h-4" />,
  desserts: <Pizza className="w-4 h-4" />, // Keep for type safety but won't be used
  dipping_sauce: <Droplet className="w-4 h-4" />,
  chicken_wings: <Drumstick className="w-4 h-4" />,
  baked_lasagna: <UtensilsCrossed className="w-4 h-4" />,
};

const categoryLabels: Record<MenuCategory, string> = {
  pizza: 'Pizzas',
  sides: 'Sides', // Keep for type safety but won't be used
  drinks: 'Drinks',
  desserts: 'Desserts', // Keep for type safety but won't be used
  dipping_sauce: 'Dipping Sauces',
  chicken_wings: 'Chicken Wings',
  baked_lasagna: 'Baked Lasagna',
};

// Categories to display (excluding sides and desserts)
const displayCategories: MenuCategory[] = ['pizza', 'chicken_wings', 'baked_lasagna', 'drinks', 'dipping_sauce'];

const Admin = () => {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('pizza');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-[100] isolate shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {user.email} {isAdmin && <span className="text-primary">(Admin)</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/pos')}>
                Go to POS
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                View Website
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Tabs Navigation - inside sticky header */}
        {isAdmin && (
          <div className="container mx-auto px-4 pb-4 space-y-2">
            {/* Row 1: Menu Categories */}
            <TabsList className="grid grid-cols-5 w-full max-w-3xl">
              {displayCategories.map((category) => (
                <TabsTrigger key={category} value={category} className="gap-2">
                  {categoryIcons[category]}
                  <span className="hidden sm:inline">{categoryLabels[category]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {/* Row 2: Settings & Management */}
            <TabsList className="grid grid-cols-8 w-full max-w-5xl">
              <TabsTrigger value="toppings" className="gap-2">
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Toppings</span>
              </TabsTrigger>
              <TabsTrigger value="sauces" className="gap-2">
                <Soup className="w-4 h-4" />
                <span className="hidden sm:inline">Sauces</span>
              </TabsTrigger>
              <TabsTrigger value="combos" className="gap-2">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Combos</span>
              </TabsTrigger>
              <TabsTrigger value="promotions" className="gap-2">
                <Megaphone className="w-4 h-4" />
                <span className="hidden sm:inline">Promos</span>
              </TabsTrigger>
              <TabsTrigger value="posters" className="gap-2">
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Posters</span>
              </TabsTrigger>
              <TabsTrigger value="coupons" className="gap-2">
                <Tag className="w-4 h-4" />
                <span className="hidden sm:inline">Coupons</span>
              </TabsTrigger>
              <TabsTrigger value="customers" className="gap-2">
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Customers</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
            </TabsList>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!isAdmin ? (
          <div className="bg-accent/10 border border-accent rounded-lg p-6 text-center">
            <h2 className="font-serif text-xl font-semibold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground mb-4">
              You need admin privileges to manage the menu. Please contact the system administrator.
            </p>
            <p className="text-sm text-muted-foreground">
              Your user ID: <code className="bg-muted px-2 py-1 rounded text-xs">{user.id}</code>
            </p>
          </div>
        ) : (
          <>
            {displayCategories.map((category) => (
              <TabsContent key={category} value={category} className="mt-0">
                <MenuItemsManager category={category} />
              </TabsContent>
            ))}

            <TabsContent value="toppings" className="mt-0">
              <ToppingsManager />
            </TabsContent>

            <TabsContent value="sauces" className="mt-0">
              <GlobalSauceManager />
            </TabsContent>

            <TabsContent value="combos" className="mt-0">
              <CombosManager />
            </TabsContent>

            <TabsContent value="promotions" className="mt-0">
              <PromotionsManager />
            </TabsContent>

            <TabsContent value="posters" className="mt-0">
              <PopupPostersManager />
            </TabsContent>

            <TabsContent value="coupons" className="mt-0">
              <CouponsManager />
            </TabsContent>

            <TabsContent value="customers" className="mt-0">
              <CustomersManager />
            </TabsContent>

            <TabsContent value="users" className="mt-0">
              <UsersManager />
            </TabsContent>
          </>
        )}
      </main>
    </Tabs>
  );
};

export default Admin;
