import type { VehicleClass } from "./damage-options";

interface LaborEntry {
  part_name: string;
  hours: Record<VehicleClass, [number, number]>;
  part_cost: Record<VehicleClass, [number, number]>;
  oem_multiplier: number;
  paint_hours: number;
}

const H = (c: [number,number], m: [number,number], f: [number,number], t: [number,number], s: [number,number], l: [number,number]): Record<VehicleClass,[number,number]> =>
  ({ compact:c, midsize:m, fullsize:f, truck:t, suv:s, luxury:l });

export const LABOR_TABLE: Record<string, LaborEntry> = {
  front_bumper_cracked:   { part_name:"Front Bumper Cover",        hours:H([1.5,2.5],[2,3],[2,3.5],[2,3],[2,3.5],[3,5]),       part_cost:H([80,150],[100,200],[120,250],[150,300],[130,280],[250,500]),   oem_multiplier:2.5, paint_hours:2 },
  front_bumper_dented:    { part_name:"Front Bumper Cover",        hours:H([1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,4]), part_cost:H([80,150],[100,200],[120,250],[150,300],[130,280],[250,500]),   oem_multiplier:2.5, paint_hours:2 },
  front_bumper_missing:   { part_name:"Front Bumper + Reinforcement", hours:H([2,3],[2.5,3.5],[2.5,4],[2.5,3.5],[2.5,4],[3.5,5.5]), part_cost:H([150,300],[200,400],[250,450],[250,500],[250,450],[400,800]), oem_multiplier:2.5, paint_hours:3 },
  front_bumper_scratched: { part_name:"Front Bumper (repair)",     hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2]), part_cost:H([0,30],[0,40],[0,40],[0,40],[0,40],[0,60]),                 oem_multiplier:1, paint_hours:1.5 },
  rear_bumper_cracked:    { part_name:"Rear Bumper Cover",         hours:H([1.5,2.5],[2,3],[2,3.5],[2,3],[2,3.5],[3,5]),       part_cost:H([70,140],[90,180],[100,220],[120,260],[110,250],[220,450]),    oem_multiplier:2.5, paint_hours:2 },
  rear_bumper_dented:     { part_name:"Rear Bumper Cover",         hours:H([1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,4]), part_cost:H([70,140],[90,180],[100,220],[120,260],[110,250],[220,450]),  oem_multiplier:2.5, paint_hours:2 },
  rear_bumper_missing:    { part_name:"Rear Bumper + Reinforcement", hours:H([2,3],[2.5,3.5],[2.5,4],[2.5,3.5],[2.5,4],[3.5,5.5]), part_cost:H([130,280],[180,360],[220,420],[220,450],[220,420],[380,750]), oem_multiplier:2.5, paint_hours:3 },
  rear_bumper_scratched:  { part_name:"Rear Bumper (repair)",      hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2]), part_cost:H([0,30],[0,40],[0,40],[0,40],[0,40],[0,60]),                oem_multiplier:1, paint_hours:1.5 },

  hood_dented:    { part_name:"Hood",                hours:H([2,3],[2.5,3.5],[2.5,4],[3,4.5],[3,4.5],[3.5,5.5]),   part_cost:H([150,300],[200,400],[250,500],[300,600],[280,550],[400,900]),   oem_multiplier:2.5, paint_hours:3 },
  hood_bent:      { part_name:"Hood (replacement)",  hours:H([2.5,4],[3,4.5],[3,5],[3.5,5],[3.5,5],[4,6]),         part_cost:H([200,400],[250,500],[300,600],[350,700],[320,650],[500,1100]),  oem_multiplier:2.5, paint_hours:3 },
  hood_scratched: { part_name:"Hood (repaint)",      hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2]), part_cost:H([0,30],[0,40],[0,40],[0,40],[0,40],[0,60]),                  oem_multiplier:1, paint_hours:2 },
  hood_missing:   { part_name:"Hood + Hinges + Latch", hours:H([3,4.5],[3.5,5],[3.5,5.5],[4,6],[4,6],[5,7]),       part_cost:H([250,500],[300,600],[350,700],[400,800],[380,750],[600,1300]),  oem_multiplier:2.5, paint_hours:3 },

  trunk_dented:    { part_name:"Trunk Lid",           hours:H([2,3],[2.5,3.5],[2.5,4],[3,4.5],[3,4.5],[3.5,5.5]),  part_cost:H([150,350],[200,450],[250,500],[300,600],[280,550],[400,900]),   oem_multiplier:2.5, paint_hours:3 },
  trunk_stuck:     { part_name:"Trunk Latch/Hinge",   hours:H([1,2],[1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,3]),    part_cost:H([30,80],[40,100],[50,120],[50,120],[50,120],[80,200]),          oem_multiplier:2, paint_hours:0 },
  trunk_scratched: { part_name:"Trunk Lid (repaint)", hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2]), part_cost:H([0,30],[0,40],[0,40],[0,40],[0,40],[0,60]),                 oem_multiplier:1, paint_hours:2 },
  trunk_missing:   { part_name:"Trunk Lid + Hardware", hours:H([3,4.5],[3.5,5],[3.5,5.5],[4,6],[4,6],[5,7]),       part_cost:H([250,500],[300,600],[350,700],[400,800],[380,750],[600,1300]),  oem_multiplier:2.5, paint_hours:3 },

  headlight_l_broken: { part_name:"Headlight Assy (L)", hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2.5]), part_cost:H([50,150],[60,200],[80,250],[80,250],[80,250],[200,800]),  oem_multiplier:3, paint_hours:0 },
  headlight_l_missing: { part_name:"Headlight Assy (L)", hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2.5]), part_cost:H([50,150],[60,200],[80,250],[80,250],[80,250],[200,800]), oem_multiplier:3, paint_hours:0 },
  headlight_l_foggy:  { part_name:"Headlight Restore (L)", hours:H([0.5,1],[0.5,1],[0.5,1],[0.5,1],[0.5,1],[0.5,1]),       part_cost:H([10,25],[10,25],[10,25],[10,25],[10,25],[10,25]),          oem_multiplier:1, paint_hours:0 },
  headlight_r_broken: { part_name:"Headlight Assy (R)", hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2.5]), part_cost:H([50,150],[60,200],[80,250],[80,250],[80,250],[200,800]),  oem_multiplier:3, paint_hours:0 },
  headlight_r_missing: { part_name:"Headlight Assy (R)", hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2.5]), part_cost:H([50,150],[60,200],[80,250],[80,250],[80,250],[200,800]), oem_multiplier:3, paint_hours:0 },
  headlight_r_foggy:  { part_name:"Headlight Restore (R)", hours:H([0.5,1],[0.5,1],[0.5,1],[0.5,1],[0.5,1],[0.5,1]),       part_cost:H([10,25],[10,25],[10,25],[10,25],[10,25],[10,25]),          oem_multiplier:1, paint_hours:0 },

  taillight_l_broken:  { part_name:"Taillight Assy (L)", hours:H([0.3,0.5],[0.3,0.5],[0.3,0.5],[0.3,0.5],[0.3,0.5],[0.5,1]), part_cost:H([30,80],[40,100],[50,120],[50,120],[50,120],[100,400]),  oem_multiplier:3, paint_hours:0 },
  taillight_l_missing: { part_name:"Taillight Assy (L)", hours:H([0.3,0.5],[0.3,0.5],[0.3,0.5],[0.3,0.5],[0.3,0.5],[0.5,1]), part_cost:H([30,80],[40,100],[50,120],[50,120],[50,120],[100,400]),  oem_multiplier:3, paint_hours:0 },
  taillight_r_broken:  { part_name:"Taillight Assy (R)", hours:H([0.3,0.5],[0.3,0.5],[0.3,0.5],[0.3,0.5],[0.3,0.5],[0.5,1]), part_cost:H([30,80],[40,100],[50,120],[50,120],[50,120],[100,400]),  oem_multiplier:3, paint_hours:0 },
  taillight_r_missing: { part_name:"Taillight Assy (R)", hours:H([0.3,0.5],[0.3,0.5],[0.3,0.5],[0.3,0.5],[0.3,0.5],[0.5,1]), part_cost:H([30,80],[40,100],[50,120],[50,120],[50,120],[100,400]),  oem_multiplier:3, paint_hours:0 },

  fender_l_dented:   { part_name:"Fender (L)",          hours:H([2,3],[2.5,3.5],[2.5,4],[3,4.5],[3,4.5],[3.5,5]),   part_cost:H([80,200],[100,250],[120,300],[150,350],[130,320],[250,600]),   oem_multiplier:2.5, paint_hours:2.5 },
  fender_l_rusted:   { part_name:"Fender (L) rust",     hours:H([3,5],[3.5,5.5],[3.5,6],[4,6],[4,6],[5,7]),         part_cost:H([80,200],[100,250],[120,300],[150,350],[130,320],[250,600]),   oem_multiplier:2.5, paint_hours:3 },
  fender_l_scratched:{ part_name:"Fender (L) repaint",  hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2]), part_cost:H([0,30],[0,40],[0,40],[0,40],[0,40],[0,60]),              oem_multiplier:1, paint_hours:2 },
  fender_l_missing:  { part_name:"Fender (L) + hardware", hours:H([2.5,4],[3,4.5],[3,5],[3.5,5],[3.5,5],[4,6]),     part_cost:H([100,250],[130,300],[150,350],[180,400],[160,380],[300,700]),   oem_multiplier:2.5, paint_hours:3 },
  fender_r_dented:   { part_name:"Fender (R)",          hours:H([2,3],[2.5,3.5],[2.5,4],[3,4.5],[3,4.5],[3.5,5]),   part_cost:H([80,200],[100,250],[120,300],[150,350],[130,320],[250,600]),   oem_multiplier:2.5, paint_hours:2.5 },
  fender_r_rusted:   { part_name:"Fender (R) rust",     hours:H([3,5],[3.5,5.5],[3.5,6],[4,6],[4,6],[5,7]),         part_cost:H([80,200],[100,250],[120,300],[150,350],[130,320],[250,600]),   oem_multiplier:2.5, paint_hours:3 },
  fender_r_scratched:{ part_name:"Fender (R) repaint",  hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2]), part_cost:H([0,30],[0,40],[0,40],[0,40],[0,40],[0,60]),              oem_multiplier:1, paint_hours:2 },
  fender_r_missing:  { part_name:"Fender (R) + hardware", hours:H([2.5,4],[3,4.5],[3,5],[3.5,5],[3.5,5],[4,6]),     part_cost:H([100,250],[130,300],[150,350],[180,400],[160,380],[300,700]),   oem_multiplier:2.5, paint_hours:3 },

  door_fl_dented:  { part_name:"Door (FL)",         hours:H([3,4.5],[3.5,5],[3.5,5.5],[4,6],[4,6],[5,7]),     part_cost:H([150,350],[200,450],[250,550],[300,650],[280,600],[450,1000]),  oem_multiplier:2.5, paint_hours:3 },
  door_fl_stuck:   { part_name:"Door (FL) hinge/latch", hours:H([1,2],[1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,3]), part_cost:H([40,100],[50,120],[60,140],[60,140],[60,140],[100,250]),     oem_multiplier:2, paint_hours:0 },
  door_fl_scratched:{ part_name:"Door (FL) repaint", hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2]), part_cost:H([0,30],[0,40],[0,40],[0,40],[0,40],[0,60]),              oem_multiplier:1, paint_hours:2.5 },
  door_fl_window:  { part_name:"Door Window (FL)",  hours:H([1,2],[1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,3]), part_cost:H([80,200],[100,250],[120,300],[120,300],[120,300],[200,500]),     oem_multiplier:2, paint_hours:0 },
  door_fr_dented:  { part_name:"Door (FR)",         hours:H([3,4.5],[3.5,5],[3.5,5.5],[4,6],[4,6],[5,7]),     part_cost:H([150,350],[200,450],[250,550],[300,650],[280,600],[450,1000]),  oem_multiplier:2.5, paint_hours:3 },
  door_fr_stuck:   { part_name:"Door (FR) hinge/latch", hours:H([1,2],[1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,3]), part_cost:H([40,100],[50,120],[60,140],[60,140],[60,140],[100,250]),     oem_multiplier:2, paint_hours:0 },
  door_fr_scratched:{ part_name:"Door (FR) repaint", hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2]), part_cost:H([0,30],[0,40],[0,40],[0,40],[0,40],[0,60]),              oem_multiplier:1, paint_hours:2.5 },
  door_fr_window:  { part_name:"Door Window (FR)",  hours:H([1,2],[1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,3]), part_cost:H([80,200],[100,250],[120,300],[120,300],[120,300],[200,500]),     oem_multiplier:2, paint_hours:0 },
  door_rl_dented:  { part_name:"Door (RL)",         hours:H([3,4.5],[3.5,5],[3.5,5.5],[4,6],[4,6],[5,7]),     part_cost:H([150,350],[200,450],[250,550],[300,650],[280,600],[450,1000]),  oem_multiplier:2.5, paint_hours:3 },
  door_rl_stuck:   { part_name:"Door (RL) hinge/latch", hours:H([1,2],[1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,3]), part_cost:H([40,100],[50,120],[60,140],[60,140],[60,140],[100,250]),     oem_multiplier:2, paint_hours:0 },
  door_rl_scratched:{ part_name:"Door (RL) repaint", hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2]), part_cost:H([0,30],[0,40],[0,40],[0,40],[0,40],[0,60]),              oem_multiplier:1, paint_hours:2.5 },
  door_rl_window:  { part_name:"Door Window (RL)",  hours:H([1,2],[1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,3]), part_cost:H([80,200],[100,250],[120,300],[120,300],[120,300],[200,500]),     oem_multiplier:2, paint_hours:0 },
  door_rr_dented:  { part_name:"Door (RR)",         hours:H([3,4.5],[3.5,5],[3.5,5.5],[4,6],[4,6],[5,7]),     part_cost:H([150,350],[200,450],[250,550],[300,650],[280,600],[450,1000]),  oem_multiplier:2.5, paint_hours:3 },
  door_rr_stuck:   { part_name:"Door (RR) hinge/latch", hours:H([1,2],[1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,3]), part_cost:H([40,100],[50,120],[60,140],[60,140],[60,140],[100,250]),     oem_multiplier:2, paint_hours:0 },
  door_rr_scratched:{ part_name:"Door (RR) repaint", hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2]), part_cost:H([0,30],[0,40],[0,40],[0,40],[0,40],[0,60]),              oem_multiplier:1, paint_hours:2.5 },
  door_rr_window:  { part_name:"Door Window (RR)",  hours:H([1,2],[1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,3]), part_cost:H([80,200],[100,250],[120,300],[120,300],[120,300],[200,500]),     oem_multiplier:2, paint_hours:0 },

  windshield_cracked:  { part_name:"Windshield",      hours:H([1,2],[1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,3]),   part_cost:H([150,300],[180,350],[200,400],[200,400],[200,400],[300,700]),  oem_multiplier:2, paint_hours:0 },
  windshield_chipped:  { part_name:"Windshield Repair", hours:H([0.5,1],[0.5,1],[0.5,1],[0.5,1],[0.5,1],[0.5,1]), part_cost:H([20,50],[20,50],[20,50],[20,50],[20,50],[20,50]),              oem_multiplier:1, paint_hours:0 },
  windshield_shattered:{ part_name:"Windshield",      hours:H([1,2],[1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,3]),   part_cost:H([150,300],[180,350],[200,400],[200,400],[200,400],[300,700]),  oem_multiplier:2, paint_hours:0 },
  rear_window_cracked: { part_name:"Rear Window",     hours:H([1,2],[1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,3]),   part_cost:H([100,250],[120,300],[150,350],[150,350],[150,350],[250,600]),  oem_multiplier:2, paint_hours:0 },
  rear_window_shattered:{ part_name:"Rear Window",    hours:H([1,2],[1,2],[1.5,2.5],[1.5,2.5],[1.5,2.5],[2,3]),   part_cost:H([100,250],[120,300],[150,350],[150,350],[150,350],[250,600]),  oem_multiplier:2, paint_hours:0 },

  mirror_l_broken: { part_name:"Side Mirror (L)", hours:H([0.5,1],[0.5,1],[0.5,1],[0.5,1],[0.5,1],[1,1.5]),   part_cost:H([30,80],[40,100],[50,120],[50,120],[50,120],[100,350]),        oem_multiplier:2.5, paint_hours:0.5 },
  mirror_l_missing:{ part_name:"Side Mirror (L)", hours:H([0.5,1],[0.5,1],[0.5,1],[0.5,1],[0.5,1],[1,1.5]),   part_cost:H([30,80],[40,100],[50,120],[50,120],[50,120],[100,350]),        oem_multiplier:2.5, paint_hours:0.5 },
  mirror_r_broken: { part_name:"Side Mirror (R)", hours:H([0.5,1],[0.5,1],[0.5,1],[0.5,1],[0.5,1],[1,1.5]),   part_cost:H([30,80],[40,100],[50,120],[50,120],[50,120],[100,350]),        oem_multiplier:2.5, paint_hours:0.5 },
  mirror_r_missing:{ part_name:"Side Mirror (R)", hours:H([0.5,1],[0.5,1],[0.5,1],[0.5,1],[0.5,1],[1,1.5]),   part_cost:H([30,80],[40,100],[50,120],[50,120],[50,120],[100,350]),        oem_multiplier:2.5, paint_hours:0.5 },

  roof_dented:   { part_name:"Roof Panel",         hours:H([4,6],[4.5,7],[5,8],[5,8],[5,8],[6,10]),           part_cost:H([200,500],[250,600],[300,700],[350,800],[320,750],[500,1200]),  oem_multiplier:2.5, paint_hours:4 },
  roof_crushed:  { part_name:"Roof Panel (replace)", hours:H([8,14],[9,15],[10,16],[10,16],[10,16],[12,20]),   part_cost:H([400,900],[500,1100],[600,1300],[700,1500],[650,1400],[1000,2500]), oem_multiplier:2.5, paint_hours:5 },
  roof_scratched:{ part_name:"Roof (repaint)",     hours:H([0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2]), part_cost:H([0,30],[0,40],[0,40],[0,40],[0,40],[0,60]),              oem_multiplier:1, paint_hours:3 },

  grille_broken: { part_name:"Grille",  hours:H([0.5,1],[0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2]),   part_cost:H([30,80],[40,100],[50,150],[60,180],[50,150],[100,400]),        oem_multiplier:3, paint_hours:0 },
  grille_missing:{ part_name:"Grille",  hours:H([0.5,1],[0.5,1],[0.5,1.5],[0.5,1.5],[0.5,1.5],[1,2]),   part_cost:H([30,80],[40,100],[50,150],[60,180],[50,150],[100,400]),        oem_multiplier:3, paint_hours:0 },

  radiator_leaking: { part_name:"Radiator",         hours:H([2,3],[2,3.5],[2.5,4],[2.5,4],[2.5,4],[3,5]),     part_cost:H([80,200],[100,250],[120,300],[130,320],[120,300],[200,500]),    oem_multiplier:2, paint_hours:0 },
  radiator_damaged: { part_name:"Radiator + Hoses",  hours:H([2.5,4],[3,4.5],[3,5],[3.5,5],[3.5,5],[4,6]),     part_cost:H([120,300],[150,350],[180,400],[200,450],[180,400],[300,700]),   oem_multiplier:2, paint_hours:0 },

  frame_bent:     { part_name:"Frame Straightening", hours:H([6,12],[7,14],[8,16],[8,16],[8,16],[10,20]),      part_cost:H([0,0],[0,0],[0,0],[0,0],[0,0],[0,0]),                          oem_multiplier:1, paint_hours:0 },
  frame_unibody:  { part_name:"Unibody Repair",      hours:H([8,16],[10,18],[10,20],[12,22],[12,22],[14,25]),  part_cost:H([0,0],[0,0],[0,0],[0,0],[0,0],[0,0]),                          oem_multiplier:1, paint_hours:0 },
  frame_subframe: { part_name:"Subframe Replacement", hours:H([6,10],[7,12],[8,14],[8,14],[8,14],[10,16]),     part_cost:H([200,500],[250,600],[300,700],[350,800],[320,750],[500,1200]),  oem_multiplier:2, paint_hours:0 },

  suspension_front:      { part_name:"Front Strut Assy",    hours:H([1.5,2.5],[2,3],[2,3.5],[2.5,3.5],[2.5,3.5],[3,4.5]), part_cost:H([80,200],[100,250],[120,300],[130,320],[120,300],[200,500]),  oem_multiplier:2, paint_hours:0 },
  suspension_rear:       { part_name:"Rear Shock Assy",     hours:H([1,2],[1.5,2.5],[1.5,3],[2,3],[2,3],[2.5,4]),         part_cost:H([60,150],[80,200],[100,250],[100,250],[100,250],[150,400]),  oem_multiplier:2, paint_hours:0 },
  suspension_control_arm:{ part_name:"Control Arm",         hours:H([1.5,3],[2,3.5],[2,4],[2.5,4],[2.5,4],[3,5]),         part_cost:H([50,150],[60,180],[80,220],[80,220],[80,220],[150,400]),    oem_multiplier:2, paint_hours:0 },

  wheel_bent:    { part_name:"Wheel/Rim",    hours:H([0.5,1],[0.5,1],[0.5,1],[0.5,1],[0.5,1],[0.5,1.5]),     part_cost:H([60,200],[80,250],[100,300],[100,350],[100,300],[200,800]),     oem_multiplier:2.5, paint_hours:0 },
  tire_damaged:  { part_name:"Tire",         hours:H([0.3,0.5],[0.3,0.5],[0.3,0.5],[0.3,0.5],[0.3,0.5],[0.3,0.5]), part_cost:H([60,150],[70,180],[80,200],[100,250],[90,220],[150,400]),  oem_multiplier:1, paint_hours:0 },
  wheel_missing: { part_name:"Wheel + Tire", hours:H([0.5,1],[0.5,1],[0.5,1],[0.5,1],[0.5,1],[0.5,1.5]),     part_cost:H([120,350],[150,430],[180,500],[200,600],[180,520],[350,1200]),  oem_multiplier:2.5, paint_hours:0 },

  engine_no_start: { part_name:"Engine Diagnostics + Repair", hours:H([2,8],[2,8],[2,10],[2,10],[2,10],[3,12]),  part_cost:H([100,2000],[100,2500],[100,3000],[100,3000],[100,3000],[200,5000]), oem_multiplier:2, paint_hours:0 },
  engine_overheat: { part_name:"Cooling System Repair",       hours:H([2,5],[2,5],[2.5,6],[2.5,6],[2.5,6],[3,7]), part_cost:H([80,500],[100,600],[120,700],[120,700],[120,700],[200,1200]),       oem_multiplier:2, paint_hours:0 },
  engine_oil_leak: { part_name:"Oil Leak Repair",             hours:H([1,4],[1,4],[1.5,5],[1.5,5],[1.5,5],[2,6]), part_cost:H([20,200],[30,250],[40,300],[40,300],[40,300],[60,500]),              oem_multiplier:1.5, paint_hours:0 },
  engine_trans:    { part_name:"Transmission Repair/Replace",  hours:H([6,14],[7,16],[8,18],[8,18],[8,18],[10,22]), part_cost:H([500,2500],[600,3000],[700,3500],[800,4000],[700,3500],[1000,6000]), oem_multiplier:1.5, paint_hours:0 },

  interior_airbags: { part_name:"Airbag Module(s)",   hours:H([2,4],[2,4],[2.5,5],[2.5,5],[2.5,5],[3,6]),       part_cost:H([200,600],[250,700],[300,800],[300,800],[300,800],[400,1200]),  oem_multiplier:2, paint_hours:0 },
  interior_dash:    { part_name:"Dashboard Repair",   hours:H([3,6],[3.5,7],[4,8],[4,8],[4,8],[5,10]),           part_cost:H([100,400],[120,500],[150,600],[150,600],[150,600],[250,1000]), oem_multiplier:2, paint_hours:0 },
  interior_seats:   { part_name:"Seat Repair/Replace", hours:H([1,3],[1,3],[1.5,3.5],[1.5,3.5],[1.5,3.5],[2,4]), part_cost:H([50,300],[60,400],[80,500],[80,500],[80,500],[150,1000]),      oem_multiplier:2, paint_hours:0 },
  interior_water:   { part_name:"Water Damage Cleanup", hours:H([4,10],[5,12],[5,14],[6,14],[6,14],[8,18]),       part_cost:H([100,500],[120,600],[150,700],[150,700],[150,700],[200,1000]), oem_multiplier:1, paint_hours:0 },
};

export const SHOP_RATES: Record<VehicleClass, [number, number]> = {
  compact: [75, 100],
  midsize: [80, 110],
  fullsize: [85, 115],
  truck: [85, 120],
  suv: [85, 120],
  luxury: [110, 175],
};

export const PAINT_RATE: Record<VehicleClass, [number, number]> = {
  compact: [40, 60],
  midsize: [45, 65],
  fullsize: [45, 70],
  truck: [50, 75],
  suv: [50, 75],
  luxury: [65, 100],
};
