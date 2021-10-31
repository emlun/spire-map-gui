export const roomTypes = [
  "fight",
  "elite",
  "super",
  "rest",
  "event",
  "store",
  "chest",
] as const;
export type RoomType = (typeof roomTypes)[number];
export type Path = number[];

export interface RoomDef {
  typ: RoomType,
  connections: number[],
}

export const floorNums = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;
export type FloorNum = (typeof floorNums)[number];

export type MapDef = {
  1: RoomDef[],
  2: RoomDef[],
  3: RoomDef[],
  4: RoomDef[],
  5: RoomDef[],
  6: RoomDef[],
  7: RoomDef[],
  8: RoomDef[],
  9: RoomDef[],
  10: RoomDef[],
  11: RoomDef[],
  12: RoomDef[],
  13: RoomDef[],
  14: RoomDef[],
  15: RoomDef[],
}
