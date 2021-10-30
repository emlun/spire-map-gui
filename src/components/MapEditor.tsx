import React, { useCallback, useRef, useState } from 'react';
import _ from 'underscore';

import { FloorNum, MapDef, floorNums, roomTypes } from 'types/map';

import styles from './MapEditor.module.css';


export const initialMap: MapDef = {
  1: [{ typ: "fight", connections: [0, 1] }, { typ: "fight", connections: [1, 2] }],
  2: [{ typ: "fight", connections: [0] }, { typ: "event", connections: [0] }, { typ: "store", connections: [0] }],
  3: [{ typ: "fight", connections: [0] }],
  4: [{ typ: "fight", connections: [0] }],
  5: [{ typ: "fight", connections: [0] }],
  6: [{ typ: "fight", connections: [0] }],
  7: [{ typ: "fight", connections: [0] }],
  8: [{ typ: "fight", connections: [0] }],
  9: [{ typ: "chest", connections: [0] }],
  10: [{ typ: "fight", connections: [0] }],
  11: [{ typ: "fight", connections: [0] }],
  12: [{ typ: "fight", connections: [0] }],
  13: [{ typ: "fight", connections: [0] }],
  14: [{ typ: "fight", connections: [0] }],
  15: [{ typ: "rest", connections: [] }],
}


interface Props {
  map: MapDef,
  setMap: (map: MapDef | ((map: MapDef) => MapDef)) => void,
}

