import React, { useEffect, useRef, useState, useCallback } from 'react';

interface GameState {
  yar: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  qotile: {
    x: number;
    y: number;
    width: number;
    height: number;
    destroyed: boolean;
  };
  barrier: boolean[][];
  shots: Array<{
    x: number;
    y: number;
    dx: number;
    dy: number;
    width: number;
    height: number;
  }>;
  destroyer: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    active: boolean;
    width: number;
    height: number;
  };
  score: number;
  lives: number;
  gameStatus: 'start' | 'playing' | 'gameOver';
  keys: { [key: string]: boolean };
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const YAR_SIZE = 16;
const QOTILE_SIZE = 24;
const BARRIER_COLS = 40;
const BARRIER_ROWS = 20;
const NEUTRAL_ZONE_X = 600;

export default function YarsRevenge() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  const [gameState, setGameState] = useState<GameState>({
    yar: {
      x: 100,
      y: CANVAS_HEIGHT / 2,
      width: YAR_SIZE,
      height: YAR_SIZE,
    },
    qotile: {
      x: CANVAS_WIDTH - 100,
      y: CANVAS_HEIGHT / 2,
      width: QOTILE_SIZE,
      height: QOTILE_SIZE,
      destroyed: false,
    },
    barrier: Array(BARRIER_ROWS).fill(null).map(() => Array(BARRIER_COLS).fill(true)),
    shots: [],
    destroyer: {
      x: CANVAS_WIDTH,
      y: 0,
      dx: -3,
      dy: 2,
      active: false,
      width: 8,
      height: 8,
    },
    score: 0,
    lives: 3,
    gameStatus: 'start',
    keys: {},
  });

  // Initialize barrier with some gaps
  const initializeBarrier = useCallback(() => {
    const barrier = Array(BARRIER_ROWS).fill(null).map(() => Array(BARRIER_COLS).fill(true));
    
    // Create some initial gaps in the barrier
    for (let i = 0; i < BARRIER_ROWS; i++) {
      for (let j = 0; j < BARRIER_COLS; j++) {
        if (Math.random() < 0.1) {
          barrier[i][j] = false;
        }
      }
    }
    
    return barrier;
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState.gameStatus === 'start') {
        setGameState(prev => ({
          ...prev,
          gameStatus: 'playing',
          barrier: initializeBarrier(),
        }));
        return;
      }
      
      if (e.code === 'Space' && gameState.gameStatus === 'gameOver') {
        setGameState(prev => ({
          ...prev,
          gameStatus: 'start',
          score: 0,
          lives: 3,
          yar: {
            x: 100,
            y: CANVAS_HEIGHT / 2,
            width: YAR_SIZE,
            height: YAR_SIZE,
          },
          qotile: {
            x: CANVAS_WIDTH - 100,
            y: CANVAS_HEIGHT / 2,
            width: QOTILE_SIZE,
            height: QOTILE_SIZE,
            destroyed: false,
          },
          shots: [],
          destroyer: {
            x: CANVAS_WIDTH,
            y: 0,
            dx: -3,
            dy: 2,
            active: false,
            width: 8,
            height: 8,
          },
        }));
        return;
      }

      setGameState(prev => ({
        ...prev,
        keys: { ...prev.keys, [e.code]: true }
      }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setGameState(prev => ({
        ...prev,
        keys: { ...prev.keys, [e.code]: false }
      }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.gameStatus, initializeBarrier]);

  // Game loop
  useEffect(() => {
    if (gameState.gameStatus !== 'playing') return;

    const gameLoop = () => {
      setGameState(prev => {
        const newState = { ...prev };

        // Move Yar
        const speed = 4;
        if (newState.keys['KeyW'] || newState.keys['ArrowUp']) {
          newState.yar.y = Math.max(0, newState.yar.y - speed);
        }
        if (newState.keys['KeyS'] || newState.keys['ArrowDown']) {
          newState.yar.y = Math.min(CANVAS_HEIGHT - YAR_SIZE, newState.yar.y + speed);
        }
        if (newState.keys['KeyA'] || newState.keys['ArrowLeft']) {
          newState.yar.x = Math.max(0, newState.yar.x - speed);
        }
        if (newState.keys['KeyD'] || newState.keys['ArrowRight']) {
          newState.yar.x = Math.min(CANVAS_WIDTH - YAR_SIZE, newState.yar.x + speed);
        }

        // Fire shots
        if (newState.keys['Space'] && newState.shots.length < 3) {
          newState.shots.push({
            x: newState.yar.x + YAR_SIZE / 2,
            y: newState.yar.y + YAR_SIZE / 2,
            dx: 6,
            dy: 0,
            width: 4,
            height: 2,
          });
        }

        // Update shots
        newState.shots = newState.shots.filter(shot => {
          shot.x += shot.dx;
          shot.y += shot.dy;
          
          // Remove shots that go off screen
          if (shot.x > CANVAS_WIDTH || shot.x < 0 || shot.y > CANVAS_HEIGHT || shot.y < 0) {
            return false;
          }

          // Check collision with barrier
          const barrierX = Math.floor((shot.x - 200) / 10);
          const barrierY = Math.floor(shot.y / 20);
          
          if (barrierX >= 0 && barrierX < BARRIER_COLS && barrierY >= 0 && barrierY < BARRIER_ROWS) {
            if (newState.barrier[barrierY][barrierX]) {
              newState.barrier[barrierY][barrierX] = false;
              newState.score += 1;
              return false;
            }
          }

          // Check collision with Qotile
          if (!newState.qotile.destroyed &&
              shot.x < newState.qotile.x + newState.qotile.width &&
              shot.x + shot.width > newState.qotile.x &&
              shot.y < newState.qotile.y + newState.qotile.height &&
              shot.y + shot.height > newState.qotile.y) {
            newState.qotile.destroyed = true;
            newState.score += 1000;
            return false;
          }

          return true;
        });

        // Yar eating barrier
        const yarBarrierX = Math.floor((newState.yar.x - 200) / 10);
        const yarBarrierY = Math.floor(newState.yar.y / 20);
        
        if (yarBarrierX >= 0 && yarBarrierX < BARRIER_COLS && yarBarrierY >= 0 && yarBarrierY < BARRIER_ROWS) {
          if (newState.barrier[yarBarrierY][yarBarrierX]) {
            newState.barrier[yarBarrierY][yarBarrierX] = false;
            newState.score += 2;
          }
        }

        // Activate destroyer missile occasionally
        if (!newState.destroyer.active && Math.random() < 0.002) {
          newState.destroyer.active = true;
          newState.destroyer.x = CANVAS_WIDTH;
          newState.destroyer.y = Math.random() * (CANVAS_HEIGHT - 50);
          newState.destroyer.dx = -4;
          newState.destroyer.dy = (Math.random() - 0.5) * 2;
        }

        // Update destroyer
        if (newState.destroyer.active) {
          newState.destroyer.x += newState.destroyer.dx;
          newState.destroyer.y += newState.destroyer.dy;

          // Bounce off walls
          if (newState.destroyer.y <= 0 || newState.destroyer.y >= CANVAS_HEIGHT - 8) {
            newState.destroyer.dy *= -1;
          }

          // Remove if off screen
          if (newState.destroyer.x < -20) {
            newState.destroyer.active = false;
          }

          // Check collision with Yar
          if (newState.destroyer.x < newState.yar.x + newState.yar.width &&
              newState.destroyer.x + newState.destroyer.width > newState.yar.x &&
              newState.destroyer.y < newState.yar.y + newState.yar.height &&
              newState.destroyer.y + newState.destroyer.height > newState.yar.y) {
            newState.lives--;
            newState.destroyer.active = false;
            
            if (newState.lives <= 0) {
              newState.gameStatus = 'gameOver';
            } else {
              // Reset Yar position
              newState.yar.x = 100;
              newState.yar.y = CANVAS_HEIGHT / 2;
            }
          }
        }

        // Check if Qotile is destroyed - respawn it
        if (newState.qotile.destroyed) {
          setTimeout(() => {
            setGameState(current => ({
              ...current,
              qotile: {
                ...current.qotile,
                destroyed: false,
                x: CANVAS_WIDTH - 100,
                y: Math.random() * (CANVAS_HEIGHT - QOTILE_SIZE),
              },
              barrier: initializeBarrier(),
            }));
          }, 2000);
        }

        return newState;
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.gameStatus, initializeBarrier]);

  // Render game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (gameState.gameStatus === 'start') {
      ctx.fillStyle = '#00FF00';
      ctx.font = '32px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText("YARS' REVENGE", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
      
      ctx.font = '16px Orbitron, monospace';
      ctx.fillText('Press SPACE to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      ctx.fillText('WASD or Arrow Keys to Move', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
      ctx.fillText('SPACE to Fire', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
      return;
    }

    if (gameState.gameStatus === 'gameOver') {
      ctx.fillStyle = '#FF6600';
      ctx.font = '32px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
      
      ctx.fillStyle = '#00FF00';
      ctx.font = '20px Orbitron, monospace';
      ctx.fillText(`Final Score: ${gameState.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      
      ctx.font = '16px Orbitron, monospace';
      ctx.fillText('Press SPACE to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
      return;
    }

    // Draw neutral zone
    ctx.fillStyle = '#333333';
    ctx.fillRect(NEUTRAL_ZONE_X, 0, CANVAS_WIDTH - NEUTRAL_ZONE_X, CANVAS_HEIGHT);

    // Draw barrier
    ctx.fillStyle = '#FF6600';
    for (let i = 0; i < BARRIER_ROWS; i++) {
      for (let j = 0; j < BARRIER_COLS; j++) {
        if (gameState.barrier[i][j]) {
          ctx.fillRect(200 + j * 10, i * 20, 8, 18);
        }
      }
    }

    // Draw Yar
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(gameState.yar.x, gameState.yar.y, gameState.yar.width, gameState.yar.height);

    // Draw Qotile
    if (!gameState.qotile.destroyed) {
      ctx.fillStyle = '#FF6600';
      ctx.fillRect(gameState.qotile.x, gameState.qotile.y, gameState.qotile.width, gameState.qotile.height);
    }

    // Draw shots
    ctx.fillStyle = '#FFFF00';
    gameState.shots.forEach(shot => {
      ctx.fillRect(shot.x, shot.y, shot.width, shot.height);
    });

    // Draw destroyer
    if (gameState.destroyer.active) {
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(gameState.destroyer.x, gameState.destroyer.y, gameState.destroyer.width, gameState.destroyer.height);
    }

    // Draw UI
    ctx.fillStyle = '#00FF00';
    ctx.font = '20px Orbitron, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${gameState.score}`, 20, 30);
    ctx.fillText(`Lives: ${gameState.lives}`, 20, 60);

  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-green-400 font-orbitron text-center mb-2">
          YARS' REVENGE
        </h1>
        <p className="text-orange-400 text-center font-orbitron">
          Classic Atari 2600 Recreation
        </p>
      </div>
      
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-green-400 rounded-lg shadow-lg shadow-green-400/20"
        tabIndex={0}
      />
      
      <div className="mt-4 text-center text-green-400 font-orbitron text-sm">
        <p>Navigate through the barrier and destroy the Qotile!</p>
        <p>Avoid the deadly Destroyer missile!</p>
      </div>
    </div>
  );
}