import { Bath, Flame, Laptop, Mountain, PawPrint, Sparkles, Trees, Utensils, Waves, Wifi } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Icon } from "@/components";
import { AMENITY_LABELS } from "@/lib/search";
import type { Amenity } from "@/lib/search";
import type { SearchStay } from "@/lib/search-query";

export const amenityIcons: Record<Amenity, LucideIcon> = {
  "hot-tub": Bath,
  pool: Waves,
  fireplace: Flame,
  "ocean-view": Mountain,
  wifi: Wifi,
  workspace: Laptop,
  "forest-view": Trees,
  "fire-pit": Flame,
  kitchen: Utensils,
  "lake-view": Waves,
  bbq: Flame,
  "beach-access": Waves,
  "air-conditioning": Sparkles,
  "skyline-view": Mountain,
  "mountain-view": Mountain,
  "ev-charger": Sparkles,
};

// The two badges on a card: the first amenity, then Pet Friendly when it applies, then the next amenity.
export function badges(p: Pick<SearchStay, "amenities" | "petsAllowed">) {
  const list = p.amenities.map((a) => ({ label: AMENITY_LABELS[a], icon: amenityIcons[a] }));
  if (p.petsAllowed) list.splice(1, 0, { label: "Pet Friendly", icon: PawPrint });
  return list.slice(0, 2).map(({ label, icon }) => ({ label, icon: <Icon icon={icon} size="sm" /> }));
}

