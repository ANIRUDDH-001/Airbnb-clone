import {
  AirVent, AlarmSmoke, Bath, BriefcaseMedical, Building2, Car, Castle, Circle, Coffee, CookingPot, Droplets,
  Dumbbell, FireExtinguisher, Flame, FlameKindling, Heater, House, KeyRound, Landmark, Laptop, type LucideIcon,
  type LucideProps, Mountain, MountainSnow, PlugZap, Sailboat, Shirt, Ship, TentTree, Tractor, TreePalm, Trees, Tv,
  Umbrella, WashingMachine, Waves, Wifi, Wind,
} from "lucide-react";

// The API names icons by their Lucide slug (seed data: categories and amenities). An explicit map keeps the
// bundle small and makes every icon render on the server, unlike lucide's lazy DynamicIcon.
const ICONS: Record<string, LucideIcon> = {
  "air-vent": AirVent, "alarm-smoke": AlarmSmoke, bath: Bath, "briefcase-medical": BriefcaseMedical,
  "building-2": Building2, car: Car, castle: Castle, coffee: Coffee, "cooking-pot": CookingPot, droplets: Droplets,
  dumbbell: Dumbbell, "fire-extinguisher": FireExtinguisher, flame: Flame, "flame-kindling": FlameKindling,
  heater: Heater, house: House, "key-round": KeyRound, landmark: Landmark, laptop: Laptop, mountain: Mountain,
  "mountain-snow": MountainSnow, "plug-zap": PlugZap, sailboat: Sailboat, shirt: Shirt, ship: Ship,
  "tent-tree": TentTree, tractor: Tractor, "tree-palm": TreePalm, trees: Trees, tv: Tv, umbrella: Umbrella,
  "washing-machine": WashingMachine, waves: Waves, wifi: Wifi, wind: Wind,
};

export function NamedIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Circle;
  return <Icon aria-hidden {...props} />;
}
