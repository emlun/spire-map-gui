import React, { useCallback, useEffect, useState } from 'react';
import pako from 'pako';
import base64 from 'base64-js';
import _ from 'underscore';

import { FloorNum, MapDef } from 'types/map';
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

function* findAllPaths(map: MapDef) {
  const numFloors = _(map).size();
  let floorStack: number[] = [0];
  if (map[1].length > 0) {
    while (true) {
      if (floorStack.length === 0) {
        break;
      } else if (floorStack.length < numFloors) {
        floorStack = [...floorStack, _.min(map[floorStack.length as FloorNum][floorStack[floorStack.length - 1]].connections)];
      } else {
        yield _(floorStack).map((ri, f) => map[f + 1 as FloorNum][ri].typ);

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

function App() {
  const [map, setMap] = useState<MapDef>(initialMap);

  const mapString = JSON.stringify(map);

  let numPaths = 0;
  for (const path of findAllPaths(map)) {
    numPaths += 1;
  }

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
        map={ map }
        setMap={ setMap }
      />

      <div className={ styles.info }>
        Number of paths: { numPaths }
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
