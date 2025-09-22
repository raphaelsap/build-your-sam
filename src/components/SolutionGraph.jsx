import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as d3 from 'd3';

const NODE_RADIUS = 36;
const AGENT_DELAY_MS = 3200;
const AGENT_COLLISION_DISTANCE = NODE_RADIUS * 2.4;

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

function clampToEllipse(x, y, layout, padding = 1) {
  if (!layout?.radiusX || !layout?.radiusY) {
    return { x, y };
  }
  const { centerX, centerY, radiusX, radiusY } = layout;
  const dx = x - centerX;
  const dy = y - centerY;
  const rx = Math.max(radiusX - padding, NODE_RADIUS * 2.8);
  const ry = Math.max(radiusY - padding, NODE_RADIUS * 2.6);
  if (rx <= 0 || ry <= 0) {
    return { x: centerX, y: centerY };
  }
  const norm = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  if (norm <= 1) {
    return { x, y };
  }
  const scale = Math.sqrt(1 / norm) * 0.94;
  return {
    x: centerX + dx * scale,
    y: centerY + dy * scale,
  };
}

function resolveAgentCollisions(nodes, layout) {
  const resolved = [];
  nodes.forEach((node) => {
    let x = node.x;
    let y = node.y;
    let iterations = 0;
    while (iterations < 16) {
      let adjusted = false;
      for (const other of resolved) {
        const dx = x - other.x;
        const dy = y - other.y;
        const distance = Math.hypot(dx, dy) || 0.001;
        if (distance < AGENT_COLLISION_DISTANCE) {
          const push = (AGENT_COLLISION_DISTANCE - distance) * 0.55;
          x += (dx / distance) * push;
          y += (dy / distance) * push;
          adjusted = true;
        }
      }
      const clamped = clampToEllipse(x, y, layout, NODE_RADIUS * 0.4);
      if (clamped.x !== x || clamped.y !== y) {
        x = clamped.x;
        y = clamped.y;
        adjusted = true;
      }
      if (!adjusted) {
        break;
      }
      iterations += 1;
    }
    resolved.push({ ...node, x, y });
  });
  return resolved;
}

function computePositions(solutions, layout) {
  if (!solutions.length || !layout) {
    return [];
  }

  const { centerX, centerY, radiusX, radiusY } = layout;
  return solutions.map((solution, index) => {
    const angle = (2 * Math.PI * index) / solutions.length - Math.PI / 2;
    const id = solution.id || solution.name;
    return {
      id,
      solution,
      angle,
      x: centerX + radiusX * Math.cos(angle),
      y: centerY + radiusY * Math.sin(angle),
    };
  });
}

function buildBalancedSeedCombos(positions, maxPairs = 3) {
  const sorted = positions
    .filter((pos) => pos?.solution?.name)
    .map((pos) => ({
      ...pos,
      name: pos.solution.name.trim(),
    }))
    .filter((pos) => pos.name.length > 0)
    .sort((a, b) => a.angle - b.angle);

  const total = sorted.length;
  if (total < 2) {
    return [];
  }

  const maxCombos = Math.max(1, Math.min(maxPairs, Math.floor(total / 2)));
  const halfStep = Math.round(total / 2);
  const stride = Math.max(1, Math.floor(total / maxCombos));
  const combos = [];
  const used = new Set();

  for (let index = 0; index < total && combos.length < maxCombos; index += stride) {
    const first = sorted[index];
    if (!first || used.has(first.id)) {
      continue;
    }
    let partner = null;
    for (let offset = 0; offset < total; offset += 1) {
      const candidate = sorted[(index + halfStep + offset) % total];
      if (candidate && candidate.id !== first.id && !used.has(candidate.id)) {
        partner = candidate;
        break;
      }
    }
    if (!partner) {
      continue;
    }
    combos.push([first.name, partner.name]);
    used.add(first.id);
    used.add(partner.id);
  }

  if (!combos.length && total >= 2) {
    combos.push([sorted[0].name, sorted[1].name]);
  }

  return combos;
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

function pairwise(values) {
  const pairs = [];
  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      pairs.push([values[i], values[j]]);
    }
  }
  return pairs;
}

