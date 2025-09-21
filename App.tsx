import React, { useState, useRef, useCallback } from 'react';
import type { Room, Point, WallFeature } from './types';
import InspectorPanel from './components/InspectorPanel';
import { Ruler, Hand, SquarePlus, Save, FolderOpen, Undo, Redo, Lock } from 'lucide-react';

const ROOM_COLORS = [
    // Cool Tones
    '#DBEAFE', '#BFDBFE', '#93C5FD', // Blue
    '#A7F3D0', '#6EE7B7', '#34D399', // Green
    '#C7D2FE', '#A5B4FC', '#818CF8', // Indigo
    '#DDD6FE', '#C4B5FD', '#A78BFA', // Violet
    '#E9D5FF', '#D8B4FE', '#C084FC', // Purple
    // Warm Tones
    '#FDE68A', '#FCD34D', '#FBBF24', // Amber
    '#FED7AA', '#FDBA74', '#FB923C', // Orange
    '#FECACA', '#FCA5A5', '#F87171', // Red
    '#FBCFE8', '#F9A8D4', '#F472B6', // Pink
    // Neutral
    '#E5E7EB', '#D1D5DB', '#9CA3AF', // Gray
];

const GRID_SIZE = 10;
const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;


const darkenColor = (color: string, amount = 40) => {
  if (color.startsWith('#')) {
    let r = parseInt(color.substring(1, 3), 16);
    let g = parseInt(color.substring(3, 5), 16);
    let b = parseInt(color.substring(5, 7), 16);
    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);
    const toHex = (c: number) => `0${c.toString(16)}`.slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return color;
};

const useHistory = <T,>(initialState: T) => {
    const [history, setHistory] = useState<T[]>([initialState]);
    const [index, setIndex] = useState(0);

    const setState = (action: React.SetStateAction<T>, overwrite = false) => {
        const newState = typeof action === 'function' ? (action as (prevState: T) => T)(history[index]) : action;
        if (overwrite) {
            const newHistory = [...history];
            newHistory[index] = newState;
            setHistory(newHistory);
        } else {
            const newHistory = history.slice(0, index + 1);
            newHistory.push(newState);
            setHistory(newHistory);
            setIndex(newHistory.length - 1);
        }
    };
    
    const undo = () => index > 0 && setIndex(index - 1);
    const redo = () => index < history.length - 1 && setIndex(index + 1);

    return {
        state: history[index],
        setState,
        undo,
        redo,
        canUndo: index > 0,
        canRedo: index < history.length - 1,
    };
};

const getFeatureStyle = (feature: WallFeature, room: Room): React.CSSProperties => {
    const style: React.CSSProperties = {
        position: 'absolute',
        backgroundColor: feature.type === 'window' ? '#a7d8f3' : '#a36b4f',
        border: '1px solid #333',
        boxSizing: 'border-box'
    };

    const wallThickness = 2;
    const featureDepth = 8;

    switch (feature.wall) {
        case 'top':
            style.width = feature.width;
            style.height = featureDepth;
            style.left = room.width * feature.position - feature.width / 2;
            style.top = -featureDepth / 2 + wallThickness/2;
            break;
        case 'bottom':
            style.width = feature.width;
            style.height = featureDepth;
            style.left = room.width * feature.position - feature.width / 2;
            style.top = room.height - featureDepth / 2 - wallThickness/2;
            break;
        case 'left':
            style.width = featureDepth;
            style.height = feature.width;
            style.left = -featureDepth/2 + wallThickness/2;
            style.top = room.height * feature.position - feature.width / 2;
            break;
        case 'right':
            style.width = featureDepth;
            style.height = feature.width;
            style.left = room.width - featureDepth/2 - wallThickness/2;
            style.top = room.height * feature.position - feature.width / 2;
            break;
    }
    return style;
};

type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface RoomProps {
  room: Room;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, room: Room) => void;
  onResizeStart: (e: React.MouseEvent, room: Room, handle: ResizeHandle) => void;
}

