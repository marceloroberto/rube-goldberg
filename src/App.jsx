import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { 
  Play, Square, Circle, Triangle, Trash2, Trophy, RefreshCcw, RotateCcw,
  X, Sliders, Wind, MoveDiagonal, Copy, Clipboard, Fan, Scale,
  Menu, Layout, ZoomIn, ZoomOut, Grid, Undo, Redo, Upload, 
  Camera, MousePointer2, Save,
  CupSoda, Milk, Settings2, Link as LinkIcon, Pin
} from 'lucide-react';

/**
 * DESAFIO RUBE GOLDBERG DIGITAL - Versão 12.4
 * - Categorias na Sidebar
 * - Remoção de Rastros
 * - Chão ajustado (+15px)
 * - Fix Copy/Paste
 */

// --- CONFIGURAÇÕES E CONSTANTES ---

const THEMES = {
  lab: { bg: '#f0f4f8', grid: '#cbd5e1', text: '#1e293b', accent: '#3b82f6', ground: '#64748b' },
  blueprint: { bg: '#1e3a8a', grid: '#3b82f6', text: '#bfdbfe', accent: '#60a5fa', ground: '#172554' },
  dark: { bg: '#0f172a', grid: '#334155', text: '#e2e8f0', accent: '#10b981', ground: '#334155' }
};

const MATERIALS = {
  wood: { label: 'Madeira', friction: 0.1, restitution: 0.6, density: 0.001, color: '#d97706' },
  metal: { label: 'Metal', friction: 0.05, restitution: 0.2, density: 0.005, color: '#64748b' },
  rubber: { label: 'Borracha', friction: 0.9, restitution: 0.9, density: 0.001, color: '#10b981' },
  ice: { label: 'Gelo', friction: 0.0, restitution: 0.1, density: 0.0009, color: '#bae6fd' },
  superball: { label: 'Super Bola', friction: 0.0, restitution: 1.2, density: 0.04, color: '#db2777' },
  plastic: { label: 'Plástico', friction: 0.05, restitution: 0.4, density: 0.0005, color: '#ef4444' },
  glass: { label: 'Vidro', friction: 0.02, restitution: 0.1, density: 0.002, color: '#a5f3fc' }
};

