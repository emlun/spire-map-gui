import React, { useCallback, useEffect, useState } from 'react';
import pako from 'pako';
import base64 from 'base64-js';
import _ from 'underscore';

import { FloorNum, MapDef, Path, RoomType, roomTypes } from 'types/map';
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

function* findAllPaths(map: MapDef): Generator<Path> {
  const numFloors = _(map).size();
  let floorStack: Path = [0];
  if (map[1].length > 0) {
    while (true) {
      if (floorStack.length === 0) {
        break;
      } else if (floorStack.length < numFloors) {
        floorStack = [...floorStack, _.min(map[floorStack.length as FloorNum][floorStack[floorStack.length - 1]].connections)];
      } else {
        yield floorStack;

        while (floorStack.length > 1) {
          const secondLastRoom = map[floorStack.length - 1 as FloorNum][floorStack[floorStack.length - 2]];
          const nextRoom = floorStack[floorStack.length - 1] + 1;
          if (_(secondLastRoom.connections).contains(nextRoom)) {
            floorStack = floorStack.map((ri, i) => i === floorStack.length - 1 ? nextRoom : ri);
            break;
          } else {
            floorStack = floorStack.filter((_, i) => i < floorStack.length - 1);
          }
        }

        if (floorStack.length === 1) {
          floorStack = [floorStack[0] + 1];
          if (floorStack[0] >= map[1].length) {
            break;
          }
        }
      }
    }
  }
}

function findMostOfTypes(roomTypes: RoomType[], map: MapDef): [number, Path[]] {
  let maxn = 0;
  let maxPaths: Path[] = [];
  for (const path of findAllPaths(map)) {
    const n = path.filter((ri, f) => _(roomTypes).contains(map[f + 1 as FloorNum][ri].typ)).length;
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
  valueFunc: (rt: RoomType, f: FloorNum, gold: number) => number,
  map: MapDef,
  gold: number,
  numPaths: number,
): [string, Path[]][] {
  let paths: { [value: string]: Path[] } = {};
  for (const path of findAllPaths(map)) {
    const value = path.reduce(
      (v, ri, f) => {
        const fl = f + 1 as FloorNum;
        return v + valueFunc(map[fl][ri]?.typ, fl, gold);
      },
      0,
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
  types,
  onHighlight,
}: {
  label?: React.ReactNode,
  map: MapDef,
  selected?: RoomType[],
  types: RoomType[],
  onHighlight?: (types: RoomType[] | undefined) => void,
}) {
  const [num, paths] = findMostOfTypes(types, map);
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
  label,
  map,
  onHighlight,
  valueFunc,
}: {
  gold: number,
  highlightedPaths?: Path[],
  label?: React.ReactNode,
  map: MapDef,
  valueFunc: (rt: RoomType, f: FloorNum, gold: number) => number,
  onHighlight?: (path: Path[] | undefined) => void,
}) {
  const ranking = rankPaths(valueFunc, map, gold, 15);
  return <div className={ styles["path-ranking"] }>
    { label }
    { ':' }

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

  const [chestValue, setChestValue] = useState(0.5);
  const [eliteValue, setEliteValue] = useState(1.2);
  const [eventValue, setEventValue] = useState(0.8);
  const [fightValue, setFightValue] = useState(0.3);
  const [restValue, setRestValue] = useState(1);
  const [storeValue, setStoreValue] = useState(0.3);
  const [storeGoldValue, setStoreGoldValue] = useState(0.4);
  const [superValue, setSuperValue] = useState(1.3);
  const [gold, setGold] = useState(99);

  const customCountTypes = _(customCountTypesSelection).chain().pick(b => b || false).keys().value() as RoomType[];

  const mapString = JSON.stringify(map);

  let numPaths = 0;
  for (const path of findAllPaths(map)) {
    numPaths += 1;
  }

  const setHighlightTypes = (types: RoomType[] | undefined) => {
    setHighlightPathTypes(types);
    if (types) {
      setHighlightedPaths(findMostOfTypes(types, map)[1]);
    } else {
      setHighlightedPaths(undefined);
    }
  };

  const setHighlightRanked = (paths: Path[] | undefined) => {
    setHighlightPathTypes(undefined);
    setHighlightedPaths(paths);
  };

  const setCustomCountTypes = (rt: RoomType, selected: boolean) => {
    setCustomCountTypesSelection(sel => ({
      ...sel,
      [rt]: selected,
    }));
  };

  const valuateRoom = (rt: RoomType, f: FloorNum, gold: number) => {
    switch (rt) {
      case "chest":
        return chestValue;

      case "elite":
        return eliteValue;

      case "event":
        return eventValue;

      case "fight":
        return fightValue;

      case "rest":
        return restValue;

      case "store":
        return storeValue + storeGoldValue * gold / 100;

      case "super":
        return superValue;
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
        setMap={ setMap }
      />

      <div className={ styles.info }>
        <p>Number of paths: { numPaths }</p>
        <PathsCounter
          label="Max elites + rests"
          types={ ["elite", "rest"] }
          selected={ highlightPathTypes }
          map={ map }
          onHighlight={ setHighlightTypes }
        />
        <PathsCounter
          label="Max elites + supers"
          types={ ["elite", "super"] }
          selected={ highlightPathTypes }
          map={ map }
          onHighlight={ setHighlightTypes }
        />
        <PathsCounter
          label="Max fights"
          types={ ["fight"] }
          selected={ highlightPathTypes }
          map={ map }
          onHighlight={ setHighlightTypes }
        />
        <PathsCounter
          label="Max events"
          types={ ["event"] }
          selected={ highlightPathTypes }
          map={ map }
          onHighlight={ setHighlightTypes }
        />
        <PathsCounter
          label="Max custom"
          types={ customCountTypes }
          selected={ highlightPathTypes }
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
        <p>
          <label className={ styles["value-input-label"] }>Chest:</label>
          <FloatInput value={ chestValue } onChange={ setChestValue }/>
        </p>
        <p>
          <label className={ styles["value-input-label"] }>Elite:</label>
          <FloatInput value={ eliteValue } onChange={ setEliteValue }/>
        </p>
        <p>
          <label className={ styles["value-input-label"] }>Event:</label>
          <FloatInput value={ eventValue } onChange={ setEventValue }/>
        </p>
        <p>
          <label className={ styles["value-input-label"] }>Fight:</label>
          <FloatInput value={ fightValue } onChange={ setFightValue }/>
        </p>
        <p>
          <label className={ styles["value-input-label"] }>Rest:</label>
          <FloatInput value={ restValue } onChange={ setRestValue }/>
        </p>
        <p>
          <label className={ styles["value-input-label"] }>Store:</label>
          <FloatInput value={ storeValue } onChange={ setStoreValue }/>
          { ' + ' }
          <FloatInput value={ storeGoldValue } onChange={ setStoreGoldValue }/>
          { ' per 100 gold' }
        </p>
        <p>
          <label className={ styles["value-input-label"] }>Super:</label>
          <FloatInput value={ superValue } onChange={ setSuperValue }/>
        </p>
        <p>
          <label className={ styles["value-input-label"] }>Current gold:</label>
          <FloatInput value={ gold } onChange={ setGold }/>
        </p>

        <PathRanking
          gold={ gold }
          highlightedPaths={ highlightedPaths }
          label="Most valuable paths"
          map={ map }
          valueFunc={ valuateRoom }
          onHighlight={ setHighlightRanked }
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
