import React, { useEffect, useRef, useState } from 'react';
import pako from 'pako';
import base64 from 'base64-js';
import _ from 'underscore';

import { generate_map } from 'wasm';

import { Coordinate, MapDef, Path } from 'types/map';
import { MapMode } from 'types/state';
import { useLocalStorage } from 'utils';

import GithubCorner from 'components/GithubCorner';
import InfoPanel from 'components/InfoPanel';
import MapEditor, { initialMap } from 'components/MapEditor';
import MapModeSelector from 'components/MapModeSelector';
import SeededMap from 'components/SeededMap';

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
  const [seed, setSeed] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);
  const [act, setAct] = useState(0);

  const [mapMode, setMapMode] = useState<MapMode>();

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
          const mapRestored = JSON.parse(
            mapJson,
            (key, value) => key === "typ" && value === "fight" ? "enemy" : value,
          );
          setMap(mapRestored);
          setMapMode("manual");
        } else {
          console.error("Unknown map serialization version:", mapParam);
        }

      } else if (seedParam) {
        if (seedParam.startsWith("0:")) {
          const s = seedParam.substring(2);
          try {
            BigInt(s);
            setSeed(s);
            setMapMode("seeded");
          } catch (e) {
            // Ignore
          }
        } else {
          console.error("Unknown seed serialization version:", seedParam);
        }
      }
    },
    []
  );

  useEffect(
    () => {
      if (mapMode === "seeded" && seed) {
        try {
          const seedMap = generate_map(BigInt(seed), act);
          setMap(JSON.parse(seedMap));
        } catch (e) {
          // Ignore
        }
      }
    },
    [act, mapMode, seed],
  );

  useEffect(
    () => {
      if (mapMode === "manual") {
        const mapString = JSON.stringify(map);
        const te = new TextEncoder();
        const mapBytes = te.encode(mapString);
        const mapCompressed = pako.deflate(mapBytes);
        const mapBase64 = base64urlEncode(mapCompressed);
        const mapHref = window.location.origin + window.location.pathname + '?map=0:' + mapBase64;
        window.history.replaceState(null, "", mapHref);
      } else if (mapMode === "seeded") {
        if (seed) {
          const seedHref = window.location.origin + window.location.pathname + '?seed=0:' + seed;
          window.history.replaceState(null, "", seedHref);
        } else {
          window.history.replaceState(null, "", window.location.origin + window.location.pathname);
        }
      }
    },
    [map, mapMode, seed]
  );

  function loadSeedFromFileContents(text: string): string | undefined {
    try {
      const fileJson = JSON.parse(text);
      return fileJson["seed_played"];
    } catch (e) {
      function unxor(data: Uint8Array, key: Uint8Array): Uint8Array {
        let result = []
        for (let i = 0; i < data.length; i++) {
          result.push(data[i] ^ key[i % key.length]);
        }
        return new Uint8Array(result)
      }

      const cleartext = new TextDecoder().decode(
        unxor(base64.toByteArray(text), new TextEncoder().encode("key"))
      );
      const seedMatch = cleartext.match(/"seed":\s*(-?[0-9]+)(?:,|})/);
      if (seedMatch && seedMatch.length === 2) {
        return seedMatch[1];
      }
    }
  };

  const onSubmitFileSelect = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log(event);
    if (fileInput.current?.files && fileInput.current?.files[0]) {
      setSeed(loadSeedFromFileContents(await fileInput.current.files[0]?.text()));
    }
  };

  const resetMap = () => {
    setMapMode(undefined);
    setSeed(undefined);
    setMap(initialMap);
  }

  return <div className={ styles.wrapper }>
    <GithubCorner
      fillColor="#626262"
      repo="emlun/spire-map-gui"
      visible={ true }
    />

    <div className={ styles.content }>
      <div className={ styles["left-pane"] }>
        { mapMode
          ? (mapMode === "seeded"
            ? (seed
              ? <>
                <div className={ styles["act-select"] }>
                  <button type="button" disabled={ act < 1 } onClick={ () => setAct(act => act - 1) }>
                    &lt;
                  </button>
                  <span>Act { act + 1 }</span>
                  <button type="button" disabled={ act > 1 } onClick={ () => setAct(act => act + 1) }>
                    &gt;
                  </button>
                </div>
                <SeededMap
                  highlightPaths={ highlightedPaths }
                  map={ map }
                  startCoordinate={ startCoordinate }
                  setStartCoordinate={ setStartCoordinate }
                  setRoomType={ (f, ri, typ) =>
                    setMap(map => ({
                      ...map,
                      [f]: map[f].map((room, rii) => {
                        if (ri === rii) {
                          return { ...room, typ };
                        } else {
                          return room;
                        }
                      })
                    }))
                  }
                />
              </>

              : <div className={ styles["mode-select"] }>
                <form onSubmit={ onSubmitFileSelect }>
                  <p>
                    Save or run file: <input type="file" ref={ fileInput } />
                  </p>
                  <button type="submit">
                    Load map
                  </button>
                </form>
              </div>
            )

            : <MapEditor
                highlightPaths={ highlightedPaths }
                map={ map }
                startCoordinate={ startCoordinate }
                setMap={ setMap }
                setStartCoordinate={ setStartCoordinate }
            />
          )

          : <div className={ styles["mode-select"] }>
            <MapModeSelector mapMode={ mapMode } setMapMode={ setMapMode }/>
          </div>
        }
      </div>

      <div className={ styles["right-pane"] }>
        <MapModeSelector mapMode={ mapMode } setMapMode={ setMapMode } onReset={ resetMap } />
        <InfoPanel
          highlightedPaths={ highlightedPaths }
          map={ map }
          startCoordinate={ startCoordinate }
          setHighlightedPaths={ setHighlightedPaths }
          setStartCoordinate={ setStartCoordinate }
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
