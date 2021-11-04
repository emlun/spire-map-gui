import React, { useEffect, useState } from 'react';
import pako from 'pako';
import base64 from 'base64-js';
import _ from 'underscore';

import { generate_map } from 'wasm';

import { Coordinate, MapDef, Path } from 'types/map';
import { useLocalStorage } from 'utils';
import GithubCorner from 'components/GithubCorner';
import InfoPanel from 'components/InfoPanel';
import MapEditor, { initialMap } from 'components/MapEditor';

import styles from './App.module.css';


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

function App() {
  const [highlightedPaths, setHighlightedPaths] = useState<Path[]>();
  const [map, setMap] = useState<MapDef>(initialMap);
  const [startCoordinate, setStartCoordinate] = useState<Coordinate>();

  const mapString = JSON.stringify(map);

  useEffect(
    () => {
      const params = new URLSearchParams(window.location.search);
      const mapParam = params.get('map');
      const seedParam = params.get('seed');
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
      } else if (seedParam) {
        if (seedParam.startsWith("0:")) {
          const seed = BigInt(seedParam.substring(2));
          const seedMap = generate_map(BigInt(seed), 0);
          setMap(JSON.parse(seedMap));
        } else {
          console.error("Unknown seed serialization version:", seedParam);
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

      <InfoPanel
        highlightedPaths={ highlightedPaths }
        map={ map }
        startCoordinate={ startCoordinate }
        setHighlightedPaths={ setHighlightedPaths }
        setStartCoordinate={ setStartCoordinate }
      />
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
