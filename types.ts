export enum GameMode {
  OVERWORLD = 'OVERWORLD',
  BATTLE = 'BATTLE',
  GAME_OVER = 'GAME_OVER',
  START_SCREEN = 'START_SCREEN',
  FLOWEY_CUTSCENE = 'FLOWEY_CUTSCENE'
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface Position {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Room {
  id: string;
  name: string;
  width: number;
  height: number;
  // Visual representation of the walkable floor (SVG Path d)
  floorPath: string; 
  // Collision walls are still rects for simplicity, or we can invert logic to check if point in poly
  walls: Rect[];
  conditionalWalls?: { flag: string; wall: Rect }[]; 
  exits: { x: number; y: number; w: number; h: number; targetRoomId: string; targetX: number; targetY: number }[];
  interactables: { x: number; y: number; w: number; h: number; text?: string[]; id: string; type?: 'examine' | 'switch' | 'dummy' }[];
  encounterRate: number; // 0 to 1
}

export interface PlayerStats {
  name: string;
  lv: number;
  hp: number;
  maxHp: number;
  exp: number;
  gold: number;
  items: string[];
}

export enum BattleState {
  MENU = 'MENU',      // Selecting FIGHT, ACT, ITEM, MERCY
  TARGET = 'TARGET',  // The sliding bar minigame
  RESULT = 'RESULT',  // Slash animation and damage number
  ACTION = 'ACTION',  // Dialogue describing what happened
  DEFEND = 'DEFEND',  // Bullet hell phase
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT'
}