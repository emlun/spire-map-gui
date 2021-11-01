import React, { useCallback, useEffect, useState } from 'react';
import pako from 'pako';
import base64 from 'base64-js';
import _ from 'underscore';

import { Coordinate, FloorNum, MapDef, Path, RoomType, floorNums, roomTypes } from 'types/map';
import FloatInput from 'components/FloatInput';
import GithubCorner from 'components/GithubCorner';
import MapEditor, { initialMap } from 'components/MapEditor';

import styles from './App.module.module.css';


function base64urlEncode(b: Uint8Array): string {
  return base64.fromByteArray(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(s: string): Uint8Array {
  return base64.toByteArray(s.replace(/=/g, '+').replace(/_/g, '/') + '===='.substring(0, (4 - (s.length % 4)) % 4));
}

function computeTreeRef() {
  if (VERSION.includes('-g')) {
    const [, commit] = VERSION.split('-g');
    return commit;
  } else {
    return VERSION;
  }
}

function* findAllPaths(map: MapDef, startCoordinates: Coordinate[]): Generator<Path> {
  for (const [startFloor, startRoom] of startCoordinates) {
    const numFloors = _(map).size() - startFloor + 1;
    let floorStack: number[] = [startRoom];
    if (map[startFloor].length > 0) {
      while (true) {
        if (floorStack.length === 0) {
          break;
        }

        let moveToSibling = false;
        if (floorStack.length === numFloors) {
          yield floorStack.reduce((path, ri, f0) => ({ ...path, [f0 + startFloor]: ri }), {});
          moveToSibling = true;
        } else {
          const connections = map[startFloor - 1 + floorStack.length as FloorNum][floorStack[floorStack.length - 1]].connections;
          if (connections.length > 0) {
            floorStack = [...floorStack, connections[0]];
          } else {
            moveToSibling = true;
          }
        }

        if (moveToSibling) {
          while (floorStack.length > 1) {
            const secondLastRoom = map[startFloor - 1 + floorStack.length - 1 as FloorNum][floorStack[floorStack.length - 2]];
            const currentIndex = secondLastRoom.connections.indexOf(floorStack[floorStack.length - 1]);
            const nextRoom = secondLastRoom.connections[currentIndex + 1];
            if (nextRoom) {
              floorStack = floorStack.map((ri, i) => i === floorStack.length - 1 ? nextRoom : ri);
              break;
            } else {
              floorStack = floorStack.filter((_, i) => i < floorStack.length - 1);
            }
          }

          if (floorStack.length === 1) {
            break;
          }
        }
      }
    }
  }
}

function findMostOfTypes(roomTypes: RoomType[], map: MapDef, startCoordinates: Coordinate[]): [number, Path[]] {
  let maxn = 0;
  let maxPaths: Path[] = [];
  for (const path of findAllPaths(map, startCoordinates)) {
    const n = floorNums
      .filter((f) => {
        const ri = path[f];
        if (ri === undefined) {
          return false;
        } else {
          return _(roomTypes).contains(map[f][ri].typ);
        }
      }).length;
    if (n > maxn) {
      maxn = n;
      maxPaths = [path];
    } else if (n == maxn) {
      maxPaths.push(path)
    }
  }

  return [maxn, maxPaths];
}

function rankPaths(
  valueFunc: (rt: RoomType, f: FloorNum, gold: number, fightsBefore: number) => number,
  map: MapDef,
  gold: number,
  numPaths: number,
  startCoordinates: Coordinate[],
): [string, Path[]][] {
  let paths: { [value: string]: Path[] } = {};
  for (const path of findAllPaths(map, startCoordinates)) {
    const [value, ] = floorNums.reduce(
      ([v, fightsBefore], f) => {
        const ri = path[f];
        if (ri === undefined) {
          return [v, fightsBefore];
        } else {
          return [
            v + valueFunc(map[f][ri]?.typ, f, gold, fightsBefore),
            fightsBefore + (map[f][ri]?.typ === "fight" ? 1 : 0),
          ];
        }
      },
      [0, 0],
    );
    const valueStr = value.toFixed(2);
    const entry = paths[valueStr] || [];
    paths[valueStr] = [...entry, path];
  }
  return _(paths).chain().pairs().sortBy(([v, _]) => -parseFloat(v)).take(numPaths).value();
}

function PathsCounter({
  label,
  map,
  selected,
  startCoordinates,
  types,
  onHighlight,
}: {
  label?: React.ReactNode,
  map: MapDef,
  selected?: RoomType[],
  startCoordinates: Coordinate[],
  types: RoomType[],
  onHighlight?: (types: RoomType[] | undefined) => void,
}) {
  const [num, paths] = findMostOfTypes(types, map, startCoordinates);
  const isSelected = _.isEqual(selected, types);
  return <p>
    { label }
    { ': ' }
    { num }
    { onHighlight && !isSelected &&
      <button type="button"
        className={ styles["highlight-paths-button"] }
        onClick={ () => onHighlight(types) }
      >
        Show
      </button>
    }
    { onHighlight && isSelected &&
      <button type="button"
        className={ styles["highlight-paths-button"] + ' ' + styles["highlight-paths-button-selected"] }
        onClick={ () => onHighlight(undefined) }
      >
        Stop showing
      </button>
    }
    { ` ${paths.length} paths` }
  </p>;
}

function PathRanking({
  gold,
  highlightedPaths,
  isTrackingMostValuable,
  label,
  map,
  onHighlight,
  startCoordinates,
  valueFunc,
  setTrackMostValuable,
}: {
  gold: number,
  highlightedPaths?: Path[],
  isTrackingMostValuable: boolean,
  label?: React.ReactNode,
  map: MapDef,
  onHighlight?: (path: Path[] | undefined) => void,
  setTrackMostValuable: (value: boolean) => void,
  startCoordinates: Coordinate[],
  valueFunc: (rt: RoomType, f: FloorNum, gold: number, fightsBefore: number) => number,
}) {
  const ranking = rankPaths(valueFunc, map, gold, 15, startCoordinates);
  return <div className={ styles["path-ranking"] }>
    { label }
    { ':' }
    { setTrackMostValuable &&
      <button type="button"
        className={
          styles["highlight-paths-button"]
            + ' ' + (isTrackingMostValuable ? styles["highlight-paths-button-selected"] : '')
        }
        onClick={ () => setTrackMostValuable(!isTrackingMostValuable) }
      >
        { isTrackingMostValuable ? "Stop tracking" : "Track" }
      </button>
    }

    <ol>
      { _(ranking).map(([value, paths], i) => {
        const isSelected = _(highlightedPaths).isEqual(paths);
        return <li key={ i }>
          { `${value}: ` }
          { onHighlight && !isSelected &&
            <button type="button"
              className={ styles["highlight-paths-button"] }
              onClick={ () => onHighlight(paths) }
            >
              Show
            </button>
          }
          { onHighlight && isSelected &&
            <button type="button"
              className={ styles["highlight-paths-button"] + ' ' + styles["highlight-paths-button-selected"] }
              onClick={ () => onHighlight(undefined) }
            >
              Stop showing
            </button>
          }
          { ` ${paths.length} paths` }
        </li>;
      })}
    </ol>
  </div>;
}

function useLocalStorage<T>(key: string, initialValue: T) {
  if (window.localStorage) {
    const [value, setValue] = useState(
      JSON.parse(window.localStorage.getItem(key) || JSON.stringify(initialValue))
    );
    useEffect(
      () => window.localStorage.setItem(key, JSON.stringify(value)),
      [value],
    );
    return [value, setValue];
  } else {
    return useState(initialValue);
  }
}

function App() {
  const [map, setMap] = useState<MapDef>(initialMap);
  const [customCountTypesSelection, setCustomCountTypesSelection] = useState<{ [rt in RoomType]?: boolean }>({
    "elite": true,
    "rest": true,
    "super": true,
  });
  const [highlightedPaths, setHighlightedPaths] = useState<Path[]>();
  const [highlightPathTypes, setHighlightPathTypes] = useState<RoomType[]>();
  const [isHighlightCustom, setIsHighlightCustom] = useState(false);

  const [eliteValue, setEliteValue] = useLocalStorage('eliteValue', 1.2);
  const [eventValue, setEventValue] = useLocalStorage('eventValue', 0.8);
  const [easyFightValue, setEasyFightValue] = useLocalStorage("easyFightValue", 1);
  const [hardFightValue, setHardFightValue] = useLocalStorage("hardFightValue", 0.9);
  const [restValue, setRestValue] = useLocalStorage("restValue", 1.2);
  const [shopValue, setShopValue] = useLocalStorage("shopValue", 0.3);
  const [shopGoldValue, setShopGoldValue] = useLocalStorage("shopGoldValue", 0.4);
  const [superValue, setSuperValue] = useLocalStorage("superValue", 1.3);
  const [treasureValue, setTreasureValue] = useLocalStorage("treasureValue", 0.8);
  const [gold, setGold] = useLocalStorage("gold", 99);
  const [fightEvents, setFightEvents] = useLocalStorage("fightEvents", 0);

  const [trackMostValuable, setTrackMostValuable] = useState(false);
  const [startCoordinate, setStartCoordinate] = useState<Coordinate>();
  const startCoordinates = startCoordinate ? [startCoordinate] : map[1].map((_, ri) => [1, ri] as Coordinate);

  const customCountTypes = _(customCountTypesSelection).chain().pick(b => b || false).keys().value() as RoomType[];

  const mapString = JSON.stringify(map);

  let numPaths = 0;
  for (const path of findAllPaths(map, startCoordinates)) {
    numPaths += 1;
  }

  const setHighlightTypes = (types: RoomType[] | undefined) => {
    setHighlightPathTypes(types);
    if (!types) {
      setHighlightedPaths(undefined);
    }
  };

  const setHighlightRanked = (paths: Path[] | undefined) => {
    setHighlightPathTypes(undefined);
    setHighlightedPaths(paths);
  };

  useEffect(
    () => {
      if (highlightPathTypes) {
        setHighlightedPaths(findMostOfTypes(highlightPathTypes, map, startCoordinates)[1]);
      }
    },
    [highlightPathTypes, startCoordinate]
  );

  useEffect(
    () => {
      if (highlightPathTypes) {
        setTrackMostValuable(false);
      }
    },
    [highlightPathTypes],
  );

  useEffect(
    () => {
      if (trackMostValuable) {
        setHighlightPathTypes(undefined);
        const ranking = rankPaths(valuateRoom, map, gold, 1, startCoordinates);
        if (ranking.length > 0) {
          setHighlightedPaths(ranking[0][1]);
        }
      }
    },
    [
      easyFightValue,
      eliteValue,
      eventValue,
      fightEvents,
      gold,
      hardFightValue,
      map,
      restValue,
      shopGoldValue,
      shopValue,
      startCoordinate,
      superValue,
      trackMostValuable,
      treasureValue,
    ],
  );

  const setCustomCountTypes = (rt: RoomType, selected: boolean) => {
    setCustomCountTypesSelection(sel => ({
      ...sel,
      [rt]: selected,
    }));
  };

  const valuateRoom = (rt: RoomType, f: FloorNum, gold: number, fightsBefore: number) => {
    switch (rt) {
      case "elite":
        return eliteValue;

      case "event":
        return eventValue;

      case "fight":
        if (fightEvents + fightsBefore <= 2) {
          return easyFightValue;
        } else {
          return hardFightValue;
        }

      case "rest":
        return restValue;

      case "shop":
        return shopValue + shopGoldValue * gold / 100;

      case "super":
        return superValue;

      case "treasure":
        return treasureValue;
    }

    return 0;
  };

  useEffect(
    () => {
      if (isHighlightCustom) {
        setHighlightTypes(customCountTypes);
      }
    },
    [customCountTypesSelection]
  );

  useEffect(
    () => {
      const params = new URLSearchParams(window.location.search);
      const mapParam = params.get('map');
      if (mapParam) {
        if (mapParam.startsWith("0:")) {
          const mapCompressed = base64urlDecode(mapParam.substring(2));
          const mapBytes = pako.inflate(mapCompressed);
          const td = new TextDecoder();
          const mapJson = td.decode(mapBytes);
          const mapRestored = JSON.parse(mapJson);
          setMap(mapRestored);
        } else {
          console.error("Unknown map serialization version:", mapParam);
        }
      }
    },
    []
  );

  useEffect(
    () => {
      const te = new TextEncoder();
      const mapBytes = te.encode(mapString);
      const mapCompressed = pako.deflate(mapBytes);
      const mapBase64 = base64urlEncode(mapCompressed);
      const mapHref = window.location.origin + window.location.pathname + '?map=0:' + mapBase64;
      window.history.replaceState(null, "", mapHref);
    },
    [mapString]
  );

  return <div className={ styles.wrapper }>
    <GithubCorner
      fillColor="#626262"
      repo="emlun/spire-map-gui"
      visible={ true }
    />

    <div className={ styles.content }>
      <MapEditor
        highlightPaths={ highlightedPaths }
        map={ map }
        startCoordinate={ startCoordinate }
        setMap={ setMap }
        setStartCoordinate={ setStartCoordinate }
      />

      <div className={ styles.info }>
        <p>Number of paths: { numPaths }</p>
        <PathsCounter
          label="Max elites + rests"
          types={ ["elite", "rest"] }
          selected={ highlightPathTypes }
          startCoordinates={ startCoordinates }
          map={ map }
          onHighlight={ setHighlightTypes }
        />
        <PathsCounter
          label="Max elites + supers"
          types={ ["elite", "super"] }
          selected={ highlightPathTypes }
          startCoordinates={ startCoordinates }
          map={ map }
          onHighlight={ setHighlightTypes }
        />
        <PathsCounter
          label="Max fights"
          types={ ["fight"] }
          selected={ highlightPathTypes }
          startCoordinates={ startCoordinates }
          map={ map }
          onHighlight={ setHighlightTypes }
        />
        <PathsCounter
          label="Max events"
          types={ ["event"] }
          selected={ highlightPathTypes }
          startCoordinates={ startCoordinates }
          map={ map }
          onHighlight={ setHighlightTypes }
        />
        <PathsCounter
          label="Max custom"
          types={ customCountTypes }
          selected={ highlightPathTypes }
          startCoordinates={ startCoordinates }
          map={ map }
          onHighlight={ (types) => { setHighlightTypes(types); setIsHighlightCustom(true); } }
        />
        <p className={ styles["room-type-checkboxes"] }>
          { roomTypes.map((rt, i) => {
            const id = `checkbox-room-type-${i}`;
            return <span key={ rt } className={ styles["room-type-checkbox"] }>
              <input type="checkbox"
                id={ id }
                checked={ customCountTypesSelection[rt] }
                onChange={ (event) => setCustomCountTypes(rt, event.target.checked) }
              />
              <label htmlFor={ id } className={ styles["checkbox-label"] }>{ rt }</label>
            </span>;
          })}
        </p>

        <p>Room values:</p>
        <p className={ styles["value-row"] }>
          <label className={ styles["value-input-label"] }>Easy fight:</label>
          <FloatInput value={ easyFightValue } onChange={ setEasyFightValue }/>
          <label className={ styles["value-input-label"] + ' ' + styles["value-input-label-right"] }>Hard fight:</label>
          <FloatInput value={ hardFightValue } onChange={ setHardFightValue }/>
        </p>
        <p className={ styles["value-row"] }>
          <label className={ styles["value-input-label"] }>Elite:</label>
          <FloatInput value={ eliteValue } onChange={ setEliteValue }/>
          <label className={ styles["value-input-label"] + ' ' + styles["value-input-label-right"] }>Super:</label>
          <FloatInput value={ superValue } onChange={ setSuperValue }/>
        </p>
        <p className={ styles["value-row"] }>
          <label className={ styles["value-input-label"] }>Rest:</label>
          <FloatInput value={ restValue } onChange={ setRestValue }/>
        </p>
        <p className={ styles["value-row"] }>
          <label className={ styles["value-input-label"] }>Event:</label>
          <FloatInput value={ eventValue } onChange={ setEventValue }/>
        </p>
        <p className={ styles["value-row"] }>
          <label className={ styles["value-input-label"] }>Shop:</label>
          <FloatInput value={ shopValue } onChange={ setShopValue }/>
          { ' + ' }
          <FloatInput value={ shopGoldValue } onChange={ setShopGoldValue }/>
          { ' per 100 gold' }
        </p>
        <p className={ styles["value-row"] }>
          <label className={ styles["value-input-label"] }>Treasure:</label>
          <FloatInput value={ treasureValue } onChange={ setTreasureValue }/>
        </p>
        <p className={ styles["value-row"] }>
          <label className={ styles["value-input-label"] }>Current gold:</label>
          <FloatInput value={ gold } onChange={ setGold }/>
        </p>
        <p className={ styles["value-row"] }>
          <label className={ styles["value-input-label"] }>Fights in ?s:</label>
          <FloatInput value={ fightEvents } onChange={ setFightEvents }/>
        </p>

        <PathRanking
          gold={ gold }
          highlightedPaths={ highlightedPaths }
          isTrackingMostValuable={ trackMostValuable }
          label="Most valuable paths"
          map={ map }
          onHighlight={ setHighlightRanked }
          setTrackMostValuable={ setTrackMostValuable }
          startCoordinates={ startCoordinates }
          valueFunc={ valuateRoom }
        />
      </div>
    </div>

    <footer className={ styles.footer }>
      <div>
        { PROJECT_NAME }
        { ' ' }
        <a href={ `https://github.com/emlun/spire-map-gui/tree/${computeTreeRef()}` }>
          { VERSION }
        </a>
      </div>
      <div>
        <a href="https://emlun.se/">
          emlun.se
        </a>
      </div>
    </footer>
  </div>;
}

export default App;