const App = () => {
  const sceneRef = useRef(null);
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const runnerRef = useRef(null);
  const mouseConstraintRef = useRef(null);
  
  // --- ESTADO GLOBAL ---
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [itemCount, setItemCount] = useState(0);
  const [currentTheme, setCurrentTheme] = useState('lab');
  const [winMessage, setWinMessage] = useState(false);

  // --- ESTADO DE SELEÇÃO ---
  const [selectedBodyId, setSelectedBodyId] = useState(null);
  const [selectedProps, setSelectedProps] = useState({ angle: 0, scale: 1, material: 'wood', isTarget: false });
  const [clipboard, setClipboard] = useState(null);

  // --- VIEW & TOOLS ---
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showVectors, setShowVectors] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  
  // Histórico
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);

  // Refs Auxiliares
  const initialBodies = useRef([]); 
  const draggedBodyId = useRef(null);
  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const snapEnabledRef = useRef(snapEnabled);

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    const { Engine, Render, Runner, MouseConstraint, Mouse, World, Bodies, Events, Composite, Vector, Body, Constraint } = Matter;

    // 1. Setup Engine
    const engine = Engine.create();
    engineRef.current = engine;
    engine.world.gravity.y = 0; 

    // 2. Setup Render
    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: sceneRef.current.clientWidth,
        height: sceneRef.current.clientHeight,
        background: THEMES[currentTheme].bg,
        wireframes: false,
        showAngleIndicator: false,
        hasBounds: true 
      }
    });
    renderRef.current = render;

    // 3. Paredes e Limites (CHÃO FIXO AJUSTADO)
    const viewWidth = sceneRef.current.clientWidth;
    const viewHeight = sceneRef.current.clientHeight;
    const wallThickness = 100;
    const worldWidth = 10000; 

    // AJUSTE: Subimos o chão 15px subtraindo 15 da posição Y
    const floorY = viewHeight + (wallThickness / 2) - 15;

    const walls = [
       Bodies.rectangle(viewWidth / 2, floorY, worldWidth, wallThickness, { 
           isStatic: true, 
           label: 'Ground', 
           render: { fillStyle: THEMES[currentTheme].ground } 
       }),
       Bodies.rectangle(-worldWidth/2, viewHeight/2, wallThickness, viewHeight * 5, { isStatic: true, label: 'Wall', render: { visible: false } }), 
       Bodies.rectangle(worldWidth/2, viewHeight/2, wallThickness, viewHeight * 5, { isStatic: true, label: 'Wall', render: { visible: false } }), 
       Bodies.rectangle(viewWidth/2, -5000, worldWidth, wallThickness, { isStatic: true, label: 'Ceiling', render: { visible: false } }) 
    ];
    World.add(engine.world, walls);

    // 4. Setup Mouse
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } }
    });
    World.add(engine.world, mouseConstraint);
    render.mouse = mouse;
    mouseConstraintRef.current = mouseConstraint; 

    // --- GESTÃO DE EVENTOS DE MOUSE ---

    Events.on(mouseConstraint, 'mousedown', (e) => {
       if (e.mouse.button === 1 || (e.mouse.button === 0 && e.mouse.sourceEvents.mousedown.altKey)) {
           isPanning.current = true;
           lastMousePos.current = { x: e.mouse.absolute.x, y: e.mouse.absolute.y };
           mouseConstraint.constraint.bodyB = null; 
           return;
       }
       
       const body = e.source.body;
       if (body && !['Ground', 'Wall', 'Ceiling'].includes(body.label)) {
           const parent = body.parent;
           setSelectedBodyId(parent.id);
           updateSelectionState(parent);
       } else {
           setSelectedBodyId(null);
       }
    });

    Events.on(mouseConstraint, 'mousemove', (e) => {
        if (isPanning.current) {
            const deltaX = e.mouse.absolute.x - lastMousePos.current.x;
            const deltaY = e.mouse.absolute.y - lastMousePos.current.y;
            const newBounds = {
                min: { x: render.bounds.min.x - deltaX, y: render.bounds.min.y - deltaY },
                max: { x: render.bounds.max.x - deltaX, y: render.bounds.max.y - deltaY }
            };
            Render.lookAt(render, newBounds, { x: 0, y: 0 });
            lastMousePos.current = { x: e.mouse.absolute.x - deltaX, y: e.mouse.absolute.y - deltaY };
        }
    });

    Events.on(mouseConstraint, 'mouseup', () => { isPanning.current = false; });

    Events.on(mouseConstraint, 'startdrag', (e) => {
        if (isPanning.current) return;
        draggedBodyId.current = e.body.id;
        
        if (!isPlayingRef.current) {
            const body = e.body;
            const parts = body.parts && body.parts.length > 1 ? body.parts : [body];
            parts.forEach(part => {
                part.plugin.originalMask = part.collisionFilter.mask;
                part.collisionFilter.mask = 0; // Modo fantasma
            });
            
            if (['Spinner', 'Seesaw', 'Pulley'].includes(body.label)) {
                const constraints = Composite.allConstraints(engine.world);
                const pivot = constraints.find(c => c.bodyB === body && c.label === 'ComponentPivot');
                if (pivot) pivot.stiffness = 0;
            }
        }
    });

    Events.on(mouseConstraint, 'enddrag', (e) => {
        draggedBodyId.current = null;
        
        if (!isPlayingRef.current) {
            const body = e.body;
            
            if (snapEnabledRef.current) {
                const gridSize = 40;
                const snappedX = Math.round(body.position.x / gridSize) * gridSize;
                const snappedY = Math.round(body.position.y / gridSize) * gridSize;
                Body.setPosition(body, { x: snappedX, y: snappedY });
            }

            const parts = body.parts && body.parts.length > 1 ? body.parts : [body];
            parts.forEach(part => {
                part.collisionFilter.mask = part.plugin.originalMask || 0xFFFFFFFF;
            });
            
            if (['Spinner', 'Seesaw', 'Pulley'].includes(body.label)) {
                const constraints = Composite.allConstraints(engine.world);
                const pivot = constraints.find(c => c.bodyB === body && c.label === 'ComponentPivot');
                if (pivot) {
                    pivot.stiffness = 1;
                    pivot.pointA = { x: body.position.x, y: body.position.y }; 
                }
                Body.setVelocity(body, { x: 0, y: 0 });
                Body.setAngularVelocity(body, 0);
                if(body.label === 'Seesaw') Body.setAngle(body, 0);
            }
            saveHistory(); 
        }
    });

    Events.on(render, 'afterRender', () => {
        const ctx = render.context;
        // REMOVIDO RENDERIZAÇÃO DE TRILHAS
        if (showVectorsRef.current) {
            const bodies = Composite.allBodies(engine.world);
            bodies.forEach(body => {
                if (!body.isStatic) {
                    if (body.speed > 0.1) {
                        ctx.beginPath(); ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2;
                        ctx.moveTo(body.position.x, body.position.y);
                        ctx.lineTo(body.position.x + body.velocity.x * 15, body.position.y + body.velocity.y * 15); ctx.stroke();
                    }
                    ctx.beginPath(); ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'; ctx.setLineDash([5, 5]);
                    ctx.moveTo(body.position.x, body.position.y);
                    ctx.lineTo(body.position.x, body.position.y + 50); ctx.stroke();
                    ctx.setLineDash([]);
                }
            });
        }
    });

    Events.on(engine, 'beforeUpdate', () => {
        const bodies = Composite.allBodies(engine.world);
        const constraints = Composite.allConstraints(engine.world);

        // REMOVIDO LOGICA DE CAPTURA DE TRILHAS

        if (!isPlayingRef.current) {
            bodies.forEach(body => {
                if (!body.isStatic && body.id !== draggedBodyId.current) {
                    Body.setVelocity(body, { x: 0, y: 0 });
                    Body.setAngularVelocity(body, 0);
                }
            });
            if (draggedBodyId.current) {
                const draggedBody = bodies.find(b => b.id === draggedBodyId.current);
                if (draggedBody && (['Spinner', 'Seesaw', 'Pulley'].includes(draggedBody.label))) {
                    const pivot = constraints.find(c => c.bodyB === draggedBody && c.label === 'ComponentPivot');
                    if (pivot) pivot.pointA = { x: draggedBody.position.x, y: draggedBody.position.y };
                }
            }
        }

        if (isPlayingRef.current) {
            bodies.forEach(body => {
                if (body.label === 'Seesaw') {
                    const maxAngle = 0.5; 
                    if (body.angle > maxAngle) { Body.setAngle(body, maxAngle); Body.setAngularVelocity(body, 0); }
                    else if (body.angle < -maxAngle) { Body.setAngle(body, -maxAngle); Body.setAngularVelocity(body, 0); }
                }
                if (body.label === 'Fan') {
                    const fanDir = Vector.rotate({ x: 1, y: 0 }, body.angle);
                    const fanPos = body.position;
                    const range = 350;
                    bodies.forEach(target => {
                        if (target === body || target.isStatic || target.label === 'Spinner' || target.label === 'Seesaw' || target.label === 'Pulley') return;
                        const dVec = Vector.sub(target.position, fanPos);
                        const dist = Vector.magnitude(dVec);
                        if (dist < range) {
                            const dot = Vector.dot(Vector.normalise(dVec), fanDir);
                            if (dot > 0.8) {
                                const forceMag = (0.0005 * target.mass) * (1 - dist / range);
                                Body.applyForce(target, target.position, Vector.mult(fanDir, forceMag));
                            }
                        }
                    });
                }
            });
        }
    });

    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        if ((pair.bodyA.label === 'Ball' && pair.bodyB.label === 'Target') || 
            (pair.bodyB.label === 'Ball' && pair.bodyA.label === 'Target')) {
          handleWin();
        }
      });
    });

    Render.run(render);
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    const initialBounds = {
        min: { x: 0, y: 0 },
        max: { x: sceneRef.current.clientWidth, y: sceneRef.current.clientHeight }
    };
    Render.lookAt(render, initialBounds);

    setupLevel1();
    setTimeout(saveHistory, 100); 

    const handleResize = () => {
        render.canvas.width = sceneRef.current.clientWidth;
        render.canvas.height = sceneRef.current.clientHeight;
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      Render.stop(render);
      Runner.stop(runner);
      if (render.canvas) render.canvas.remove();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const showVectorsRef = useRef(showVectors);

  useEffect(() => { snapEnabledRef.current = snapEnabled; }, [snapEnabled]);
  useEffect(() => { showVectorsRef.current = showVectors; }, [showVectors]);
  useEffect(() => { 
      isPlayingRef.current = isPlaying; 
      if(engineRef.current) engineRef.current.timing.timeScale = timeScale;
  }, [isPlaying, timeScale]);
  useEffect(() => {
      if(renderRef.current) renderRef.current.options.background = THEMES[currentTheme].bg;
  }, [currentTheme]);

  useEffect(() => {
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') undo();
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) redo();
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') if (selectedBodyId) copyBody();
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') if (clipboard) pasteBody();
        if (e.key === 'Delete' || e.key === 'Backspace') if (document.activeElement.tagName !== 'INPUT') deleteSelected();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBodyId, clipboard]); 

  // --- FUNÇÕES AUXILIARES ---
  const updateSelectionState = (body) => {
      setSelectedProps({
          angle: Math.round(body.angle * (180 / Math.PI)),
          scale: body.plugin.scale || 1,
          material: body.plugin.material || 'wood',
          isTarget: body.label === 'Target'
      });
  };

  const updateBodyMaterial = (body, matKey) => {
      const mat = MATERIALS[matKey];
      if(!mat) return;
      
      const applyMaterial = (part) => {
          const color = body.label === 'Target' ? '#F59E0B' : mat.color;
          Matter.Body.set(part, {
              friction: mat.friction, restitution: mat.restitution, density: mat.density,
              render: { ...part.render, fillStyle: color }
          });
          part.plugin.material = matKey;
          part.plugin.originalFriction = mat.friction;
          part.plugin.originalRestitution = mat.restitution;
      };

      if (body.parts.length > 1) {
          body.parts.forEach(p => { if(p !== body) applyMaterial(p); });
      } else {
          applyMaterial(body);
      }
  };

  const updateSelectedBody = (prop, value) => {
     const body = Matter.Composite.allBodies(engineRef.current.world).find(b => b.id === selectedBodyId);
     if(!body) return;
     if(prop === 'angle') { Matter.Body.setAngle(body, value * (Math.PI / 180)); setSelectedProps(p => ({...p, angle: value})); }
     if(prop === 'scale') {
         const currentScale = body.plugin.scale || 1;
         const scaleFactor = value / currentScale;
         Matter.Body.scale(body, scaleFactor, scaleFactor);
         body.plugin.scale = value;
         setSelectedProps(p => ({...p, scale: value}));
     }
     if(prop === 'material') { updateBodyMaterial(body, value); setSelectedProps(p => ({...p, material: value})); }
     saveHistory();
  };

  const addBody = (type, props = {}, save = true) => {
    if (isPlaying && save) return; 
    const { World, Bodies, Body, Composite, Constraint } = Matter;
    const render = renderRef.current;
    const centerX = render ? (render.bounds.min.x + render.bounds.max.x) / 2 : 400;
    const centerY = render ? (render.bounds.min.y + render.bounds.max.y) / 2 : 300;
    const x = props.x !== undefined ? props.x : centerX;
    const y = props.y !== undefined ? props.y : centerY;
    const angle = props.angle || 0;
    const scale = props.scale || 1;
    
    let defaultMat = 'wood';
    if(type === 'trampoline') defaultMat = 'superball';
    if(type === 'cup' || type === 'bottle') defaultMat = 'plastic';
    if(type === 'chain' || type === 'pin') defaultMat = 'metal';
    
    const matKey = props.material || defaultMat;
    const mat = MATERIALS[matKey];
    const commonRender = { strokeStyle: '#000', lineWidth: 0 };
    
    const baseOptions = {
        angle: angle, 
        frictionAir: 0.3, 
        friction: mat.friction, 
        restitution: mat.restitution, 
        density: mat.density,
        render: { fillStyle: mat.color, ...commonRender },
        plugin: { 
            scale, type, material: matKey, 
            originalFrictionAir: 0.001, 
            originalFriction: mat.friction, 
            originalRestitution: mat.restitution 
        }
    };

    let newBody, partsToAdd = [];
    
    switch (type) {
        case 'ball': 
            newBody = Bodies.circle(x, y, 20 * scale, { ...baseOptions, label: 'Ball', friction: 0.0, restitution: 0.8, plugin: { ...baseOptions.plugin, originalFriction: 0.0, originalRestitution: 0.8, originalFrictionAir: 0.0001 } }); 
            partsToAdd = [newBody]; break;
        case 'box': newBody = Bodies.rectangle(x, y, 40 * scale, 40 * scale, { ...baseOptions, label: 'Box' }); partsToAdd = [newBody]; break;
        case 'domino': newBody = Bodies.rectangle(x, y, 10 * scale, 60 * scale, { ...baseOptions, label: 'Domino' }); partsToAdd = [newBody]; break;
        case 'ramp': newBody = Bodies.rectangle(x, y, 200 * scale, 10 * scale, { ...baseOptions, label: 'Ramp', friction: 0.0, plugin: {...baseOptions.plugin, isFixedRamp: true, originalFriction: 0.0} }); partsToAdd = [newBody]; break;
        case 'trampoline': newBody = Bodies.rectangle(x, y, 100 * scale, 15 * scale, { ...baseOptions, label: 'Trampoline', render: { fillStyle: THEMES[currentTheme].accent }, restitution: 2.5, friction: 0.0, plugin: {...baseOptions.plugin, isFixedRamp: true, originalRestitution: 2.5} }); partsToAdd = [newBody]; break;
        case 'fan': newBody = Bodies.rectangle(x, y, 50 * scale, 50 * scale, { ...baseOptions, label: 'Fan', isStatic: false, render: { fillStyle: '#0ea5e9', sprite: { texture: '' } }, plugin: {...baseOptions.plugin, isFixedRamp: true} }); partsToAdd = [newBody]; break;
        
        case 'pin':
            newBody = Bodies.circle(x, y, 10 * scale, { 
                ...baseOptions, 
                label: 'Pin', 
                isStatic: false, 
                isSensor: true,  
                render: { fillStyle: '#333', strokeStyle: '#999', lineWidth: 3 },
                plugin: { ...baseOptions.plugin, type: 'pin', isFixedRamp: true } 
            });
            partsToAdd = [newBody];
            break;

        case 'cup':
            const cupBase = Bodies.rectangle(x, y + 20*scale, 50 * scale, 5 * scale, { ...baseOptions, render: baseOptions.render });
            const cupL = Bodies.rectangle(x - 25*scale, y, 5 * scale, 45 * scale, { ...baseOptions, render: baseOptions.render });
            const cupR = Bodies.rectangle(x + 25*scale, y, 5 * scale, 45 * scale, { ...baseOptions, render: baseOptions.render });
            newBody = Body.create({ parts: [cupBase, cupL, cupR], label: 'Cup', ...baseOptions });
            partsToAdd = [newBody];
            break;

        case 'bottle':
            const botBase = Bodies.rectangle(x, y + 10*scale, 40 * scale, 60 * scale, { ...baseOptions, render: baseOptions.render });
            const botNeck = Bodies.rectangle(x, y - 35*scale, 15 * scale, 30 * scale, { ...baseOptions, render: baseOptions.render });
            newBody = Body.create({ parts: [botBase, botNeck], label: 'Bottle', ...baseOptions });
            partsToAdd = [newBody];
            break;

        case 'pulley':
             newBody = Bodies.circle(x, y, 30 * scale, { 
                 ...baseOptions, 
                 label: 'Pulley', 
                 frictionAir: 0.3, 
                 render: { fillStyle: '#555', strokeStyle: '#333', lineWidth: 2 },
                 plugin: { ...baseOptions.plugin, originalFrictionAir: 0.005 } 
             }); 
             const pulPiv = Constraint.create({ label: 'ComponentPivot', pointA: {x,y}, bodyB: newBody, pointB: {x:0,y:0}, stiffness: 1, length: 0, render: {visible:true, lineWidth:4, strokeStyle: '#333'} });
             partsToAdd = [newBody, pulPiv];
             break;

        case 'chain':
             const group = Body.nextGroup(true);
             const linkWidth = 16 * scale; 
             const linkHeight = 22 * scale;
             const links = 20; 
             const chain = Composite.create({ label: 'Chain' });
             let prevBody = null;
             for (let i = 0; i < links; i++) {
                 const link = Bodies.rectangle(x, y + (i * linkHeight * 0.8), linkWidth, linkHeight, { 
                     collisionFilter: { group: group },
                     frictionAir: 0.05,
                     friction: 0.8, 
                     render: { fillStyle: '#aaa', strokeStyle: '#888', lineWidth: 1 },
                     label: 'ChainLink'
                 });
                 Composite.add(chain, link);
                 if (prevBody) {
                     Composite.add(chain, Constraint.create({ 
                         bodyA: prevBody, bodyB: link, 
                         pointA: { x: 0, y: linkHeight * 0.35 }, 
                         pointB: { x: 0, y: -linkHeight * 0.35 },
                         stiffness: 0.95, length: 2, render: { visible: true, lineWidth: 2, strokeStyle: '#888' }
                     }));
                 }
                 prevBody = link;
             }
             partsToAdd = Composite.allBodies(chain).concat(Composite.allConstraints(chain));
             newBody = prevBody; 
             break;

        case 'spinner':
             newBody = Bodies.rectangle(x, y, 140 * scale, 15 * scale, { ...baseOptions, label: 'Spinner' });
             const sPiv = Constraint.create({ label: 'ComponentPivot', pointA: {x,y}, bodyB: newBody, pointB: {x:0,y:0}, stiffness: 1, length: 0, render: {visible:true, lineWidth:4} });
             partsToAdd = [newBody, sPiv];
             break;
        case 'seesaw':
             newBody = Bodies.rectangle(x, y, 200 * scale, 10 * scale, { ...baseOptions, label: 'Seesaw' });
             const pPiv = Constraint.create({ label: 'ComponentPivot', pointA: {x,y}, bodyB: newBody, pointB: {x:0,y:0}, stiffness: 1, length: 0, render: {visible:true, lineWidth:4} });
             partsToAdd = [newBody, pPiv];
             break;
        default: return;
    }

    if (props.isTarget && newBody) {
         newBody.label = 'Target';
         newBody.plugin.isTarget = true;
         newBody.plugin.originalLabel = props.originalLabel || newBody.label;
         
         const applyTargetStyle = (bodyPart) => {
             bodyPart.render.fillStyle = '#F59E0B';
         };
         if (newBody.parts && newBody.parts.length > 1) {
             newBody.parts.forEach(p => { if(p !== newBody) applyTargetStyle(p); });
         } else {
             applyTargetStyle(newBody);
         }
    }

    if (partsToAdd.length > 0) {
        World.add(engineRef.current.world, partsToAdd);
        if(save && newBody) {
             setItemCount(p => p + 1);
             saveHistory(); 
             setSelectedBodyId(newBody.id);
             updateSelectionState(newBody);
        }
    }
  };

  const toggleTarget = () => {
      if(!selectedBodyId || !engineRef.current) return;
      const bodies = Matter.Composite.allBodies(engineRef.current.world);
      const body = bodies.find(b => b.id === selectedBodyId);
      if(!body) return;
      
      bodies.forEach(b => {
          if(b.label === 'Target') {
              b.label = b.plugin.originalLabel || 'Box';
              b.plugin.isTarget = false;
              const mat = MATERIALS[b.plugin.material || 'wood'];
              const restoreColor = (p) => p.render.fillStyle = mat.color;
              if (b.parts.length > 1) b.parts.forEach(p => { if(p!==b) restoreColor(p) });
              else restoreColor(b);
          }
      });

      const wasTarget = selectedProps.isTarget;
      
      if (!wasTarget) {
          body.plugin.originalLabel = body.label; 
          body.label = 'Target';
          body.plugin.isTarget = true;
          
          const applyTargetStyle = (p) => p.render.fillStyle = '#F59E0B';
          if (body.parts.length > 1) body.parts.forEach(p => { if(p!==body) applyTargetStyle(p) });
          else applyTargetStyle(body);
      }

      updateSelectionState(body);
      saveHistory();
  };

  const deleteSelected = () => {
      if(!selectedBodyId || !engineRef.current) return;
      const body = Matter.Composite.allBodies(engineRef.current.world).find(b => b.id === selectedBodyId);
      if(body) {
          const constraints = Matter.Composite.allConstraints(engineRef.current.world).filter(c => c.bodyB === body || c.bodyA === body);
          Matter.World.remove(engineRef.current.world, [...constraints, body]);
          setSelectedBodyId(null);
          setItemCount(p => Math.max(0, p - 1));
          saveHistory();
      }
  };

  // FIX: Copia a posição atual (x,y) para o clipboard
  const copyBody = () => {
      if(!selectedBodyId) return;
      const body = Matter.Composite.allBodies(engineRef.current.world).find(b => b.id === selectedBodyId);
      if(body) {
          setClipboard({ 
              type: body.plugin.type, 
              x: body.position.x, 
              y: body.position.y,
              ...body.plugin, 
              angle: body.angle 
          });
      }
  };
  const pasteBody = () => {
      if(!clipboard) return;
      // Usa o clipboard.x e clipboard.y que agora existem
      addBody(clipboard.type, { 
          x: clipboard.x + 20, 
          y: clipboard.y + 20, 
          angle: clipboard.angle, 
          scale: clipboard.scale, 
          material: clipboard.material 
      });
  };
  
  const toggleSimulation = () => {
      if(isPlaying) {
          restoreInitialState();
          
          const allConstraints = Matter.Composite.allConstraints(engineRef.current.world);
          const pins = allConstraints.filter(c => c.label === 'PinConstraint');
          Matter.World.remove(engineRef.current.world, pins);

      } else {
          saveInitialState();
          engineRef.current.world.gravity.y = 1;
          setSelectedBodyId(null);
          
          const bodies = Matter.Composite.allBodies(engineRef.current.world);
          const pins = bodies.filter(b => b.label === 'Pin');
          
          pins.forEach(pin => {
              const overlapping = bodies.find(b => 
                  b !== pin && !b.isStatic && Matter.Bounds.overlaps(pin.bounds, b.bounds)
              );
              
              if (overlapping) {
                  const localPoint = Matter.Vector.rotate(
                      Matter.Vector.sub(pin.position, overlapping.position), 
                      -overlapping.angle
                  );
                  
                  const constraint = Matter.Constraint.create({
                      label: 'PinConstraint',
                      bodyA: overlapping,
                      pointA: localPoint, 
                      pointB: pin.position, 
                      stiffness: 1,
                      length: 0,
                      render: { visible: true, lineWidth: 2, strokeStyle: '#000' }
                  });
                  Matter.World.add(engineRef.current.world, constraint);
              }
          });

          Matter.Composite.allBodies(engineRef.current.world).forEach(b => {
              if(b.plugin.isFixedRamp) Matter.Body.setStatic(b, true);
              const fricAir = b.plugin.originalFrictionAir !== undefined ? b.plugin.originalFrictionAir : 0.01;
              const rest = b.plugin.originalRestitution !== undefined ? b.plugin.originalRestitution : b.restitution;
              const fric = b.plugin.originalFriction !== undefined ? b.plugin.originalFriction : b.friction;
              Matter.Body.set(b, { frictionAir: fricAir, restitution: rest, friction: fric });
          });
      }
      setIsPlaying(!isPlaying);
  };

  const saveHistory = () => {
      if(!engineRef.current) return;
      const bodies = Matter.Composite.allBodies(engineRef.current.world);
      const state = bodies.filter(b => !['Ground', 'Wall', 'Target', 'Ceiling', 'ChainLink'].includes(b.label) || b.label === 'Target').map(b => ({
          type: b.plugin.type,
          x: b.position.x, y: b.position.y,
          angle: b.angle,
          scale: b.plugin.scale || 1,
          material: b.plugin.material || 'wood',
          isTarget: b.label === 'Target' || b.plugin.isTarget,
          originalLabel: b.plugin.originalLabel || b.label, 
          props: { ...b.plugin }
      }));
      const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      newHistory.push(JSON.stringify(state));
      if(newHistory.length > 20) newHistory.shift(); 
      historyRef.current = newHistory;
      historyIndexRef.current = newHistory.length - 1;
  };

  const loadHistoryState = (jsonState) => {
      const state = JSON.parse(jsonState);
      clearScene(false); 
      state.forEach(item => addBody(item.type, item, false)); 
      setItemCount(state.length);
  };

  const undo = () => {
      if(historyIndexRef.current > 0) {
          historyIndexRef.current--;
          loadHistoryState(historyRef.current[historyIndexRef.current]);
      }
  };
  const redo = () => {
      if(historyIndexRef.current < historyRef.current.length - 1) {
          historyIndexRef.current++;
          loadHistoryState(historyRef.current[historyIndexRef.current]);
      }
  };

  const saveInitialState = () => {
      const bodies = Matter.Composite.allBodies(engineRef.current.world);
      initialBodies.current = bodies.map(b => ({
          id: b.id, x: b.position.x, y: b.position.y, angle: b.angle,
          velocity: {...b.velocity}, angularVelocity: b.angularVelocity, isStatic: b.isStatic
      }));
  };
  const restoreInitialState = () => {
      const bodies = Matter.Composite.allBodies(engineRef.current.world);
      const constraints = Matter.Composite.allConstraints(engineRef.current.world);
      engineRef.current.world.gravity.y = 0;
      initialBodies.current.forEach(saved => {
          const b = bodies.find(bod => bod.id === saved.id);
          if(b) {
              Matter.Body.setPosition(b, {x: saved.x, y: saved.y});
              Matter.Body.setAngle(b, saved.angle);
              Matter.Body.setVelocity(b, {x:0, y:0});
              Matter.Body.setAngularVelocity(b, 0);
              Matter.Body.setStatic(b, saved.isStatic);
              if(!saved.isStatic) Matter.Body.set(b, { frictionAir: 0.3 }); 
              if(['Spinner','Seesaw','Pulley'].includes(b.label)) {
                  const piv = constraints.find(c => c.bodyB === b && c.label === 'ComponentPivot');
                  if(piv) { piv.pointA = {x: saved.x, y: saved.y}; piv.stiffness = 1; }
              }
          }
      });
  };

  const setupLevel1 = () => {
      clearScene(false);
      setItemCount(0);
  };

  const clearScene = (save = true) => {
      const { World, Composite } = Matter;
      const engine = engineRef.current;
      const bodies = Composite.allBodies(engine.world).filter(b => !['Ground','Wall','Ceiling'].includes(b.label));
      const constraints = Composite.allConstraints(engine.world).filter(c => c.label !== 'Mouse Constraint');
      World.remove(engine.world, [...bodies, ...constraints]);
      if(save) { setItemCount(0); saveHistory(); }
  };
  const handleWin = () => { if(!isPlayingRef.current) return; setWinMessage(true); toggleSimulation(); };

  const handleZoom = (direction) => {
      const render = renderRef.current;
      const zoomFactor = direction === 'in' ? 0.8 : 1.25;
      const center = { x: render.canvas.width/2, y: render.canvas.height/2 };
      const newBounds = {
          min: { x: center.x + (render.bounds.min.x - center.x) * zoomFactor, y: center.y + (render.bounds.min.y - center.y) * zoomFactor },
          max: { x: center.x + (render.bounds.max.x - center.x) * zoomFactor, y: center.y + (render.bounds.max.y - center.y) * zoomFactor }
      };
      Matter.Render.lookAt(render, newBounds);
  };
  const exportProject = () => {
      if(!historyRef.current.length) return;
      const currentState = historyRef.current[historyIndexRef.current];
      const blob = new Blob([currentState], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `rube-goldberg.json`; a.click();
  };
  const importProject = (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (event) => { try { loadHistoryState(event.target.result); saveHistory(); } catch(err) { alert('Erro ao abrir'); } };
      reader.readAsText(file);
  };
  const takeScreenshot = () => {
      const link = document.createElement('a'); link.download = 'maquina.png'; link.href = renderRef.current.canvas.toDataURL(); link.click();
  };

  return (
    <div className="flex flex-col h-screen font-sans text-slate-800 overflow-hidden" style={{ backgroundColor: THEMES[currentTheme].bg }}>
      <style>{`#root { width: 100vw !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }`}</style>

      {/* HEADER */}
      <header className="h-14 border-b px-4 flex items-center justify-between shadow-sm z-20 relative" style={{ backgroundColor: THEMES[currentTheme].bg, borderColor: THEMES[currentTheme].grid }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: THEMES[currentTheme].accent }}>RG</div>
            <h1 className="font-bold text-md tracking-tight" style={{ color: THEMES[currentTheme].text }}>Goldberg Lab</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={toggleSimulation} className={`flex items-center gap-2 px-5 py-1.5 rounded-full font-bold text-sm transition-all shadow-sm ${isPlaying ? 'bg-orange-500 text-white' : 'bg-green-600 text-white'}`}>
              {isPlaying ? <><RefreshCcw size={16} /> Parar</> : <><Play size={16} /> Testar</>}
            </button>
            <button title="Reset Total" onClick={() => window.location.reload()} className="p-2 hover:text-blue-500" style={{ color: THEMES[currentTheme].text }}><RotateCcw size={18} /></button>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="h-10 border-b flex items-center px-4 gap-6 shadow-sm z-10" style={{ backgroundColor: THEMES[currentTheme].bg, borderColor: THEMES[currentTheme].grid }}>
          <div className="flex items-center gap-1 border-r pr-4" style={{ borderColor: THEMES[currentTheme].grid }}>
              <span className="text-[10px] font-bold uppercase mr-2 opacity-50" style={{ color: THEMES[currentTheme].text }}>Arquivo</span>
              <button onClick={exportProject} title="Salvar" className="p-1 rounded hover:bg-black/10" style={{ color: THEMES[currentTheme].text }}><Save size={16}/></button>
              <label className="p-1 rounded hover:bg-black/10 cursor-pointer" title="Abrir"><Upload size={16} style={{ color: THEMES[currentTheme].text }}/><input type="file" className="hidden" accept=".json" onChange={importProject}/></label>
              <button onClick={takeScreenshot} title="Foto" className="p-1 rounded hover:bg-black/10" style={{ color: THEMES[currentTheme].text }}><Camera size={16}/></button>
          </div>
          <div className="flex items-center gap-1 border-r pr-4" style={{ borderColor: THEMES[currentTheme].grid }}>
              <span className="text-[10px] font-bold uppercase mr-2 opacity-50" style={{ color: THEMES[currentTheme].text }}>Editar</span>
              <button onClick={undo} title="Desfazer" className="p-1 rounded hover:bg-black/10" style={{ color: THEMES[currentTheme].text }}><Undo size={16}/></button>
              <button onClick={redo} title="Refazer" className="p-1 rounded hover:bg-black/10" style={{ color: THEMES[currentTheme].text }}><Redo size={16}/></button>
              <button onClick={() => clearScene(true)} title="Limpar Tudo" className="p-1 rounded hover:text-red-500" style={{ color: THEMES[currentTheme].text }}><Trash2 size={16}/></button>
          </div>
          <div className="flex items-center gap-2 border-r pr-4" style={{ borderColor: THEMES[currentTheme].grid }}>
              <span className="text-[10px] font-bold uppercase mr-2 opacity-50" style={{ color: THEMES[currentTheme].text }}>Visualização</span>
              <button onClick={() => handleZoom('out')} className="p-1 rounded hover:bg-black/10" style={{ color: THEMES[currentTheme].text }}><ZoomOut size={16}/></button>
              <button onClick={() => handleZoom('in')} className="p-1 rounded hover:bg-black/10" style={{ color: THEMES[currentTheme].text }}><ZoomIn size={16}/></button>
              <button onClick={() => setSnapEnabled(!snapEnabled)} className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${snapEnabled ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-transparent hover:bg-black/5 opacity-60'}`} style={!snapEnabled ? { color: THEMES[currentTheme].text } : {}}><Grid size={14}/> Grade</button>
              {/* REMOVIDO BOTÃO RASTROS */}
              <button onClick={() => setShowVectors(!showVectors)} className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${showVectors ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'border-transparent hover:bg-black/5 opacity-60'}`} style={!showVectors ? { color: THEMES[currentTheme].text } : {}}><MousePointer2 size={14}/> Vetores</button>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase opacity-50" style={{ color: THEMES[currentTheme].text }}>Velocidade</span>
              <input type="range" min="0.1" max="2" step="0.1" value={timeScale} onChange={(e) => setTimeScale(parseFloat(e.target.value))} className="w-20 h-1 bg-slate-300 rounded appearance-none cursor-pointer accent-blue-600"/>
              <span className="text-[10px] font-mono w-8" style={{ color: THEMES[currentTheme].text }}>{timeScale.toFixed(1)}x</span>
          </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR ORGANIZADA POR CATEGORIAS */}
        <aside className="w-20 md:w-64 border-r flex flex-col z-10" style={{ backgroundColor: THEMES[currentTheme].bg, borderColor: THEMES[currentTheme].grid }}>
          <div className="p-4 border-b flex-1 overflow-y-auto custom-scrollbar" style={{ borderColor: THEMES[currentTheme].grid }}>
            
            <div className="mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider mb-2 opacity-50" style={{ color: THEMES[currentTheme].text }}>Formas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <ToolButton icon={<Circle size={20} />} label="Bola" onClick={() => addBody('ball')} theme={THEMES[currentTheme]} />
                  <ToolButton icon={<Square size={20} />} label="Caixa" onClick={() => addBody('box')} theme={THEMES[currentTheme]} />
                  <ToolButton icon={<div className="w-1 h-4 bg-red-500 mx-auto"/>} label="Dominó" onClick={() => addBody('domino')} theme={THEMES[currentTheme]} />
                  <ToolButton icon={<Triangle size={20} className="rotate-45"/>} label="Rampa" onClick={() => addBody('ramp')} theme={THEMES[currentTheme]} />
                </div>
            </div>

            <div className="mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider mb-2 opacity-50" style={{ color: THEMES[currentTheme].text }}>Mecanismos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <ToolButton icon={<MoveDiagonal size={20} />} label="Trampolim" onClick={() => addBody('trampoline')} theme={THEMES[currentTheme]} />
                  <ToolButton icon={<Wind size={20} />} label="Spinner" onClick={() => addBody('spinner')} theme={THEMES[currentTheme]} />
                  <ToolButton icon={<Fan size={20} />} label="Ventilador" onClick={() => addBody('fan')} theme={THEMES[currentTheme]} />
                  <ToolButton icon={<Scale size={20} />} label="Gangorra" onClick={() => addBody('seesaw')} theme={THEMES[currentTheme]} />
                  <ToolButton icon={<Settings2 size={20} />} label="Roldana" onClick={() => addBody('pulley')} theme={THEMES[currentTheme]} />
                  <ToolButton icon={<LinkIcon size={20} />} label="Corrente" onClick={() => addBody('chain')} theme={THEMES[currentTheme]} />
                </div>
            </div>

            <div className="mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider mb-2 opacity-50" style={{ color: THEMES[currentTheme].text }}>Objetos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <ToolButton icon={<CupSoda size={20} />} label="Copo" onClick={() => addBody('cup')} theme={THEMES[currentTheme]} />
                  <ToolButton icon={<Milk size={20} />} label="Garrafa" onClick={() => addBody('bottle')} theme={THEMES[currentTheme]} />
                </div>
            </div>

            <div>
                <h2 className="text-xs font-bold uppercase tracking-wider mb-2 opacity-50" style={{ color: THEMES[currentTheme].text }}>Ferramentas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                   <ToolButton icon={<Pin size={20} />} label="Prego" onClick={() => addBody('pin')} theme={THEMES[currentTheme]} />
                </div>
            </div>

          </div>
        </aside>

        <main className="flex-1 relative flex flex-col cursor-crosshair">
            {selectedBodyId && !isPlaying && (
                <div className="absolute top-4 left-4 right-4 h-14 rounded-xl border px-4 flex items-center justify-between shadow-lg z-20 animate-slide-down backdrop-blur-md bg-white/90" style={{ borderColor: THEMES[currentTheme].accent }}>
                    <div className="flex items-center gap-6 overflow-x-auto no-scrollbar w-full">
                         <span className="text-xs font-bold uppercase text-blue-600 min-w-max">Editar Objeto</span>
                         <div className="h-6 w-px bg-slate-300"></div>
                         <div className="flex flex-col min-w-[100px]">
                            <label className="text-[9px] font-bold uppercase text-slate-500 mb-1">Material</label>
                            <select value={selectedProps.material} onChange={(e) => updateSelectedBody('material', e.target.value)} className="text-xs p-1 rounded border bg-slate-50 text-slate-700">
                                {Object.entries(MATERIALS).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                            </select>
                         </div>
                         <div className="flex flex-col min-w-[100px]">
                            <div className="flex justify-between mb-1"><label className="text-[9px] font-bold uppercase text-slate-500">Rotação</label><span className="text-[9px] text-blue-600">{selectedProps.angle}°</span></div>
                            <input type="range" min="-180" max="180" value={selectedProps.angle} onChange={(e) => updateSelectedBody('angle', parseInt(e.target.value))} className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                         </div>
                         <div className="flex flex-col min-w-[100px]">
                            <div className="flex justify-between mb-1"><label className="text-[9px] font-bold uppercase text-slate-500">Tamanho</label><span className="text-[9px] text-emerald-600">{selectedProps.scale.toFixed(1)}x</span></div>
                            <input type="range" min="0.5" max="3" step="0.1" value={selectedProps.scale} onChange={(e) => updateSelectedBody('scale', parseFloat(e.target.value))} className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                         </div>
                         
                         <div className="flex flex-col items-center justify-center border-l border-r px-4 border-slate-200">
                            <button 
                                onClick={toggleTarget} 
                                className={`p-2 rounded transition-colors ${selectedProps.isTarget ? 'text-orange-500 bg-orange-100' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} 
                                title={selectedProps.isTarget ? "Remover Meta" : "Definir como Meta/Alvo"}
                            >
                                <Trophy size={20}/>
                            </button>
                            <span className="text-[8px] font-bold uppercase mt-0.5 text-slate-400">Meta</span>
                         </div>

                         <div className="flex-1"></div>
                         <div className="flex gap-2">
                            <button onClick={copyBody} className="p-2 rounded hover:bg-slate-100 text-slate-600" title="Copiar"><Copy size={18}/></button>
                            <button onClick={pasteBody} disabled={!clipboard} className="p-2 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30" title="Colar"><Clipboard size={18}/></button>
                            <button onClick={deleteSelected} className="p-2 rounded hover:bg-red-50 text-red-500" title="Deletar"><Trash2 size={18}/></button>
                         </div>
                         <button onClick={() => setSelectedBodyId(null)} className="ml-2 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                </div>
            )}

            <div className="flex-1 relative w-full h-full bg-transparent">
                <div className="absolute inset-0 pointer-events-none transition-opacity duration-300" style={{ 
                    opacity: snapEnabled ? 0.3 : 0,
                    backgroundImage: `radial-gradient(${THEMES[currentTheme].text} 1px, transparent 1px)`, 
                    backgroundSize: '40px 40px' 
                }} />
                <div ref={sceneRef} className="w-full h-full" />
            </div>
        </main>
      </div>

      {winMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
           <div className="bg-white p-8 rounded-xl text-center shadow-2xl">
              <Trophy className="mx-auto text-yellow-500 mb-4" size={48}/>
              <h2 className="text-2xl font-bold mb-2">Funcionou!</h2>
              <button onClick={() => setWinMessage(false)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700">Continuar</button>
           </div>
        </div>
      )}
    </div>
  );
};

const ToolButton = ({ icon, label, onClick, theme }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center p-3 border-2 border-transparent hover:border-blue-400/50 rounded-xl transition-all group active:scale-95 hover:bg-black/5">
    <div className="mb-1 group-hover:scale-110 transition-transform" style={{ color: theme.accent }}>{icon}</div>
    <span className="text-[10px] font-bold uppercase truncate w-full text-center" style={{ color: theme.text }}>{label}</span>
  </button>
);

export default App;