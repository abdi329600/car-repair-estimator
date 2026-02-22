/**
 * Damage tagging options — the manual "Shazam" before AI.
 * Users pick area → damage type → severity.
 */

export interface DamageOption {
  area: string;
  types: { label: string; id: string }[];
}

export const DAMAGE_AREAS: DamageOption[] = [
  {
    area: "Front Bumper",
    types: [
      { label: "Cracked", id: "front_bumper_cracked" },
      { label: "Dented", id: "front_bumper_dented" },
      { label: "Missing", id: "front_bumper_missing" },
      { label: "Scratched", id: "front_bumper_scratched" },
    ],
  },
  {
    area: "Rear Bumper",
    types: [
      { label: "Cracked", id: "rear_bumper_cracked" },
      { label: "Dented", id: "rear_bumper_dented" },
      { label: "Missing", id: "rear_bumper_missing" },
      { label: "Scratched", id: "rear_bumper_scratched" },
    ],
  },
  {
    area: "Hood",
    types: [
      { label: "Dented", id: "hood_dented" },
      { label: "Bent/Buckled", id: "hood_bent" },
      { label: "Scratched", id: "hood_scratched" },
      { label: "Missing", id: "hood_missing" },
    ],
  },
  {
    area: "Trunk/Tailgate",
    types: [
      { label: "Dented", id: "trunk_dented" },
      { label: "Won't Open/Close", id: "trunk_stuck" },
      { label: "Scratched", id: "trunk_scratched" },
      { label: "Missing", id: "trunk_missing" },
    ],
  },
  {
    area: "Headlight (Left)",
    types: [
      { label: "Broken/Cracked", id: "headlight_l_broken" },
      { label: "Missing", id: "headlight_l_missing" },
      { label: "Foggy/Yellowed", id: "headlight_l_foggy" },
    ],
  },
  {
    area: "Headlight (Right)",
    types: [
      { label: "Broken/Cracked", id: "headlight_r_broken" },
      { label: "Missing", id: "headlight_r_missing" },
      { label: "Foggy/Yellowed", id: "headlight_r_foggy" },
    ],
  },
  {
    area: "Taillight (Left)",
    types: [
      { label: "Broken/Cracked", id: "taillight_l_broken" },
      { label: "Missing", id: "taillight_l_missing" },
    ],
  },
  {
    area: "Taillight (Right)",
    types: [
      { label: "Broken/Cracked", id: "taillight_r_broken" },
      { label: "Missing", id: "taillight_r_missing" },
    ],
  },
  {
    area: "Fender (Left)",
    types: [
      { label: "Dented", id: "fender_l_dented" },
      { label: "Rusted", id: "fender_l_rusted" },
      { label: "Scratched", id: "fender_l_scratched" },
      { label: "Missing", id: "fender_l_missing" },
    ],
  },
  {
    area: "Fender (Right)",
    types: [
      { label: "Dented", id: "fender_r_dented" },
      { label: "Rusted", id: "fender_r_rusted" },
      { label: "Scratched", id: "fender_r_scratched" },
      { label: "Missing", id: "fender_r_missing" },
    ],
  },
  {
    area: "Door (Front Left)",
    types: [
      { label: "Dented", id: "door_fl_dented" },
      { label: "Won't Open/Close", id: "door_fl_stuck" },
      { label: "Scratched", id: "door_fl_scratched" },
      { label: "Window Broken", id: "door_fl_window" },
    ],
  },
  {
    area: "Door (Front Right)",
    types: [
      { label: "Dented", id: "door_fr_dented" },
      { label: "Won't Open/Close", id: "door_fr_stuck" },
      { label: "Scratched", id: "door_fr_scratched" },
      { label: "Window Broken", id: "door_fr_window" },
    ],
  },
  {
    area: "Door (Rear Left)",
    types: [
      { label: "Dented", id: "door_rl_dented" },
      { label: "Won't Open/Close", id: "door_rl_stuck" },
      { label: "Scratched", id: "door_rl_scratched" },
      { label: "Window Broken", id: "door_rl_window" },
    ],
  },
  {
    area: "Door (Rear Right)",
    types: [
      { label: "Dented", id: "door_rr_dented" },
      { label: "Won't Open/Close", id: "door_rr_stuck" },
      { label: "Scratched", id: "door_rr_scratched" },
      { label: "Window Broken", id: "door_rr_window" },
    ],
  },
  {
    area: "Windshield",
    types: [
      { label: "Cracked", id: "windshield_cracked" },
      { label: "Chipped", id: "windshield_chipped" },
      { label: "Shattered", id: "windshield_shattered" },
    ],
  },
  {
    area: "Rear Window",
    types: [
      { label: "Cracked", id: "rear_window_cracked" },
      { label: "Shattered", id: "rear_window_shattered" },
    ],
  },
  {
    area: "Side Mirror (Left)",
    types: [
      { label: "Broken", id: "mirror_l_broken" },
      { label: "Missing", id: "mirror_l_missing" },
    ],
  },
  {
    area: "Side Mirror (Right)",
    types: [
      { label: "Broken", id: "mirror_r_broken" },
      { label: "Missing", id: "mirror_r_missing" },
    ],
  },
  {
    area: "Roof",
    types: [
      { label: "Dented", id: "roof_dented" },
      { label: "Crushed", id: "roof_crushed" },
      { label: "Scratched", id: "roof_scratched" },
    ],
  },
  {
    area: "Grille",
    types: [
      { label: "Broken", id: "grille_broken" },
      { label: "Missing", id: "grille_missing" },
    ],
  },
  {
    area: "Radiator/Cooling",
    types: [
      { label: "Leaking", id: "radiator_leaking" },
      { label: "Damaged", id: "radiator_damaged" },
    ],
  },
  {
    area: "Frame/Structural",
    types: [
      { label: "Bent Frame", id: "frame_bent" },
      { label: "Unibody Damage", id: "frame_unibody" },
      { label: "Subframe Damage", id: "frame_subframe" },
    ],
  },
  {
    area: "Suspension",
    types: [
      { label: "Front Strut Damage", id: "suspension_front" },
      { label: "Rear Shock Damage", id: "suspension_rear" },
      { label: "Control Arm Bent", id: "suspension_control_arm" },
    ],
  },
  {
    area: "Wheels/Tires",
    types: [
      { label: "Wheel Bent", id: "wheel_bent" },
      { label: "Tire Flat/Damaged", id: "tire_damaged" },
      { label: "Missing Wheel", id: "wheel_missing" },
    ],
  },
  {
    area: "Engine/Mechanical",
    types: [
      { label: "Won't Start", id: "engine_no_start" },
      { label: "Overheating", id: "engine_overheat" },
      { label: "Oil Leak", id: "engine_oil_leak" },
      { label: "Transmission Issue", id: "engine_trans" },
    ],
  },
  {
    area: "Interior",
    types: [
      { label: "Airbags Deployed", id: "interior_airbags" },
      { label: "Dashboard Damaged", id: "interior_dash" },
      { label: "Seats Damaged", id: "interior_seats" },
      { label: "Water Damage", id: "interior_water" },
    ],
  },
];

export type VehicleClass = "compact" | "midsize" | "fullsize" | "truck" | "suv" | "luxury";

export const VEHICLE_CLASSES: { label: string; value: VehicleClass }[] = [
  { label: "Compact (Civic, Corolla)", value: "compact" },
  { label: "Midsize (Camry, Accord)", value: "midsize" },
  { label: "Full-size (Impala, Avalon)", value: "fullsize" },
  { label: "Truck (F-150, Silverado)", value: "truck" },
  { label: "SUV (RAV4, CR-V, Explorer)", value: "suv" },
  { label: "Luxury (BMW, Mercedes, Lexus)", value: "luxury" },
];

export const SEVERITY_LEVELS = [
  { label: "Minor — cosmetic only", value: "minor", multiplier: 0.5 },
  { label: "Moderate — functional impact", value: "moderate", multiplier: 1.0 },
  { label: "Severe — needs full replacement", value: "severe", multiplier: 1.5 },
];
