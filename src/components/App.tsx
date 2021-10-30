import React, { useCallback, useEffect, useState } from 'react';
import pako from 'pako';
import base64 from 'base64-js';
import _ from 'underscore';

import { FloorNum, MapDef, Path, RoomType, roomTypes } from 'types/map';
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
  </p>;
}

function App() {
  const [map, setMap] = useState<MapDef>(initialMap);
  const [customCountTypesSelection, setCustomCountTypesSelection] = useState<{ [rt in RoomType]?: boolean }>({
    "elite": true,
    "rest": true,
    "super": true,
  });
  const [highlightPathTypes, setHighlightPathTypes] = useState<RoomType[]>();
  const [isHighlightCustom, setIsHighlightCustom] = useState(false);

  const customCountTypes = _(customCountTypesSelection).chain().pick(b => b || false).keys().value() as RoomType[];
  const highlightedPath = highlightPathTypes && findMostOfTypes(highlightPathTypes, map)[1];

  const mapString = JSON.stringify(map);

  let numPaths = 0;
  for (const path of findAllPaths(map)) {
    numPaths += 1;
  }

  const setCustomCountTypes = (rt: RoomType, selected: boolean) => {
    setCustomCountTypesSelection(sel => ({
      ...sel,
      [rt]: selected,
    }));
  };

  useEffect(
    () => {
      if (isHighlightCustom) {
        setHighlightPathTypes(customCountTypes);
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
        highlightPaths={ highlightedPath }
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
          onHighlight={ setHighlightPathTypes }
        />
        <PathsCounter
          label="Max elites + supers"
          types={ ["elite", "super"] }
          selected={ highlightPathTypes }
          map={ map }
          onHighlight={ setHighlightPathTypes }
        />
        <PathsCounter
          label="Max fights"
          types={ ["fight"] }
          selected={ highlightPathTypes }
          map={ map }
          onHighlight={ setHighlightPathTypes }
        />
        <PathsCounter
          label="Max events"
          types={ ["event"] }
          selected={ highlightPathTypes }
          map={ map }
          onHighlight={ setHighlightPathTypes }
        />
        <PathsCounter
          label="Max custom"
          types={ customCountTypes }
          selected={ highlightPathTypes }
          map={ map }
          onHighlight={ (types) => { setHighlightPathTypes(types); setIsHighlightCustom(true); } }
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
