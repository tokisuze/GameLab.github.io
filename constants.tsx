import React from 'react';
import { Room } from './types';

export const SCALE = 3; 
export const TILE_SIZE = 20;

// Colors
export const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF0000',
  yellow: '#FFFF00',
  hpGreen: '#00FF00',
  hpRed: '#FF0000',
  uiGray: '#808080'
};

export const INITIAL_STATS = {
  name: 'Фриск',
  lv: 1,
  hp: 20,
  maxHp: 20,
  exp: 0,
  gold: 0,
  items: ['Ирис. пирог']
};

export const SOUL_HEART_SVG = (
  <svg viewBox="0 0 16 16" width="100%" height="100%" shapeRendering="crispEdges">
    <path fill="#FF0000" d="M2,4 L2,9 L8,15 L14,9 L14,4 L11,1 L8,4 L5,1 L2,4 Z" />
  </svg>
);

// Rooms
// We assume the canvas is 640x480. 
// We will draw the floor path. The background will be the "Walls" (Purple).
export const ROOMS: Record<string, Room> = {
  'start': {
    id: 'start',
    name: 'Ruins - Entrance',
    width: 600,
    height: 400,
    floorPath: "M40,40 H560 V360 H40 Z M200,100 H400 V200 H200 Z", // Basic rect with hole for pillar
    walls: [
      { x: 0, y: 0, w: 600, h: 40 }, // Top
      { x: 0, y: 360, w: 600, h: 40 }, // Bottom
      { x: 0, y: 0, w: 40, h: 400 }, // Left
      { x: 560, y: 0, w: 40, h: 400 }, // Right
      { x: 200, y: 100, w: 200, h: 100 }, // Center pillar
    ],
    exits: [
      { x: 540, y: 160, w: 40, h: 80, targetRoomId: 'flowey_room', targetX: 60, targetY: 180 }
    ],
    interactables: [
      { x: 250, y: 210, w: 100, h: 40, text: ["* (Куча золотых цветов.)", "* (Они смягчили падение.)"], id: 'flowers', type: 'examine' }
    ],
    encounterRate: 0
  },
  'flowey_room': {
    id: 'flowey_room',
    name: 'Ruins - Flowey Spot',
    width: 600,
    height: 400,
    floorPath: "M0,120 H600 V280 H0 Z", // A simple horizontal corridor
    walls: [
      { x: 0, y: 0, w: 600, h: 120 },
      { x: 0, y: 280, w: 600, h: 120 },
    ],
    exits: [
       { x: 0, y: 120, w: 20, h: 160, targetRoomId: 'start', targetX: 500, targetY: 180 },
       { x: 580, y: 120, w: 20, h: 160, targetRoomId: 'ruins_entrance', targetX: 60, targetY: 180 }
    ],
    interactables: [],
    encounterRate: 0
  },
  'ruins_entrance': {
    id: 'ruins_entrance',
    name: 'Ruins - Purple Hall',
    width: 600,
    height: 400,
    // A corridor with an upper alcove for the sign
    floorPath: "M0,120 H600 V280 H0 Z M280,80 H320 V120 H280 Z",
    walls: [
      { x: 0, y: 0, w: 600, h: 120 },
      { x: 0, y: 280, w: 600, h: 120 },
    ],
    exits: [
      { x: 0, y: 120, w: 20, h: 160, targetRoomId: 'flowey_room', targetX: 540, targetY: 180 },
      { x: 580, y: 120, w: 20, h: 160, targetRoomId: 'ruins_switch', targetX: 60, targetY: 180 }
    ],
    interactables: [
      { x: 280, y: 180, w: 40, h: 40, id: 'save', type: 'examine' },
      { x: 290, y: 70, w: 60, h: 50, text: ["* (Только бесстрашные могут пройти.)"], id: 'sign', type: 'examine' }
    ],
    encounterRate: 0
  },
  'ruins_switch': {
    id: 'ruins_switch',
    name: 'Ruins - Switch Puzzle',
    width: 600,
    height: 400,
    // Two paths connected
    floorPath: "M0,120 H200 V80 H400 V120 H600 V280 H0 Z",
    walls: [
      { x: 0, y: 0, w: 600, h: 80 },
      { x: 0, y: 320, w: 600, h: 80 },
      { x: 200, y: 120, w: 200, h: 100 } // This is now a hole in the floor/divider
    ],
    conditionalWalls: [
      { flag: 'switch_1', wall: { x: 540, y: 160, w: 40, h: 80 } }
    ],
    exits: [
      { x: 0, y: 120, w: 20, h: 160, targetRoomId: 'ruins_entrance', targetX: 540, targetY: 180 },
      { x: 580, y: 120, w: 20, h: 160, targetRoomId: 'ruins_dummy', targetX: 60, targetY: 180 }
    ],
    interactables: [
       { x: 150, y: 60, w: 40, h: 40, id: 'switch_1', type: 'switch', text: ["* (Пожалуйста, нажмите этот переключатель.)"] },
       { x: 350, y: 60, w: 40, h: 40, id: 'switch_dummy', type: 'switch', text: ["* (Этот переключатель даже не работает.)"] },
       { x: 540, y: 160, w: 40, h: 80, id: 'spikes', type: 'examine', text: ["* (Шипы преграждают путь.)"] }
    ],
    encounterRate: 0
  },
  'ruins_dummy': {
    id: 'ruins_dummy',
    name: 'Ruins - Dummy',
    width: 600,
    height: 400,
    floorPath: "M0,120 H600 V280 H0 Z",
    walls: [
      { x: 0, y: 0, w: 600, h: 80 },
      { x: 0, y: 320, w: 600, h: 80 },
    ],
    exits: [
      { x: 0, y: 120, w: 20, h: 160, targetRoomId: 'ruins_switch', targetX: 540, targetY: 180 }
    ],
    interactables: [
       { x: 280, y: 150, w: 40, h: 60, id: 'dummy', type: 'dummy' }
    ],
    encounterRate: 0
  }
};

