export type ToppingQuantity = 'none' | 'less' | 'regular' | 'extra';
export type SauceQuantity = 'less' | 'regular' | 'extra';
export type SpicyLevel = 'none' | 'medium' | 'hot';
export type PizzaSide = 'left' | 'right' | 'whole';

export interface SideSpicyLevel {
  left: SpicyLevel;
  right: SpicyLevel;
}

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

export interface ToppingSideSelection {
  side: PizzaSide;
  quantity: Exclude<ToppingQuantity, 'none'>; // 'less' | 'regular' | 'extra'
}

export interface SelectedTopping {
  id: string;
  name: string;
  quantity: ToppingQuantity;
  price: number;
  isDefault?: boolean;
  isVeg?: boolean;
  side?: PizzaSide; // which side of pizza
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
  spicyLevel: SideSpicyLevel;
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
