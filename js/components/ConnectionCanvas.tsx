import React, { useCallback, useRef, useState } from 'react';

import { FloorNum, Path, RoomDef } from 'types/map';

import styles from './ConnectionCanvas.module.css';


interface Props {
  floor: FloorNum,
  highlightPaths?: Path[],
  roomsAbove: RoomDef[],
  roomsBelow: RoomDef[],
}

export default function ConnectionCanvas({
  floor,
  highlightPaths,
  roomsAbove,
  roomsBelow,
}: Props) {
  const [hasCanvas, setHasCanvas] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>();
  const canvasRefCallback = useCallback(
    (node: HTMLCanvasElement) => {
      canvasRef.current = node;
      setHasCanvas(true);
    },
    [],
  );

  const canvas = canvasRef.current;
  if (canvas) {
    canvas.height = canvas.scrollHeight;
    canvas.width = canvas.scrollWidth;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    roomsBelow.forEach((room, ri) => {
      const roomX = (ri * 2 + 1) / (roomsBelow.length * 2) * canvas.width;
      room.connections.forEach((connection) => {
        const nextFloorRi = connection;
        const nextRoomX = (nextFloorRi * 2 + 1) / (roomsAbove.length * 2) * canvas.width;
        ctx.beginPath();

        if (highlightPaths
            && floor < 15
            && highlightPaths.some(path =>
              path[floor] === ri && path[floor + 1 as FloorNum] === nextFloorRi
            )
        ) {
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 4;
        } else {
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 1;
        }

        ctx.moveTo(nextRoomX, -6);
        ctx.lineTo(roomX, canvas.height + 6);
        ctx.stroke();
      });
    });
  }

  return <canvas ref={ canvasRefCallback } className={ styles.ConnectionCanvas } />;
}
