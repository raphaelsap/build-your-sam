import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';

const NODE_RADIUS = 48;
const EDGE_DELAY_MS = 1200;
const AGENT_DELAY_MS = 4000;

function canonicalizePair(pair) {
  if (!pair) return '';
  return pair
    .split(/\+|&|→|->|—|–/g)
    .map((segment) => segment.replace(/[^a-z0-9\s]/gi, '').trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|');
}

function makePairKey(a, b) {
  return canonicalizePair(`${a} + ${b}`);
}

function computePositions(solutions, { width, height }) {
  if (!solutions.length) {
    return [];
  }

  const safeWidth = Math.max(width, 320);
  const safeHeight = Math.max(height, 320);
  const radius = Math.min(safeWidth, safeHeight) / 2 - NODE_RADIUS * 1.65;
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

function buildStableConnections(solutions) {
  const count = solutions.length;
  if (count < 2) {
    return [];
  }

  const edges = [];
  for (let i = 0; i < count; i += 1) {
    const nextIndex = (i + 1) % count;
    edges.push({
      id: `${solutions[i].name}-${solutions[nextIndex].name}-primary`,
      nodes: [solutions[i].name, solutions[nextIndex].name],
    });
  }

  if (count > 3) {
    for (let i = 0; i < count; i += 1) {
      const diagonalIndex = (i + 2) % count;
      const id = `${solutions[i].name}-${solutions[diagonalIndex].name}-secondary`;
      if (!edges.find((edge) => edge.id === id)) {
        edges.push({ id, nodes: [solutions[i].name, solutions[diagonalIndex].name] });
      }
    }
  }

  return edges;
}

function buildPath(lineGen, a, b, width, height) {
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const controlX = (midX + width / 2) / 2;
  const controlY = (midY + height / 2) / 2;
  return {
    d: lineGen([
      [a.x, a.y],
      [controlX, controlY],
      [b.x, b.y],
    ]),
    points: [
      [a.x, a.y],
      [controlX, controlY],
      [b.x, b.y],
    ],
  };
}

function SolutionGraph({ solutions, agents = [], heatmap = [], onSelectionComplete, onAutoGenerate, className = '' }) {
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

  const agentNodes = useMemo(() => {
    if (!agents.length || !positionMap.size) {
      return [];
    }
    const center = { x: dimensions.width / 2, y: dimensions.height / 2 };
    const baseNodes = agents
      .filter((agent) => Array.isArray(agent.solutions) && agent.solutions.length)
      .map((agent, index) => {
        const anchors = agent.solutions
          .map((name) => positionMap.get(name))
          .filter(Boolean);
        if (!anchors.length) {
          return null;
        }
        const { x, y } = anchors.reduce(
          (acc, point) => ({
            x: acc.x + point.x,
            y: acc.y + point.y,
          }),
          { x: 0, y: 0 },
        );
        return {
          id: agent.id,
          agent,
          x: x / anchors.length,
          y: y / anchors.length,
          index,
        };
      })
      .filter(Boolean);

    const adjusted = baseNodes.map((node) => (node ? { ...node } : null));
    const minRadiusFromCenter = NODE_RADIUS * 2 + 40;
    const minAgentSpacing = NODE_RADIUS * 2 + 36;

    for (let i = 0; i < adjusted.length; i += 1) {
      const node = adjusted[i];
      if (!node) continue;

      let dx = node.x - center.x;
      let dy = node.y - center.y;
      let distance = Math.hypot(dx, dy);
      if (distance < minRadiusFromCenter) {
        const scale = (minRadiusFromCenter + i * 6) / (distance || 1);
        dx *= scale;
        dy *= scale;
        node.x = center.x + dx;
        node.y = center.y + dy;
      }

      for (let j = 0; j < i; j += 1) {
        const other = adjusted[j];
        if (!other) continue;
        let diffX = node.x - other.x;
        let diffY = node.y - other.y;
        let dist = Math.hypot(diffX, diffY);
        if (dist < minAgentSpacing) {
          const push = (minAgentSpacing - dist) / (dist || 1) * 0.5;
          diffX *= push;
          diffY *= push;
          node.x += diffX;
          node.y += diffY;
          other.x -= diffX;
          other.y -= diffY;
        }
      }
    }

    return adjusted.filter(Boolean);
  }, [agents, positionMap, dimensions]);
  const heatmapMap = useMemo(() => {
    const map = new Map();
    (heatmap || []).forEach((entry) => {
      const key = canonicalizePair(entry?.pair);
      if (!key) return;
      const value = Number.isFinite(entry?.value) ? Math.max(0, Math.min(100, Number(entry.value))) : 0;
      map.set(key, {
        value,
        rationale: typeof entry?.rationale === 'string' ? entry.rationale : '',
      });
    });
    return map;
  }, [heatmap]);


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

    const newConnections = buildStableConnections(solutions);
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

  const meshCenter = useMemo(
    () => ({ x: dimensions.width / 2, y: dimensions.height / 2 }),
    [dimensions],
  );

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full min-h-[440px] ${className}`}
    >
      <svg
        className="h-full w-full"
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <defs>
          <radialGradient id="meshGlow" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#CFF6E7" stopOpacity="0.75" />
            <stop offset="80%" stopColor="#F0FFFA" stopOpacity="0" />
          </radialGradient>
          <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {positions.map((pos, idx) => (
            <clipPath key={`clip-${idx}`} id={`clip-${idx}`}>
              <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS - 5} />
            </clipPath>
          ))}
        </defs>

        <rect width="100%" height="100%" fill="url(#meshGlow)" />

        <g className="pointer-events-none">
          <circle
            cx={meshCenter.x}
            cy={meshCenter.y}
            r={38}
            fill="#08C68B"
            opacity={0.12}
          />
          <circle
            cx={meshCenter.x}
            cy={meshCenter.y}
            r={26}
            fill="#08C68B"
            opacity={0.22}
          />
          <circle
            cx={meshCenter.x}
            cy={meshCenter.y}
            r={18}
            fill="#08C68B"
          />
          <text
            x={meshCenter.x}
            y={meshCenter.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="11"
            fontWeight="700"
            fill="#FFFFFF"
          >
            Solace
          </text>
        </g>

        <AnimatePresence>
          {showConnections &&
            connections.map((edge) => {
              const a = positionMap.get(edge.nodes[0]);
              const b = positionMap.get(edge.nodes[1]);
              if (!a || !b) return null;
              const pairKey = makePairKey(edge.nodes[0], edge.nodes[1]);
              const heatEntry = heatmapMap.get(pairKey);
              const intensity = heatEntry ? Math.max(0.2, Math.min(1, heatEntry.value / 100)) : 0.4;
              const { d, points } = buildPath(lineGenerator, a, b, dimensions.width, dimensions.height);
              const keyframesX = points.map((point) => point[0]);
              const keyframesY = points.map((point) => point[1]);
              const baseDuration = 3.6 - intensity * 1.6;
              return (
                <g key={edge.id}>
                  <path
                    d={d}
                    stroke="#08C68B"
                    strokeWidth={2.6 + intensity * 1.4}
                    strokeOpacity={0.35 + intensity * 0.45}
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d={d}
                    stroke="#6A0DAD"
                    strokeWidth={3.4 + intensity * 2}
                    strokeOpacity={0.18 + intensity * 0.2}
                    strokeLinecap="round"
                    fill="none"
                    filter="url(#glow-purple)"
                  />
                  <motion.circle
                    r={3}
                    fill="#056E3E"
                    animate={{ cx: keyframesX, cy: keyframesY }}
                    transition={{ duration: baseDuration, ease: 'linear', repeat: Infinity }}
                  />
                </g>
              );
            })}
        </AnimatePresence>

        {agentNodes.map((node) =>
          node.agent.solutions
            .map((name) => positionMap.get(name))
            .filter(Boolean)
            .map((target, idx) => {
              const { d, points } = buildPath(lineGenerator, node, target, dimensions.width, dimensions.height);
              const keyframesX = points.map((point) => point[0]);
              const keyframesY = points.map((point) => point[1]);
              return (
                <g key={`${node.id}-link-${idx}-${target.id || target.x}`}>
                  <path
                    d={d}
                    stroke="#0C8150"
                    strokeWidth={1.7}
                    strokeOpacity={0.6}
                    fill="none"
                  />
                  <motion.circle
                    r={2.6}
                    fill="#045E32"
                    animate={{ cx: keyframesX, cy: keyframesY }}
                    transition={{ duration: 2.6, ease: 'linear', repeat: Infinity }}
                  />
                </g>
              );
            })
        )}

        {agentNodes.length > 1 &&
          agentNodes.flatMap((source, idx) =>
            agentNodes.slice(idx + 1).map((target) => {
              const control = [
                (source.x + target.x) / 2,
                (source.y + target.y) / 2,
              ];
              const points = [
                [source.x, source.y],
                control,
                [target.x, target.y],
              ];
              const d = lineGenerator(points);
              const keyframesX = points.map((point) => point[0]);
              const keyframesY = points.map((point) => point[1]);
              return (
                <g key={`${source.id}-${target.id}-agent-link`}>
                  <path
                    d={d}
                    stroke="#0A6B3D"
                    strokeWidth={1.2}
                    strokeOpacity={0.55}
                    fill="none"
                  />
                  <motion.circle
                    r={2.4}
                    fill="#0A6B3D"
                    animate={{ cx: keyframesX, cy: keyframesY }}
                    transition={{ duration: 3.4, ease: 'linear', repeat: Infinity }}
                  />
                </g>
              );
            }),
          )}

        {dragPath && (
          <path
            d={dragPath}
            stroke="#0DAE74"
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
                  stroke={isSelected ? '#08C68B' : '#D7F6EB'}
                  strokeWidth={isSelected ? 5 : 3}
                  style={{ filter: 'drop-shadow(0 14px 40px rgba(8, 198, 139, 0.18))' }}
                />
               {solution.logoUrl ? (
                 <image
                   href={solution.logoUrl}
                    x={x - NODE_RADIUS * 0.7}
                    y={y - NODE_RADIUS * 0.7}
                    width={NODE_RADIUS * 1.4}
                    height={NODE_RADIUS * 1.4}
                    preserveAspectRatio="xMidYMid meet"
                    clipPath={`url(#clip-${index})`}
                    style={{ pointerEvents: 'none' }}
                  />
                ) : null}
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

        <AnimatePresence>
          {agentNodes.map((node) => (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="pointer-events-none"
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={24}
                fill="#08C68B"
                fillOpacity={0.18}
                stroke="#08C68B"
                strokeWidth={2}
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={16}
                fill="#FFFFFF"
                stroke="#08C68B"
                strokeWidth={2}
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fontWeight="600"
                fill="#1F2933"
              >
                {(node.agent.agentName || 'Agent').slice(0, 10)}
              </text>
            </motion.g>
          ))}
        </AnimatePresence>
      </svg>
    </div>
  );
}

export default SolutionGraph;
