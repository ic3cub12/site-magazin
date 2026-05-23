import { Car, Home, Smartphone, Zap, Sofa, ShoppingBag, Dumbbell, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Category } from "./supabase";

export interface CategoryConfig {
  key: Category;
  label: string;
  icon: LucideIcon;
  color: string;
  subcategories: string[];
  attributes: AttributeConfig[];
}

export interface AttributeConfig {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  placeholder?: string;
}

export const CATEGORIES: CategoryConfig[] = [
  {
    key: "cars",
    label: "Auto & Moto",
    icon: Car,
    color: "bg-blue-500",
    subcategories: ["Autoturism", "SUV", "Van / Minibus", "Camion", "Motocicleta", "Scuter", "ATV", "Altele"],
    attributes: [
      { key: "marca", label: "Marca", type: "text", placeholder: "ex: Volkswagen" },
      { key: "model", label: "Model", type: "text", placeholder: "ex: Golf" },
      { key: "an_fabricatie", label: "An fabricatie", type: "number", placeholder: "ex: 2018" },
      { key: "kilometraj", label: "Kilometraj (km)", type: "number", placeholder: "ex: 85000" },
      { key: "combustibil", label: "Combustibil", type: "select", options: ["Benzina", "Motorina", "Electric", "Hibrid", "GPL", "Altele"] },
      { key: "cutie_viteze", label: "Cutie viteze", type: "select", options: ["Manuala", "Automata", "Semi-automata"] },
      { key: "putere_cp", label: "Putere (CP)", type: "number", placeholder: "ex: 150" },
      { key: "capacitate_cilindrica", label: "Capacitate cilindrica (cm3)", type: "number", placeholder: "ex: 1968" },
    ],
  },
  {
    key: "real_estate",
    label: "Imobiliare",
    icon: Home,
    color: "bg-green-500",
    subcategories: ["Apartament", "Casa / Vila", "Teren", "Spatiu comercial", "Depozit / Hala", "Birou", "Garsoniera"],
    attributes: [
      { key: "suprafata", label: "Suprafata (mp)", type: "number", placeholder: "ex: 75" },
      { key: "nr_camere", label: "Nr. camere", type: "number", placeholder: "ex: 3" },
      { key: "etaj", label: "Etaj", type: "text", placeholder: "ex: 3 din 8" },
      { key: "an_constructie", label: "An constructie", type: "number", placeholder: "ex: 2005" },
      { key: "compartimentare", label: "Compartimentare", type: "select", options: ["Decomandat", "Semidecomandat", "Nedecomandat", "Circular"] },
      { key: "incalzire", label: "Incalzire", type: "select", options: ["Centrala proprie", "Centrala de bloc", "Termoficare", "Soba / Semineu", "Altele"] },
    ],
  },
  {
    key: "electronics",
    label: "Electronice",
    icon: Smartphone,
    color: "bg-sky-500",
    subcategories: ["Telefon mobil", "Laptop", "Tableta", "Televizor", "Camera foto/video", "Consola jocuri", "Componente PC", "Accesorii", "Altele"],
    attributes: [
      { key: "marca", label: "Marca", type: "text", placeholder: "ex: Apple" },
      { key: "model", label: "Model", type: "text", placeholder: "ex: iPhone 14" },
      { key: "an", label: "An achizitie", type: "number", placeholder: "ex: 2022" },
      { key: "stocare", label: "Stocare (GB)", type: "number", placeholder: "ex: 256" },
      { key: "culoare", label: "Culoare", type: "text", placeholder: "ex: Negru" },
    ],
  },
  {
    key: "appliances",
    label: "Electrocasnice",
    icon: Zap,
    color: "bg-amber-500",
    subcategories: ["Masina de spalat", "Frigider / Combina", "Aragaz / Cuptor", "Masina de spalat vase", "Aer conditionat", "Aspirator", "Masina de cafea", "Altele"],
    attributes: [
      { key: "marca", label: "Marca", type: "text", placeholder: "ex: Bosch" },
      { key: "model", label: "Model", type: "text", placeholder: "ex: WAX28EH0BY" },
      { key: "an", label: "An achizitie", type: "number", placeholder: "ex: 2020" },
      { key: "capacitate", label: "Capacitate", type: "text", placeholder: "ex: 8 kg / 250L" },
      { key: "clasa_energetica", label: "Clasa energetica", type: "select", options: ["A+++", "A++", "A+", "A", "B", "C", "D"] },
    ],
  },
  {
    key: "furniture",
    label: "Mobila & Design",
    icon: Sofa,
    color: "bg-orange-500",
    subcategories: ["Canapea / Fotoliu", "Pat / Dormitor", "Masa / Scaune", "Dulap / Biblioteca", "Birou", "Raft / Etajera", "Altele"],
    attributes: [
      { key: "marca", label: "Marca", type: "text", placeholder: "ex: IKEA" },
      { key: "material", label: "Material", type: "text", placeholder: "ex: Lemn masiv" },
      { key: "culoare", label: "Culoare / Finisaj", type: "text", placeholder: "ex: Nuc" },
      { key: "dimensiuni", label: "Dimensiuni (cm)", type: "text", placeholder: "ex: 200x90x80" },
    ],
  },
  {
    key: "clothing",
    label: "Haine & Moda",
    icon: ShoppingBag,
    color: "bg-pink-500",
    subcategories: ["Haine barbati", "Haine femei", "Haine copii", "Incaltaminte", "Genti / Accesorii", "Bijuterii", "Ceasuri", "Altele"],
    attributes: [
      { key: "marca", label: "Marca", type: "text", placeholder: "ex: Zara" },
      { key: "marime", label: "Marime", type: "text", placeholder: "ex: M / 40" },
      { key: "culoare", label: "Culoare", type: "text", placeholder: "ex: Albastru" },
      { key: "material", label: "Material", type: "text", placeholder: "ex: Bumbac" },
    ],
  },
  {
    key: "sports",
    label: "Sport & Timp liber",
    icon: Dumbbell,
    color: "bg-red-500",
    subcategories: ["Bicicleta", "Echipament fitness", "Sporturi de iarna", "Sporturi de apa", "Camping / Drumetii", "Arte martiale", "Altele"],
    attributes: [
      { key: "marca", label: "Marca", type: "text", placeholder: "ex: Trek" },
      { key: "model", label: "Model", type: "text", placeholder: "ex: FX3" },
      { key: "marime", label: "Marime / Dimensiune", type: "text", placeholder: "ex: M / 54cm" },
      { key: "an", label: "An achizitie", type: "number", placeholder: "ex: 2021" },
    ],
  },
  {
    key: "other",
    label: "Diverse",
    icon: Tag,
    color: "bg-slate-500",
    subcategories: ["Carti / Reviste", "Muzica / Film", "Jocuri / Jucarii", "Animale", "Gradina", "Unelte", "Altele"],
    attributes: [
      { key: "marca", label: "Marca / Brand", type: "text", placeholder: "optional" },
      { key: "model", label: "Model", type: "text", placeholder: "optional" },
    ],
  },
];

export const CONDITIONS = [
  { key: "new", label: "Nou", description: "Produs nou, in ambalaj original" },
  { key: "like_new", label: "Ca nou", description: "Folosit foarte putin, fara urme vizibile" },
  { key: "good", label: "Stare buna", description: "Urme minore de utilizare, functional 100%" },
  { key: "fair", label: "Stare acceptabila", description: "Uzura vizibila, dar functional" },
  { key: "poor", label: "Stare precara", description: "Defecte sau uzura semnificativa" },
] as const;

export function getCategoryConfig(key: Category): CategoryConfig {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}
