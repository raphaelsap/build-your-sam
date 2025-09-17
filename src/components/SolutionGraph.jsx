import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';

const NODE_RADIUS = 48;
const EDGE_DELAY_MS = 2000;
const AGENT_DELAY_MS = 5000;

function computePositions(solutions, { width, height }) {
  if (!solutions.length) {
    return [];
  }

  const safeWidth = Math.max(width, 320);
  const safeHeight = Math.max(height, 320);
  const radius = Math.min(safeWidth, safeHeight) / 2 - NODE_RADIUS * 1.6;
  const centerX = safeWidth / 2;
  const centerY = safeHeight / 2;

  return solutions.map((solution, index) => {
    const angle = (2 * Math.PI * index) / solutions.length - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return {
      id: solution.name,
      solution,
      x,
      y,
    };
  });
}

function buildConnections(solutions) {
  if (solutions.length < 2) {
    return [];
  }

  const indices = d3.shuffle(d3.range(solutions.length));
  const candidates = [];
  for (let i = 0; i < indices.length; i += 1) {
    const nextIndex = (i + 1) % indices.length;
    if (nextIndex === i) continue;
    const source = solutions[indices[i]];
    const target = solutions[indices[nextIndex]];
    candidates.push({
      id: `${source.name}-${target.name}-${i}`,
      nodes: [source.name, target.name],
    });
  }

  return candidates.slice(0, Math.min(6, candidates.length));
}

function buildPath(lineGen, a, b, width, height) {
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const controlX = (midX + width / 2) / 2;
  const controlY = (midY + height / 2) / 2;
  return lineGen([
    [a.x, a.y],
    [controlX, controlY],
    [b.x, b.y],
  ]);
}

function averagePosition(nodeNames, positionMap) {
  const coords = nodeNames
    .map((name) => positionMap.get(name))
    .filter(Boolean);

  if (!coords.length) {
    return { x: 0, y: 0 };
  }

  const { x, y } = coords.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: x / coords.length,
    y: y / coords.length,
  };
}