function MapEditor({ map, setMap }: Props) {

  const [selectedRoom, setSelectedRoom] = useState<[FloorNum, number] | null>(null);
  const canvasRefs = {
    1: useRef<HTMLCanvasElement>(),
    2: useRef<HTMLCanvasElement>(),
    3: useRef<HTMLCanvasElement>(),
    4: useRef<HTMLCanvasElement>(),
    5: useRef<HTMLCanvasElement>(),
    6: useRef<HTMLCanvasElement>(),
    7: useRef<HTMLCanvasElement>(),
    8: useRef<HTMLCanvasElement>(),
    9: useRef<HTMLCanvasElement>(),
    10: useRef<HTMLCanvasElement>(),
    11: useRef<HTMLCanvasElement>(),
    12: useRef<HTMLCanvasElement>(),
    13: useRef<HTMLCanvasElement>(),
    14: useRef<HTMLCanvasElement>(),
    15: useRef<HTMLCanvasElement>(),
  };
  const canvasRefCallbacks = {
    1: useCallback((node: HTMLCanvasElement) => { canvasRefs[1].current = node; drawConnections(); }, []),
    2: useCallback((node: HTMLCanvasElement) => { canvasRefs[2].current = node; drawConnections(); }, []),
    3: useCallback((node: HTMLCanvasElement) => { canvasRefs[3].current = node; drawConnections(); }, []),
    4: useCallback((node: HTMLCanvasElement) => { canvasRefs[4].current = node; drawConnections(); }, []),
    5: useCallback((node: HTMLCanvasElement) => { canvasRefs[5].current = node; drawConnections(); }, []),
    6: useCallback((node: HTMLCanvasElement) => { canvasRefs[6].current = node; drawConnections(); }, []),
    7: useCallback((node: HTMLCanvasElement) => { canvasRefs[7].current = node; drawConnections(); }, []),
    8: useCallback((node: HTMLCanvasElement) => { canvasRefs[8].current = node; drawConnections(); }, []),
    9: useCallback((node: HTMLCanvasElement) => { canvasRefs[9].current = node; drawConnections(); }, []),
    10: useCallback((node: HTMLCanvasElement) => { canvasRefs[10].current = node; drawConnections(); }, []),
    11: useCallback((node: HTMLCanvasElement) => { canvasRefs[11].current = node; drawConnections(); }, []),
    12: useCallback((node: HTMLCanvasElement) => { canvasRefs[12].current = node; drawConnections(); }, []),
    13: useCallback((node: HTMLCanvasElement) => { canvasRefs[13].current = node; drawConnections(); }, []),
    14: useCallback((node: HTMLCanvasElement) => { canvasRefs[14].current = node; drawConnections(); }, []),
    15: useCallback((node: HTMLCanvasElement) => { canvasRefs[15].current = node; drawConnections(); }, []),
  }

  const addRoom = (f: FloorNum) => {
    setMap(map => {
      const thisFloor = [
        ...map[f],
        {
          typ: "fight",
          connections:
            (f < 15 && map[f + 1 as FloorNum].length > 0)
            ? [map[f + 1 as FloorNum].length - 1]
            : [],
        }
      ];
      if (f > 1) {
        const fprev = f - 1 as FloorNum;
        return {
          ...map,
          [f]: thisFloor,
          [fprev]: map[fprev].map((room, ri) => {
            if (ri === map[fprev].length - 1) {
              return {
                ...room,
                connections: [
                  ...room.connections,
                  thisFloor.length - 1,
                ],
              };
            } else {
              return room;
            }
          }),
        };
      } else {
        return {
          ...map,
          [f]: thisFloor,
        };
      }
    });
  };

  const dropRoom = (f: FloorNum) => {
    setMap(map => {
      const thisFloor = map[f].filter((room, ri) => ri < map[f].length - 1);
      if (f > 1) {
        const fprev = f - 1 as FloorNum;
        return {
          ...map,
          [f]: thisFloor,
          [fprev]: map[fprev].map((room, ri) => ({
            ...room,
            connections: _(room.connections).filter(ri => ri < thisFloor.length),
          })),
        }
      } else {
        return {
          ...map,
          [f]: thisFloor,
        };
      }
    });
  };

  const cycleRoomType = (f: FloorNum, ri: number) => {
    const currentRoomTypeIdx = roomTypes.indexOf(map[f][ri].typ);
    const nextRoomType = roomTypes[(currentRoomTypeIdx + 1) % roomTypes.length];
    setMap(map => ({
      ...map,
      [f]: map[f].map((room, rii) => {
        if (rii === ri) {
          return { ...room, typ: nextRoomType };
        } else {
          return room;
        }
      }),
    }));
  };

  const toggleConnection = ([f1, ri1]: [FloorNum, number], f2: FloorNum, ri2: number) => {
    const lof = f1 < f2 ? f1 : f2;
    const hif = f1 < f2 ? f2 : f1;
    const lori = f1 < f2 ? ri1 : ri2;
    const hiri = f1 < f2 ? ri2 : ri1;
    setMap(map => ({
      ...map,
      [lof]: map[lof].map((room, ri) => {
        if (ri === lori) {
          if (_(room.connections).contains(hiri)) {
            return { ...room, connections: _(room.connections).without(hiri) };
          } else {
            return { ...room, connections: [...room.connections, hiri] };
          }
        } else {
          return room;
        }
      }),
    }));
  };

  const drawConnections = () => {
    floorNums.forEach(f => {
      const canvas = canvasRefs[f].current;
      if (canvas) {
        canvas.height = canvas.scrollHeight;
        canvas.width = canvas.scrollWidth;

        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const floor = map[f];

        floor.forEach((room, ri) => {
          const roomX = (ri * 2 + 1) / (floor.length * 2) * canvas.width;
          room.connections.forEach((connection) => {
            const nextFloorRi = connection - 1;
            const nextRoomX = (nextFloorRi * 2 + 3) / (map[f + 1 as FloorNum].length * 2) * canvas.width;
            ctx.beginPath();
            ctx.strokeStyle = 'black';
            ctx.moveTo(nextRoomX, 0);
            ctx.lineTo(roomX, canvas.height);
            ctx.stroke();
          });
        });
      }
    });
  };

  drawConnections();

  return <div className={ styles['map'] }>

    { floorNums.map(f =>
      <React.Fragment key={`floor-${f}`}>
        { f < 15 &&
          <canvas ref={ canvasRefCallbacks[f] } className={ styles['connection-canvas'] } /> }

        <div className={ styles['floor'] }>
          <span className={ styles["floor-num"] }>{ f }</span>

          { map[f].map((room, ri) => {
            const isSelected = _.isEqual(selectedRoom, [f, ri]);
            const isNeighborOfSelected = (selectedRoom && (
              (f > 0 && selectedRoom[0] === (f - 1))
              || (f < 15 && selectedRoom && selectedRoom[0] === (f + 1))
            ));

            return <div key={`room-${ri}`} className={ styles['room'] }>
              <button type="button"
                className={ styles["room-button"] }
                onClick={ () => cycleRoomType(f, ri) }
              >
                { room.typ }
              </button>

              <button type="button"
                className={
                  styles["connect-button"]
                    + " " + (isSelected ? styles["room-selected"] : "")
                    + " " + (isNeighborOfSelected ? styles["room-selected-neighbor"] : "")
                }
                onClick={ () => {
                  if (!selectedRoom) {
                    setSelectedRoom([f, ri]);
                  } else if (isSelected) {
                    setSelectedRoom(null);
                  } else if (isNeighborOfSelected) {
                    toggleConnection(selectedRoom, f, ri);
                  } else {
                    setSelectedRoom([f, ri]);
                  }
                }}
              >
                o
              </button>
            </div>;
          })}

          <button type="button"
            className={ styles["add-drop-floor"] }
            onClick={ () => dropRoom(f) }
          >
            -
          </button>
          <button type="button"
            className={ styles["add-drop-floor"] }
            onClick={ () => addRoom(f) }
          >
            +
          </button>
        </div>
      </React.Fragment>
    )}

  </div>;
}

export default MapEditor;
