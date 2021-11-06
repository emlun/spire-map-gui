import React, { useCallback, useRef, useState } from 'react';
import _ from 'underscore';

import { Coordinate, FloorNum, MapDef, Path, RoomDef, RoomType, floorNums, roomTypes } from 'types/map';

import ConnectionCanvas from 'components/ConnectionCanvas';
import RoomButton from 'components/RoomButton';

import styles from './MapEditor.module.css';


export const initialMap: MapDef = {
  1: [{ typ: "fight", connections: [0, 1] }, { typ: "fight", connections: [1, 2] }],
  2: [{ typ: "elite", connections: [0] }, { typ: "event", connections: [0] }, { typ: "shop", connections: [0] }],
  3: [{ typ: "fight", connections: [0] }],
  4: [{ typ: "fight", connections: [0] }],
  5: [{ typ: "fight", connections: [0] }],
  6: [{ typ: "fight", connections: [0] }],
  7: [{ typ: "fight", connections: [0] }],
  8: [{ typ: "fight", connections: [0, 1] }],
  9: [{ typ: "treasure", connections: [0] }, { typ: "treasure", connections: [0] }],
  10: [{ typ: "fight", connections: [0] }],
  11: [{ typ: "fight", connections: [0] }],
  12: [{ typ: "fight", connections: [0] }],
  13: [{ typ: "fight", connections: [0] }],
  14: [{ typ: "fight", connections: [0] }],
  15: [{ typ: "rest", connections: [] }],
}


interface Props {
  highlightPaths?: Path[],
  map: MapDef,
  startCoordinate?: Coordinate,
  setMap: (map: MapDef | ((map: MapDef) => MapDef)) => void,
  setStartCoordinate: (update: (value: Coordinate | undefined) => (Coordinate | undefined)) => void,
}


function MapEditor({
  highlightPaths,
  map,
  startCoordinate,
  setMap,
  setStartCoordinate,
}: Props) {
  const [selectedRoom, setSelectedRoom] = useState<[FloorNum, number] | null>(null);

  const addRoom = (f: FloorNum) => {
    setMap(map => {
      const thisFloor = [
        ...map[f],
        {
          typ: f == 9 ? "treasure" : "fight",
          connections: f === 14 ? [0] : [],
        }
      ];
      if (f > 1) {
        const fprev = f - 1 as FloorNum;
        return {
          ...map,
          [f]: thisFloor,
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
      const thisFloor = _(map[f]).initial();
      if (f > 1) {
        const fprev = f - 1 as FloorNum;
        return {
          ...map,
          [f]: thisFloor,
          [fprev]: map[fprev].map((room, ri) => {
            const connections = _(room.connections).filter(ri => ri < thisFloor.length);
            if (connections.length == 0) {
              return {
                ...room,
                connections: [thisFloor.length - 1],
              };
            } else {
              return {
                ...room,
                connections,
              };
            }
          }),
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

  return <div className={ styles['map'] }>

    { floorNums.map((f: FloorNum) =>
      <React.Fragment key={`floor-${f}`}>
        { f < 15 &&
          <ConnectionCanvas
            floor={ f }
            highlightPaths={ highlightPaths }
            roomsAbove={ map[f + 1 as FloorNum] }
            roomsBelow={ map[f] }
          />
        }

        <div className={ styles['floor'] }>
          <span className={ styles["floor-num"] }>{ f }</span>

          { map[f].map((room, ri) => {
            const isSelected = _.isEqual(selectedRoom, [f, ri]);
            const isNeighborOfSelected = (selectedRoom && (
              (f > 0 && selectedRoom[0] === (f - 1))
              || (f < 15 && selectedRoom && selectedRoom[0] === (f + 1))
            ));

            return <div key={`room-${ri}`} className={ styles['room'] }>
              { f < 15 &&
              <button type="button"
                className={
                  styles["connect-button"] + ' ' + (_(startCoordinate).isEqual([f, ri]) ? styles["floor-num-selected"] : '')
                }
                onClick={ () => setStartCoordinate(startCoordinate => {
                  const coord: Coordinate = [f, ri];
                  return _(coord).isEqual(startCoordinate) ? undefined : coord;
                }) }
                title="Start from here"
              >
                ^
              </button>
              }

              <RoomButton
                room={ room }
                onClick={ f === 15 || f === 1 ? undefined : () => cycleRoomType(f, ri) }
              />

              { f < 15 &&
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
                  title="Edit connections"
                >
                  o
                </button>
              }
            </div>;
          })}

          <button type="button"
            className={ styles["add-drop-floor"] }
            onClick={ () => dropRoom(f) }
            disabled={ f === 15 }
          >
            -
          </button>
          <button type="button"
            className={ styles["add-drop-floor"] }
            onClick={ () => addRoom(f) }
            disabled={ f === 15 || map[f].length >= 8 }
          >
            +
          </button>
        </div>
      </React.Fragment>
    )}

  </div>;
}

export default MapEditor;
