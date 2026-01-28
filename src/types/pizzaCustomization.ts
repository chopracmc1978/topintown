export type ToppingQuantity = 'none' | 'less' | 'regular' | 'extra';
export type SauceQuantity = 'regular' | 'extra';
export type SpicyLevel = 'none' | 'mild' | 'medium' | 'hot';

export interface SelectedSauce {
  id: string;
  name: string;
  quantity: SauceQuantity;
  price: number;
  isDefault?: boolean;
}

export interface SelectedCheese {
  id: string;
  name: string;
  quantity: 'regular' | 'extra';
  price: number;
}

export interface SelectedTopping {
  id: string;
  name: string;
  quantity: ToppingQuantity;
  price: number;
  isDefault?: boolean;
  isVeg?: boolean;
}

export interface SelectedFreeTopping {
  id: string;
  name: string;
}

export interface PizzaCustomization {
  size: {
    id: string;
    name: string;
    price: number;
  };
  crust: {
    id: string;
    name: string;
    price: number;
  };
  sauces: SelectedSauce[];
  cheese: SelectedCheese;
  freeToppings: SelectedFreeTopping[];
  spicyLevel: SpicyLevel;
  defaultToppings: SelectedTopping[];
  extraToppings: SelectedTopping[];
  totalPrice: number;
}

export interface CustomizedCartItem {
  menuItemId: string;
  menuItemName: string;
  menuItemImage: string;
  customization: PizzaCustomization;
  quantity: number;
}
