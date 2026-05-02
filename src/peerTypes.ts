export type InputMsg  = { type: "input";  up: boolean; down: boolean };
export type ActionMsg = { type: "action"; action: "shoot" | "rotate" };

export type SlotMsg   = { iconId: string; color: string };
export type BuffMsg   = {
  key: string; label: string; iconId: string; color: string;
  player: "player1" | "player2"; startedAt: number; duration: number;
};
export type ItemMsg   = { id: string; x: number; y: number; r: number; color: string; iconId: string };
export type DecoyMsg  = { id: string; x: number; y: number; r: number };
export type NotifMsg  = { id: string; text: string; color: string; player: "player1" | "player2" };

/** Host → Guest: full game snapshot (positions normalised 0-1 of host viewport) */
export type StateMsg = {
  type: "state";
  bx: number; by: number; br: number; bg: boolean;      // ball left/top (frac of vw/vh), radius (frac of vh), ghost
  p1y: number; p2y: number; p1h: number; p2h: number;   // paddle top/height (fracs)
  pw: number;                                             // paddle width px (for shield offset)
  score: [number, number];
  winner: "player1" | "player2" | null;
  current1: SlotMsg | null; current2: SlotMsg | null;
  next1:    SlotMsg | null; next2:    SlotMsg | null;
  items:  ItemMsg[];
  buffs:  BuffMsg[];
  decoys: DecoyMsg[];
  notifs: NotifMsg[];
  s1: boolean; s2: boolean;   // shieldActive
  f1: boolean; f2: boolean;   // frozen
};

export type PeerMsg = InputMsg | ActionMsg | StateMsg;
