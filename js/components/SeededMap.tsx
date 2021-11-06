import React, { useCallback, useRef, useState } from 'react';
import _ from 'underscore';

import { Coordinate, FloorNum, MapDef, Path, RoomDef, RoomType, floorNums, roomTypes } from 'types/map';

import ConnectionCanvas from 'components/ConnectionCanvas';
import RoomButton from 'components/RoomButton';

import styles from './SeededMap.module.css';


interface Props {
  highlightPaths?: Path[],
  map: MapDef,
  startCoordinate?: Coordinate,
  setRoomType: (f: FloorNum, ri: number, typ: RoomType) => void,
  setStartCoordinate: (update: (value: Coordinate | undefined) => (Coordinate | undefined)) => void,
}

export default function SeededMap({
  highlightPaths,
  map,
  startCoordinate,
  setRoomType,
  setStartCoordinate,
}: Props) {
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
            return <div key={`room-${ri}`} className={ styles['room'] }>
              <RoomButton
                room={ room }
                isSelected={ _.isEqual(startCoordinate, [f, ri]) }
                onClick={ () => setStartCoordinate(startCoordinate => {
                  const coord: Coordinate = [f, ri];
                  return _(coord).isEqual(startCoordinate) ? undefined : coord;
                }) }
              />

              <div className={ styles["width-suppressor"] }>
                { room.typ === "elite" &&
                  <button type="button"
                    className={ styles["toggle-super"] }
                    title="Make super-elite"
                    onClick={ () => setRoomType(f, ri, "super") }
                  >
                    S
                  </button>
                }
                { room.typ === "super" &&
                  <button type="button"
                    className={ styles["toggle-super"] + ' ' + styles["is-super"] }
                    title="Make normal elite"
                    onClick={ () => setRoomType(f, ri, "elite") }
                  >
                    S
                  </button>
                }
              </div>
            </div>;
          })}
        </div>
      </React.Fragment>
    )}

  </div>;
}