function SolutionGraph({ solutions, agents, onSelectionComplete, onAutoGenerate, renderAgentCard, className = '' }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 960, height: 600 });
  const [connections, setConnections] = useState([]);
  const [showConnections, setShowConnections] = useState(false);
  const [dragState, setDragState] = useState({ active: false, nodes: [] });
  const [pointer, setPointer] = useState(null);
  const autoSeededRef = useRef(false);

  const positions = useMemo(
    () => computePositions(solutions, dimensions),
    [solutions, dimensions],
  );
  const positionMap = useMemo(() => {
    const map = new Map();
    positions.forEach((pos) => map.set(pos.id, pos));
    return map;
  }, [positions]);

  const lineGenerator = useMemo(
    () =>
      d3
        .line()
        .curve(d3.curveCatmullRom.alpha(0.8)),
    [],
  );

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!solutions.length) {
      setConnections([]);
      setShowConnections(false);
      autoSeededRef.current = false;
      return () => {};
    }

    const newConnections = buildConnections(solutions);
    setShowConnections(false);
    setConnections([]);
    autoSeededRef.current = false;

    const connectionTimer = setTimeout(() => {
      setConnections(newConnections);
      setShowConnections(true);
    }, EDGE_DELAY_MS);

    const agentTimer = setTimeout(() => {
      if (!autoSeededRef.current && onAutoGenerate && newConnections.length) {
        autoSeededRef.current = true;
        const uniqueCombos = [];
        newConnections.forEach((edge) => {
          const key = edge.nodes.slice().sort().join('|');
          if (!uniqueCombos.find((combo) => combo.key === key)) {
            uniqueCombos.push({ key, nodes: edge.nodes });
          }
        });
        onAutoGenerate(uniqueCombos.slice(0, 2).map((item) => item.nodes));
      }
    }, AGENT_DELAY_MS);

    return () => {
      clearTimeout(connectionTimer);
      clearTimeout(agentTimer);
    };
  }, [solutions, onAutoGenerate]);

  const resetDragState = useCallback(() => {
    setDragState({ active: false, nodes: [] });
    setPointer(null);
  }, []);

  const handlePointerDown = useCallback((name) => {
    setDragState({ active: true, nodes: [name] });
  }, []);

  const handlePointerEnter = useCallback((name) => {
    setDragState((prev) => {
      if (!prev.active || prev.nodes.includes(name) || prev.nodes.length >= 3) {
        return prev;
      }
      return { ...prev, nodes: [...prev.nodes, name] };
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    setDragState((prev) => {
      if (prev.active && prev.nodes.length >= 2) {
        onSelectionComplete?.(prev.nodes);
      }
      return prev;
    });
    resetDragState();
  }, [onSelectionComplete, resetDragState]);

  const handlePointerMove = useCallback(
    (event) => {
      if (!dragState.active || !containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      setPointer({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    },
    [dragState.active],
  );

  const dragPath = useMemo(() => {
    if (!dragState.active || dragState.nodes.length < 1) {
      return null;
    }
    const first = positionMap.get(dragState.nodes[0]);
    if (!first) {
      return null;
    }
    if (dragState.nodes.length === 1 && pointer) {
      return lineGenerator([
        [first.x, first.y],
        [(first.x + pointer.x) / 2, (first.y + pointer.y) / 2],
        [pointer.x, pointer.y],
      ]);
    }

    const pathPoints = dragState.nodes
      .map((name) => positionMap.get(name))
      .filter(Boolean)
      .map((point) => [point.x, point.y]);

    if (pointer) {
      const last = pathPoints.at(-1);
      pathPoints.push([(last[0] + pointer.x) / 2, (last[1] + pointer.y) / 2]);
      pathPoints.push([pointer.x, pointer.y]);
    }

    return lineGenerator(pathPoints);
  }, [dragState, pointer, positionMap, lineGenerator]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full min-h-[400px] ${className}`}
    >
      <svg
        className="h-full w-full"
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <defs>
          <radialGradient id="meshGlow" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#F3E5FF" stopOpacity="0.65" />
            <stop offset="80%" stopColor="#EFF8FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#meshGlow)" />

        <AnimatePresence>
          {showConnections &&
            connections.map((edge) => {
              const a = positionMap.get(edge.nodes[0]);
              const b = positionMap.get(edge.nodes[1]);
              if (!a || !b) return null;
              const d = buildPath(lineGenerator, a, b, dimensions.width, dimensions.height);
              return (
                <motion.path
                  key={edge.id}
                  d={d}
                  stroke="#6A0DAD"
                  strokeWidth={2.5}
                  strokeOpacity={0.28}
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.8 }}
                  transition={{ duration: 1.6, ease: 'easeOut' }}
                />
              );
            })}
        </AnimatePresence>

        {dragPath && (
          <path
            d={dragPath}
            stroke="#0098DB"
            strokeWidth={3}
            strokeDasharray="6 6"
            fill="none"
          />
        )}

        <AnimatePresence>
          {positions.map(({ id, x, y, solution }, index) => {
            const isSelected = dragState.nodes.includes(id);
            const delay = index * 0.05;
            return (
              <motion.g
                key={id}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay }}
                onPointerDown={() => handlePointerDown(id)}
                onPointerEnter={() => handlePointerEnter(id)}
                className="cursor-pointer"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={NODE_RADIUS}
                  fill="#FFFFFF"
                  stroke={isSelected ? '#0098DB' : '#E4ECF7'}
                  strokeWidth={isSelected ? 5 : 3}
                  style={{ filter: 'drop-shadow(0 14px 40px rgba(106, 13, 173, 0.18))' }}
                />
                {solution.logoUrl ? (
                  <image
                    href={solution.logoUrl}
                    x={x - NODE_RADIUS * 0.55}
                    y={y - NODE_RADIUS * 0.55}
                    height={NODE_RADIUS * 1.1}
                    width={NODE_RADIUS * 1.1}
                    clipPath={`circle(${NODE_RADIUS * 0.55}px at ${x}px ${y}px)`}
                    preserveAspectRatio="xMidYMid meet"
                  />
                ) : (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="18"
                    fontWeight="700"
                    fill="#6A0DAD"
                  >
                    {solution.name.slice(0, 3).toUpperCase()}
                  </text>
                )}
                <text
                  x={x}
                  y={y + NODE_RADIUS + 20}
                  textAnchor="middle"
                  fontSize="13"
                  fill="#3D3D4E"
                >
                  {solution.name}
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>

      <div className="pointer-events-none absolute inset-0">
        <AnimatePresence>
          {agents.map((agent) => {
            const pos = averagePosition(agent.solutions, positionMap);
            if (!pos) {
              return null;
            }
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                  left: pos.x,
                  top: pos.y,
                  transform: 'translate(-50%, -50%)',
                }}
                className="pointer-events-auto w-64 max-w-[280px]"
              >
                {renderAgentCard?.(agent)}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SolutionGraph;
