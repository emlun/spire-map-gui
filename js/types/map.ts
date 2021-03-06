export const roomTypes = [
  "enemy",
  "elite",
  "super",
  "rest",
  "event",
  "shop",
  "treasure",
] as const;
export type RoomType = (typeof roomTypes)[number];

export interface RoomDef {
  typ: RoomType,
  connections: number[],
}

export const floorNums = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;
export type FloorNum = (typeof floorNums)[number];

export type Coordinate = [FloorNum, number];
export type Path = { [f in FloorNum]?: number };

export type MapDef = {
  [f in FloorNum]: RoomDef[];
}
