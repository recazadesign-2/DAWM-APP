import L1 from "./level-1.png";
import L2 from "./level-2.png";
import L3 from "./level-3.png";
import L4 from "./level-4.png";
import L5 from "./level-5.png";
import L6 from "./level-6.png";

export const LEVEL_IMAGES: Record<number, string> = {
  1: L1, 2: L2, 3: L3, 4: L4, 5: L5, 6: L6,
};

export function getLevelImage(level: number): string {
  return LEVEL_IMAGES[level] ?? LEVEL_IMAGES[1];
}