export const FLOWEY_ASSETS = {
  FRIENDLY: (
    <svg viewBox="0 0 100 100" className="w-24 h-24 mx-auto animate-bounce-subtle">
       <path fill="#FFFF00" d="M50,20 Q60,5 70,20 Q85,15 80,30 Q95,40 80,50 Q95,60 80,70 Q85,85 70,80 Q60,95 50,80 Q40,95 30,80 Q15,85 20,70 Q5,60 20,50 Q5,40 20,30 Q15,15 30,20 Q40,5 50,20 Z" />
       <circle cx="50" cy="50" r="20" fill="white" />
       <ellipse cx="43" cy="45" rx="3" ry="5" fill="black" />
       <ellipse cx="57" cy="45" rx="3" ry="5" fill="black" />
       <path fill="none" stroke="black" strokeWidth="2" d="M40,55 Q50,65 60,55" />
       <path fill="none" stroke="#00FF00" strokeWidth="4" d="M50,80 Q50,90 50,100" />
       <ellipse cx="35" cy="90" rx="10" ry="5" fill="#00FF00" transform="rotate(-20, 35, 90)" />
       <ellipse cx="65" cy="90" rx="10" ry="5" fill="#00FF00" transform="rotate(20, 65, 90)" />
    </svg>
  ),
  EVIL: (
    <svg viewBox="0 0 100 100" className="w-32 h-32 mx-auto shake">
       <path fill="#FFFF00" d="M50,20 Q60,5 70,20 Q85,15 80,30 Q95,40 80,50 Q95,60 80,70 Q85,85 70,80 Q60,95 50,80 Q40,95 30,80 Q15,85 20,70 Q5,60 20,50 Q5,40 20,30 Q15,15 30,20 Q40,5 50,20 Z" />
       <circle cx="50" cy="50" r="20" fill="#DDD" />
       <circle cx="43" cy="45" r="4" fill="black" />
       <circle cx="57" cy="45" r="4" fill="black" />
       <circle cx="43" cy="45" r="1" fill="white" />
       <circle cx="57" cy="45" r="1" fill="white" />
       <path fill="black" d="M35,60 Q50,75 65,60 Q65,65 50,80 Q35,65 35,60 Z" />
       <path fill="white" d="M38,62 L42,62 L40,68 Z" />
       <path fill="white" d="M44,65 L48,65 L46,71 Z" />
       <path fill="white" d="M52,65 L56,65 L54,71 Z" />
       <path fill="white" d="M58,62 L62,62 L60,68 Z" />
       <path fill="none" stroke="#00FF00" strokeWidth="4" d="M50,80 Q50,90 50,100" />
    </svg>
  )
};

export const MONSTER_ASSETS = {
  FROGGIT: (
    <svg viewBox="0 0 100 100" className="w-40 h-40 mx-auto animate-bounce-subtle">
      <path fill="white" d="M20,70 Q10,60 20,50 Q30,40 20,30 Q30,20 50,30 Q70,20 80,30 Q70,40 80,50 Q90,60 80,70 Q90,90 50,90 Q10,90 20,70 Z" />
      <circle cx="35" cy="45" r="5" fill="black" />
      <circle cx="65" cy="45" r="5" fill="black" />
      <path fill="none" stroke="black" strokeWidth="2" d="M45,60 Q50,65 55,60" />
      <rect x="20" y="80" width="10" height="10" fill="white" />
      <rect x="70" y="80" width="10" height="10" fill="white" />
    </svg>
  ),
  DUMMY: (
    <svg viewBox="0 0 100 100" className="w-40 h-40 mx-auto">
      <rect x="30" y="20" width="40" height="50" fill="white" rx="5" />
      <circle cx="40" cy="35" r="3" fill="black" />
      <circle cx="60" cy="35" r="3" fill="black" />
      <path fill="none" stroke="black" strokeWidth="2" d="M35,45 Q50,55 65,45" />
      <rect x="40" y="70" width="20" height="30" fill="#DDD" />
      <path fill="none" stroke="white" strokeWidth="2" d="M30,50 Q10,60 20,80" />
      <path fill="none" stroke="white" strokeWidth="2" d="M70,50 Q90,60 80,80" />
    </svg>
  )
};

export const FIGHT_TARGET_SVG = (
  <svg width="100%" height="100%" viewBox="0 0 570 140" preserveAspectRatio="none">
    <path 
      d="M 50 70 Q 285 -30 520 70 Q 285 170 50 70" 
      fill="none" 
      stroke="#555" 
      strokeWidth="6" 
    />
    <path 
      d="M 50 70 Q 285 -30 520 70 Q 285 170 50 70" 
      fill="none" 
      stroke="white" 
      strokeWidth="3" 
    />
  </svg>
);