const RoomComponent: React.FC<RoomProps> = React.memo(({ room, isSelected, onMouseDown, onResizeStart }) => {
  const roomStyle: React.CSSProperties = {
    left: room.x,
    top: room.y,
    width: room.width,
    height: room.height,
    backgroundColor: room.color,
    borderColor: isSelected ? '#3B82F6' : darkenColor(room.color),
    cursor: room.locked ? 'not-allowed' : 'grab',
    zIndex: room.zIndex || 0,
  };

  const RESIZE_HANDLE_SIZE = 8;
  const handles: ResizeHandle[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

  return (
    <div
      key={room.id}
      className={`absolute select-none border-2 transition-shadow duration-150 ${
        isSelected ? 'shadow-lg' : ''
      }`}
      style={roomStyle}
      onMouseDown={(e) => onMouseDown(e, room)}
    >
      <div className="relative w-full h-full">
         {room.features?.map(feature => (
             <div key={feature.id} style={getFeatureStyle(feature, room)} />
         ))}
      </div>
       {room.locked && (
          <div className="absolute top-1 left-1 p-1 bg-black bg-opacity-20 rounded-full pointer-events-none">
              <Lock className="w-3 h-3 text-white" />
          </div>
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-center p-2 overflow-hidden pointer-events-none">
        <span className="font-bold text-sm text-gray-800 truncate">{room.name}</span>
        <span className="text-xs text-gray-600">
          {Math.round(room.width)} x {Math.round(room.height)}
        </span>
      </div>
       {isSelected && !room.locked && handles.map(handle => {
          const style: React.CSSProperties = {
              position: 'absolute',
              width: RESIZE_HANDLE_SIZE,
              height: RESIZE_HANDLE_SIZE,
              backgroundColor: '#3B82F6',
              border: '1px solid #fff',
              borderRadius: '2px',
              zIndex: (room.zIndex || 0) + 1,
          };
          if (handle.includes('top')) style.top = -RESIZE_HANDLE_SIZE / 2;
          if (handle.includes('bottom')) style.bottom = -RESIZE_HANDLE_SIZE / 2;
          if (handle.includes('left')) style.left = -RESIZE_HANDLE_SIZE / 2;
          if (handle.includes('right')) style.right = -RESIZE_HANDLE_SIZE / 2;
          if (handle === 'top-left' || handle === 'bottom-right') style.cursor = 'nwse-resize';
          if (handle === 'top-right' || handle === 'bottom-left') style.cursor = 'nesw-resize';
          
          return (
              <div 
                  key={handle}
                  style={style}
                  onMouseDown={(e) => onResizeStart(e, room, handle)}
              />
          );
      })}
    </div>
  );
});

const GridBackground = ({ transform }: { transform: { scale: number, x: number, y: number }}) => {
    const scaledGridSize = GRID_SIZE * transform.scale;
  
    return (
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,
          backgroundPosition: `${transform.x % scaledGridSize}px ${transform.y % scaledGridSize}px`,
          backgroundImage: `radial-gradient(#e0e0e0 1px, transparent 1px)`,
          opacity: 0.75,
        }}
      />
    );
  };


const App: React.FC = () => {
    const initialRooms: Room[] = [
        { id: 'living-room-1', name: 'Living Room', x: 50, y: 50, width: 300, height: 200, color: ROOM_COLORS[0], zIndex: 0, features: [], locked: false },
        { id: 'kitchen-1', name: 'Kitchen', x: 350, y: 50, width: 150, height: 150, color: ROOM_COLORS[1], zIndex: 1, features: [], locked: false },
    ];
    
  const { state: rooms, setState: setRooms, undo, redo, canUndo, canRedo } = useHistory(initialRooms);
  
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  
  const [mode, setMode] = useState<'select' | 'draw'>('select');
  
  const [actionState, setActionState] = useState<{
    type: 'none' | 'drawing' | 'moving' | 'resizing';
    startPoint?: Point;
    moveOffset?: Point;
    targetId?: string;
    isDragging?: boolean;
    handle?: ResizeHandle;
  }>({ type: 'none' });

  const [viewTransform, setViewTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [drawingPreview, setDrawingPreview] = useState<{start: Point, end: Point} | null>(null);

  const getMouseWorldPos = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - viewTransform.x) / viewTransform.scale;
    const y = (e.clientY - rect.top - viewTransform.y) / viewTransform.scale;
    return { x: x, y: y };
  }, [viewTransform]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) { 
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY };
        return;
    }
    
    const pos = getMouseWorldPos(e);
    
    if (mode === 'draw') {
      const startPoint = { x: snapToGrid(pos.x), y: snapToGrid(pos.y) };
      setActionState({ type: 'drawing', startPoint });
      setDrawingPreview({ start: startPoint, end: startPoint });
      setSelectedRoomId(null);
    } else {
      setSelectedRoomId(null);
      if (e.button === 0) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY };
      }
    }
  }, [mode, getMouseWorldPos]);

  const handleRoomMouseDown = useCallback((e: React.MouseEvent, room: Room) => {
    if (mode === 'draw' || room.locked) return;

    e.stopPropagation();
    if (e.button === 0) {
      const pos = getMouseWorldPos(e);
      setSelectedRoomId(room.id);
      setActionState({
        type: 'moving',
        targetId: room.id,
        isDragging: false,
        moveOffset: {
          x: pos.x - room.x,
          y: pos.y - room.y,
        },
      });
    }
  }, [mode, getMouseWorldPos]);
  
  const handleResizeStart = useCallback((e: React.MouseEvent, room: Room, handle: ResizeHandle) => {
      e.stopPropagation();
      if (mode !== 'select' || e.button !== 0 || room.locked) return;
      setActionState({
          type: 'resizing',
          targetId: room.id,
          isDragging: false,
          handle,
      });
  }, [mode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setViewTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        panStartRef.current = { x: e.clientX, y: e.clientY };
        return;
    }

    if (actionState.type === 'none') return;
    const pos = getMouseWorldPos(e);

    if (actionState.type === 'moving' && actionState.targetId && actionState.moveOffset) {
      if (!actionState.isDragging) {
         setActionState(s => ({...s, isDragging: true }));
      }
      setRooms(prevRooms => prevRooms.map(r => 
        r.id === actionState.targetId 
          ? { ...r, x: snapToGrid(pos.x - actionState.moveOffset!.x), y: snapToGrid(pos.y - actionState.moveOffset!.y) }
          : r
      ), true); // Overwrite history while dragging
    } else if (actionState.type === 'drawing') {
        const snappedEnd = { x: snapToGrid(pos.x), y: snapToGrid(pos.y) };
        setDrawingPreview(prev => prev ? { ...prev, end: snappedEnd } : null);
    } else if (actionState.type === 'resizing' && actionState.targetId && actionState.handle) {
      if (!actionState.isDragging) {
        setActionState(s => ({...s, isDragging: true }));
      }
      const snappedPos = { x: snapToGrid(pos.x), y: snapToGrid(pos.y) };

      setRooms(prevRooms => prevRooms.map(r => {
        if (r.id !== actionState.targetId) return r;
        
        let { x, y, width, height } = r;
        const right = x + width;
        const bottom = y + height;

        switch (actionState.handle) {
            case 'top-left':
                x = Math.min(snappedPos.x, right - GRID_SIZE);
                y = Math.min(snappedPos.y, bottom - GRID_SIZE);
                width = right - x;
                height = bottom - y;
                break;
            case 'top-right':
                y = Math.min(snappedPos.y, bottom - GRID_SIZE);
                width = Math.max(GRID_SIZE, snappedPos.x - x);
                height = bottom - y;
                break;
            case 'bottom-left':
                x = Math.min(snappedPos.x, right - GRID_SIZE);
                height = Math.max(GRID_SIZE, snappedPos.y - y);
                width = right - x;
                break;
            case 'bottom-right':
                width = Math.max(GRID_SIZE, snappedPos.x - x);
                height = Math.max(GRID_SIZE, snappedPos.y - y);
                break;
        }
        return { 
            ...r, 
            x: Math.round(x), 
            y: Math.round(y), 
            width: Math.round(width), 
            height: Math.round(height) 
        };
      }), true);
    }
  }, [actionState, isPanning, getMouseWorldPos, setRooms]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
        setIsPanning(false);
    }
    
    if (actionState.type === 'moving' && actionState.isDragging) {
        setRooms(rooms, false);
    }
    
    if (actionState.type === 'resizing' && actionState.isDragging) {
        setRooms(rooms, false);
    }

    if (actionState.type === 'drawing' && actionState.startPoint) {
      const endPoint = getMouseWorldPos(e);
      const snappedEnd = { x: snapToGrid(endPoint.x), y: snapToGrid(endPoint.y) };
      const startPoint = actionState.startPoint;
      const maxZ = rooms.length > 0 ? Math.max(...rooms.map(r => r.zIndex)) : -1;
      
      const newRoom: Room = {
        id: crypto.randomUUID(),
        name: `Room ${rooms.length + 1}`,
        x: Math.min(startPoint.x, snappedEnd.x),
        y: Math.min(startPoint.y, snappedEnd.y),
        width: Math.abs(startPoint.x - snappedEnd.x),
        height: Math.abs(startPoint.y - snappedEnd.y),
        color: ROOM_COLORS[rooms.length % ROOM_COLORS.length],
        zIndex: maxZ + 1,
        features: [],
        locked: false,
      };

      if (newRoom.width >= GRID_SIZE && newRoom.height >= GRID_SIZE) {
        setRooms(prev => [...prev, newRoom]);
        setSelectedRoomId(newRoom.id);
      }
      setDrawingPreview(null);
      setMode('select');
    }
    setActionState({ type: 'none' });
  }, [actionState, rooms, getMouseWorldPos, isPanning, setRooms]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = 1.1;
    const newScale = e.deltaY < 0 ? viewTransform.scale * zoomFactor : viewTransform.scale / zoomFactor;
    const clampedScale = Math.max(0.2, Math.min(newScale, 5));

    const worldX = (mouseX - viewTransform.x) / viewTransform.scale;
    const worldY = (mouseY - viewTransform.y) / viewTransform.scale;

    const newX = mouseX - worldX * clampedScale;
    const newY = mouseY - worldY * clampedScale;

    setViewTransform({ scale: clampedScale, x: newX, y: newY });
  }, [viewTransform]);
  
  const handleUpdateRoom = useCallback((id: string, newValues: Partial<Room>) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...newValues } : r));
  }, [setRooms]);

  const handleDeleteRoom = useCallback((id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
    setSelectedRoomId(null);
  }, [setRooms]);
  
  const handleSave = useCallback(() => {
    const data = JSON.stringify(rooms, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'home-plan.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [rooms]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') throw new Error("File content is not text");
        const loadedRooms = JSON.parse(text);

        if (Array.isArray(loadedRooms) && loadedRooms.every(r => 
          'id' in r && 'name' in r && 'x' in r && 'y' in r &&
          'width' in r && 'height' in r && 'color' in r && 'zIndex' in r
        )) {
          // ensure features array exists and all dimensions are integers
          const sanitizedRooms = loadedRooms.map((r: any) => ({ 
            ...r, 
            x: Math.round(r.x),
            y: Math.round(r.y),
            width: Math.round(r.width),
            height: Math.round(r.height),
            locked: r.locked || false,
            features: r.features?.map((f: WallFeature) => ({
                ...f,
                width: Math.round(f.width),
            })) || [] 
          }));
          setRooms(sanitizedRooms);
          setSelectedRoomId(null);
        } else {
          throw new Error("Invalid file format.");
        }
      } catch (error) {
        console.error("Failed to load or parse file:", error);
        alert("Could not load the plan. The file may be corrupted or in an incorrect format.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const triggerFileLoad = () => {
    fileInputRef.current?.click();
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  
  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (mode === 'draw') return 'crosshair';
    if (actionState.type === 'moving' && actionState.isDragging) return 'grabbing';
    if (mode === 'select' && !selectedRoomId) return 'grab';
    return 'default';
  }

  return (
    <div className="flex h-screen font-sans bg-gray-100 text-gray-800">
      <main className="flex-1 flex flex-col">
        <header className="flex items-center justify-between p-3 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center space-x-2">
            <Ruler className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-700">Home Plan Modeler</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handleSave} className="p-2 rounded-md bg-transparent hover:bg-gray-200 transition-colors" title="Save Plan"><Save className="h-5 w-5 text-gray-600" /></button>
            <button onClick={triggerFileLoad} className="p-2 rounded-md bg-transparent hover:bg-gray-200 transition-colors" title="Load Plan"><FolderOpen className="h-5 w-5 text-gray-600" /></button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button onClick={undo} disabled={!canUndo} className="p-2 rounded-md bg-transparent hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Undo"><Undo className="h-5 w-5 text-gray-600" /></button>
            <button onClick={redo} disabled={!canRedo} className="p-2 rounded-md bg-transparent hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Redo"><Redo className="h-5 w-5 text-gray-600" /></button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button onClick={() => setMode('select')} className={`p-2 rounded-md transition-colors ${mode === 'select' ? 'bg-blue-100 text-blue-600' : 'bg-transparent hover:bg-gray-200'}`} title="Select & Move Tool (V)"><Hand className="h-5 w-5"/></button>
            <button onClick={() => setMode('draw')} className={`p-2 rounded-md transition-colors ${mode === 'draw' ? 'bg-blue-100 text-blue-600' : 'bg-transparent hover:bg-gray-200'}`} title="Draw Room Tool (R)"><SquarePlus className="h-5 w-5"/></button>
          </div>
        </header>
        <div 
          className="flex-1 relative overflow-hidden bg-white"
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: getCursor() }}
        >
          <GridBackground transform={viewTransform} />
          
          <div 
            className="w-full h-full"
            style={{
                transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})`,
                transformOrigin: 'top left'
            }}
          >
            {rooms.map(room => (
              <RoomComponent 
                key={room.id}
                room={room}
                isSelected={room.id === selectedRoomId}
                onMouseDown={handleRoomMouseDown}
                onResizeStart={handleResizeStart}
              />
            ))}
            {drawingPreview && (
                <div
                    className="absolute border-2 border-dashed border-blue-500 bg-blue-500 bg-opacity-20 pointer-events-none"
                    style={{
                        left: Math.min(drawingPreview.start.x, drawingPreview.end.x),
                        top: Math.min(drawingPreview.start.y, drawingPreview.end.y),
                        width: Math.abs(drawingPreview.start.x - drawingPreview.end.x),
                        height: Math.abs(drawingPreview.start.y - drawingPreview.end.y),
                        zIndex: 10000,
                    }}
                />
            )}
          </div>
        </div>
      </main>
      <aside className="w-80 bg-white border-l border-gray-200 shadow-lg">
        <InspectorPanel 
          selectedRoom={selectedRoom}
          onUpdateRoom={handleUpdateRoom}
          onDeleteRoom={handleDeleteRoom}
          roomColors={ROOM_COLORS}
        />
      </aside>
    </div>
  );
};

export default App;