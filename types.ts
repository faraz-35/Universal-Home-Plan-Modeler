export interface WallFeature {
  id: string;
  type: 'door' | 'window';
  wall: 'top' | 'bottom' | 'left' | 'right';
  position: number; // 0 to 1, percentage along the wall
  width: number; // in world units
}

export interface Room {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  color: string;
  zIndex: number;
  features: WallFeature[];
  locked?: boolean;
}

export interface Point {
  x: number;
  y: number;
}