function SolutionGraph({
  solutions,
  agents = [],
  heatmap = [],
  onSelectionComplete,
  onAutoGenerate,
  className = '',
}) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 960, height: 600 });
  const [dragState, setDragState] = useState({ active: false, nodes: [] });
  const [pointer, setPointer] = useState(null);
  const autoSeededRef = useRef(false);

  const handleLogoError = useCallback((event) => {
    event.currentTarget.setAttribute('href', '');
    event.currentTarget.style.display = 'none';
  }, []);

  const layout = useMemo(() => {
    const width = Math.max(dimensions.width, 400);
    const height = Math.max(dimensions.height, 360);
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = Math.max(width / 2 - NODE_RADIUS * 2.2, NODE_RADIUS * 5.6);
    const radiusY = Math.max(height / 2 - NODE_RADIUS * 2.4, NODE_RADIUS * 4.5);
    return { centerX, centerY, radiusX, radiusY };
  }, [dimensions]);

  const meshCenter = useMemo(
    () => ({ x: layout.centerX, y: layout.centerY }),
    [layout.centerX, layout.centerY],
  );

  const positions = useMemo(
    () => computePositions(solutions, layout),
    [solutions, layout],
  );

  const positionMap = useMemo(() => {
    const map = new Map();
    positions.forEach((pos) => {
      map.set(pos.id, pos);
      const name = pos.solution?.name;
      if (name) {
        map.set(name, pos);
        map.set(name.toLowerCase(), pos);
      }
    });
    return map;
  }, [positions]);

  const solutionLookup = useMemo(() => {
    const map = new Map();
    solutions.forEach((solution) => {
      const key = solution.id || solution.name;
      if (key) {
        map.set(key, solution);
      }
      if (solution.name) {
        map.set(solution.name, solution);
        map.set(solution.name.toLowerCase(), solution);
      }
    });
    return map;
  }, [solutions]);

  const lineGenerator = useMemo(
    () =>
      d3
        .line()
        .curve(d3.curveCatmullRom.alpha(0.85)),
    [],
  );

  const agentNodes = useMemo(() => {
    if (!agents.length) {
      return [];
    }
    const baseRadius = Math.min(layout.radiusX, layout.radiusY);
    const innerRadius = Math.max(baseRadius * 0.58, NODE_RADIUS * 3.2);
    const total = Math.max(agents.length, 1);

    const preliminary = agents
      .map((agent, index) => {
        const anchors = (agent.solutions || [])
          .map((name) => {
            const normalized = typeof name === 'string' ? name.trim() : '';
            if (!normalized) return null;
            return positionMap.get(normalized) || positionMap.get(normalized.toLowerCase());
          })
          .filter(Boolean);

        const fallbackAngle = (2 * Math.PI * index) / total - Math.PI / 2;
        const fallbackVector = {
          x: Math.cos(fallbackAngle),
          y: Math.sin(fallbackAngle),
        };

        if (!anchors.length) {
          const initial = clampToEllipse(
            meshCenter.x + fallbackVector.x * innerRadius,
            meshCenter.y + fallbackVector.y * innerRadius,
            layout,
            NODE_RADIUS,
          );
          return {
            id: agent.id,
            agent,
            anchors,
            x: initial.x,
            y: initial.y,
            isPending: Boolean(agent.isPending),
          };
        }

        const centroid = anchors.reduce(
          (acc, anchor) => ({ x: acc.x + anchor.x, y: acc.y + anchor.y }),
          { x: 0, y: 0 },
        );
        centroid.x /= anchors.length;
        centroid.y /= anchors.length;

        let vectorX = centroid.x - meshCenter.x;
        let vectorY = centroid.y - meshCenter.y;
        let magnitude = Math.hypot(vectorX, vectorY);

        if (magnitude < NODE_RADIUS * 1.2) {
          vectorX = fallbackVector.x;
          vectorY = fallbackVector.y;
          magnitude = 1;
        }

        const normalX = vectorX / magnitude;
        const normalY = vectorY / magnitude;
        const desiredRadius = Math.min(innerRadius, magnitude - NODE_RADIUS * 0.3 || innerRadius * 0.7);
        const radius = desiredRadius > NODE_RADIUS * 1.8 ? desiredRadius : innerRadius * 0.72;
        const targetX = meshCenter.x + normalX * radius;
        const targetY = meshCenter.y + normalY * radius;
        const clamped = clampToEllipse(targetX, targetY, layout, NODE_RADIUS);

        return {
          id: agent.id,
          agent,
          anchors,
          x: clamped.x,
          y: clamped.y,
          isPending: Boolean(agent.isPending),
        };
      })
      .filter(Boolean);

    return resolveAgentCollisions(preliminary, layout);
  }, [agents, positionMap, meshCenter, layout]);

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

  const messageFlows = useMemo(() => {
    if (!agents.length) {
      return [];
    }
    const flows = [];
    const seen = new Set();

    agents
      .filter((agent) => !agent.isPending && Array.isArray(agent.solutions) && agent.solutions.length >= 2)
      .forEach((agent) => {
        pairwise(agent.solutions).forEach(([aName, bName]) => {
          const first = typeof aName === 'string' ? aName.trim() : '';
          const second = typeof bName === 'string' ? bName.trim() : '';
          if (!first || !second) {
            return;
          }
          const source = positionMap.get(first) || positionMap.get(first.toLowerCase());
          const target = positionMap.get(second) || positionMap.get(second.toLowerCase());
          if (!source || !target) {
            return;
          }
          const pairKey = makePairKey(first, second);
          const dedupeKey = `${agent.id || 'agent'}-${pairKey}`;
          if (seen.has(dedupeKey)) {
            return;
          }
          seen.add(dedupeKey);
          const { d, points } = buildPath(lineGenerator, source, target, dimensions.width, dimensions.height);
          const keyframesX = points.map((point) => point[0]);
          const keyframesY = points.map((point) => point[1]);
          const heatEntry = heatmapMap.get(pairKey);
          const intensity = heatEntry ? Math.max(0.2, Math.min(1, heatEntry.value / 100)) : 0.35;
          const midpointIndex = Math.floor(points.length / 2);
          const midpoint = points[midpointIndex] || [
            (source.x + target.x) / 2,
            (source.y + target.y) / 2,
          ];
          flows.push({
            id: dedupeKey,
            agentId: agent.id,
            agentName: agent.agentName,
            source,
            target,
            path: d,
            keyframesX,
            keyframesY,
            intensity,
            midpoint,
          });
        });
      });

    return flows;
  }, [agents, positionMap, heatmapMap, dimensions.width, dimensions.height, lineGenerator]);

  const primaryFlowByAgent = useMemo(() => {
    const map = new Map();
    messageFlows.forEach((flow) => {
      if (!map.has(flow.agentId)) {
        map.set(flow.agentId, flow.id);
      }
    });
    return map;
  }, [messageFlows]);

  const flowingSolutionIds = useMemo(() => {
    const set = new Set();
    messageFlows.forEach((flow) => {
      set.add(flow.source.id);
      set.add(flow.target.id);
    });
    return set;
  }, [messageFlows]);

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
    autoSeededRef.current = false;
  }, [solutions]);

  useEffect(() => {
    if (!onAutoGenerate || autoSeededRef.current || positions.length < 2) {
      return undefined;
    }

    const combos = buildBalancedSeedCombos(positions, positions.length >= 6 ? 3 : 2);
    if (!combos.length) {
      return undefined;
    }

    autoSeededRef.current = true;
    const timer = setTimeout(() => {
      onAutoGenerate(combos);
    }, AGENT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [positions, onAutoGenerate]);

  const resetDragState = useCallback(() => {
    setDragState({ active: false, nodes: [] });
    setPointer(null);
  }, []);

  const handlePointerDown = useCallback((id) => {
    setDragState({ active: true, nodes: [id] });
  }, []);

  const handlePointerEnter = useCallback((id) => {
    setDragState((prev) => {
      if (!prev.active || prev.nodes.includes(id) || prev.nodes.length >= 3) {
        return prev;
      }
      return { ...prev, nodes: [...prev.nodes, id] };
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    setDragState((prev) => {
      if (prev.active && prev.nodes.length >= 2) {
        const names = prev.nodes
          .map((nodeId) => {
            const solution = solutionLookup.get(nodeId);
            if (solution?.name) {
              return solution.name;
            }
            const position = positionMap.get(nodeId);
            return position?.solution?.name || null;
          })
          .filter(Boolean);
        const uniqueNames = Array.from(new Set(names));
        if (uniqueNames.length >= 2) {
          onSelectionComplete?.(uniqueNames);
        }
      }
      return prev;
    });
    resetDragState();
  }, [solutionLookup, positionMap, onSelectionComplete, resetDragState]);

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
      .map((id) => positionMap.get(id))
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
      className={`relative h-full w-full min-h-[420px] ${className}`}
    >
      <svg
        className="h-full w-full"
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <defs>
          <radialGradient id="meshGlow" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#ECFFF8" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#F6FFFB" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {positions.map((pos, idx) => (
            <clipPath key={`clip-${idx}`} id={`clip-${idx}`}>
              <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS - 6} />
            </clipPath>
          ))}
        </defs>

        <rect width="100%" height="100%" fill="url(#meshGlow)" />

        <g className="pointer-events-none">
          <circle
            cx={meshCenter.x}
            cy={meshCenter.y}
            r={22}
            fill="#0CC686"
            opacity={0.12}
          />
          <circle
            cx={meshCenter.x}
            cy={meshCenter.y}
            r={14}
            fill="#0CC686"
            opacity={0.2}
          />
          <circle
            cx={meshCenter.x}
            cy={meshCenter.y}
            r={8}
            fill="#0CC686"
          />
          <text
            x={meshCenter.x}
            y={meshCenter.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9"
            fontWeight="600"
            fill="#FFFFFF"
          >
            Solace
          </text>
        </g>

        <AnimatePresence>
          {messageFlows.map((flow) => {
            const pulseDuration = 3.2 - flow.intensity * 1.3;
            const [midX, midY] = flow.midpoint;
            return (
              <motion.g
                key={flow.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <path
                  d={flow.path}
                  stroke="#0CC686"
                  strokeWidth={2 + flow.intensity * 1.4}
                  strokeOpacity={0.35 + flow.intensity * 0.4}
                  strokeLinecap="round"
                  fill="none"
                  filter="url(#flow-glow)"
                />
                <motion.circle
                  r={2.6 + flow.intensity * 1.2}
                  fill="#05754C"
                  animate={{ cx: flow.keyframesX, cy: flow.keyframesY }}
                  transition={{ duration: pulseDuration, ease: 'linear', repeat: Infinity }}
                />
                {primaryFlowByAgent.get(flow.agentId) === flow.id && flow.agentName ? (
                  <g>
                    <line
                      x1={midX}
                      y1={midY}
                      x2={midX}
                      y2={midY}
                      stroke="#0CC686"
                      strokeOpacity={0.5}
                    />
                    <rect
                      x={midX - 68}
                      y={midY - 20}
                      width={136}
                      height={26}
                      rx={12}
                      ry={12}
                      fill="rgba(255,255,255,0.92)"
                      stroke="rgba(12,198,134,0.2)"
                    />
                    <text
                      x={midX}
                      y={midY - 2}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="600"
                      fill="#0C6B47"
                    >
                      {flow.agentName}
                    </text>
                  </g>
                ) : null}
              </motion.g>
            );
          })}
        </AnimatePresence>

        {agentNodes.map((node) =>
          node.anchors.map((target, idx) => {
            const { d } = buildPath(lineGenerator, node, target, dimensions.width, dimensions.height);
            return (
              <path
                key={`${node.id}-link-${idx}-${target.id || target.x}`}
                d={d}
                stroke="#0DC786"
                strokeWidth={1.1}
                strokeOpacity={node.isPending ? 0.18 : 0.32}
                strokeDasharray="6 8"
                fill="none"
              />
            );
          }),
        )}

        {dragPath && (
          <path
            d={dragPath}
            stroke="#0DAE74"
            strokeWidth={2.4}
            strokeDasharray="4 6"
            fill="none"
          />
        )}

        <AnimatePresence>
          {positions.map(({ id, x, y, solution }, index) => {
            const isSelected = dragState.nodes.includes(id);
            const isActive = flowingSolutionIds.has(id);
            const delay = index * 0.04;
            const labelWidth = Math.max(96, Math.min(160, (solution.name?.length || 0) * 7));
            const labelX = x - labelWidth / 2;
            const labelY = y + NODE_RADIUS + 12;
            return (
              <motion.g
                key={id || `${solution.name}-${index}`}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 240, damping: 22, delay }}
                onPointerDown={() => handlePointerDown(id)}
                onPointerEnter={() => handlePointerEnter(id)}
                className="cursor-pointer"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={NODE_RADIUS}
                  fill="#FFFFFF"
                  stroke={isSelected ? '#0CC686' : isActive ? '#A0F0D6' : '#DFF7ED'}
                  strokeWidth={isSelected ? 4 : 2}
                  style={{ filter: 'drop-shadow(0 10px 24px rgba(8, 198, 139, 0.18))' }}
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
                    onError={handleLogoError}
                  />
                ) : null}
                <rect
                  x={labelX}
                  y={labelY}
                  rx={10}
                  ry={10}
                  width={labelWidth}
                  height={28}
                  fill="rgba(255,255,255,0.92)"
                  stroke="rgba(12,198,134,0.15)"
                />
                <text
                  x={x}
                  y={labelY + 19}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="500"
                  fill="#2C4A3F"
                  style={{ paintOrder: 'stroke', stroke: 'rgba(255,255,255,0.8)', strokeWidth: 2 }}
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
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="pointer-events-none"
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={18}
                fill="#0CC686"
                fillOpacity={node.isPending ? 0.16 : 0.24}
                stroke="#0CC686"
                strokeWidth={1.5}
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={12}
                fill="#FFFFFF"
                stroke="#0CC686"
                strokeWidth={1.5}
              />
            </motion.g>
          ))}
        </AnimatePresence>
      </svg>
    </div>
  );
}

export default SolutionGraph;
