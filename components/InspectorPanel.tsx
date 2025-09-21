import React from 'react';
import type { Room, WallFeature } from '../types';
import { Edit3, Trash2, Maximize, Palette, Layers, DoorOpen, Wind, Lock, Unlock } from 'lucide-react';

interface InspectorPanelProps {
  selectedRoom: Room | undefined;
  onUpdateRoom: (id: string, newValues: Partial<Room>) => void;
  onDeleteRoom: (id: string) => void;
  roomColors: string[];
}

const FeatureEditor: React.FC<{
    feature: WallFeature;
    onUpdateFeature: (updatedFeature: WallFeature) => void;
    onDeleteFeature: (featureId: string) => void;
    roomLocked: boolean;
}> = ({ feature, onUpdateFeature, onDeleteFeature, roomLocked }) => {
    
    const handleFeatureChange = (key: keyof WallFeature, value: any) => {
        let processedValue = value;
        if (key === 'width') {
            processedValue = parseInt(value, 10);
            if (isNaN(processedValue)) processedValue = 0;
        } else if (key === 'position') {
            processedValue = parseFloat(value);
            if (isNaN(processedValue)) processedValue = 0;
        }
        onUpdateFeature({ ...feature, [key]: processedValue });
    };

    return (
        <div className="p-3 bg-gray-100 rounded-lg border border-gray-200 space-y-3">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-sm capitalize flex items-center">
                    {feature.type === 'door' ? <DoorOpen className="w-4 h-4 mr-2"/> : <Wind className="w-4 h-4 mr-2"/>}
                    {feature.type}
                </h4>
                <button onClick={() => onDeleteFeature(feature.id)} className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-200" aria-label={`Delete ${feature.type}`}>
                    <Trash2 className="w-4 h-4"/>
                </button>
            </div>
            <fieldset disabled={roomLocked}>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor={`feature-wall-${feature.id}`} className="text-xs text-gray-500">Wall</label>
                        <select id={`feature-wall-${feature.id}`} value={feature.wall} onChange={e => handleFeatureChange('wall', e.target.value)} className="w-full text-sm p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-200">
                            <option value="top">Top</option>
                            <option value="bottom">Bottom</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor={`feature-width-${feature.id}`} className="text-xs text-gray-500">Width</label>
                        <input id={`feature-width-${feature.id}`} type="number" step="1" value={Math.round(feature.width)} onChange={e => handleFeatureChange('width', e.target.value)} className="w-full text-sm p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-200"/>
                    </div>
                </div>
                <div>
                    <label htmlFor={`feature-pos-${feature.id}`} className="text-xs text-gray-500">Position ({Math.round(feature.position * 100)}%)</label>
                    <input id={`feature-pos-${feature.id}`} type="range" min="0" max="1" step="0.01" value={feature.position} onChange={e => handleFeatureChange('position', e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:bg-gray-300"/>
                </div>
            </fieldset>
        </div>
    )
}


const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedRoom,
  onUpdateRoom,
  onDeleteRoom,
  roomColors,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedRoom) return;
    
    const { name, value } = e.target;
    let processedValue: string | number = value;

    if (e.target.type === 'number') {
      processedValue = value === '' ? 0 : parseInt(value, 10);
      if (isNaN(processedValue) || processedValue < 0) {
        processedValue = 0;
      }
    }
    
    onUpdateRoom(selectedRoom.id, { [name]: processedValue });
  };
  
  const handleAddFeature = (type: 'door' | 'window') => {
    if (!selectedRoom) return;
    const newFeature: WallFeature = {
        id: crypto.randomUUID(),
        type,
        wall: 'top',
        position: 0.5,
        width: type === 'door' ? 40 : 60,
    };
    onUpdateRoom(selectedRoom.id, { features: [...(selectedRoom.features || []), newFeature] });
  };

  const handleUpdateFeature = (updatedFeature: WallFeature) => {
    if (!selectedRoom) return;
    const updatedFeatures = selectedRoom.features.map(f => f.id === updatedFeature.id ? updatedFeature : f);
    onUpdateRoom(selectedRoom.id, { features: updatedFeatures });
  };

  const handleDeleteFeature = (featureId: string) => {
    if (!selectedRoom) return;
    const updatedFeatures = selectedRoom.features.filter(f => f.id !== featureId);
    onUpdateRoom(selectedRoom.id, { features: updatedFeatures });
  };
  
  const handleToggleLock = () => {
      if(!selectedRoom) return;
      onUpdateRoom(selectedRoom.id, { locked: !selectedRoom.locked });
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700">Properties</h2>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {selectedRoom ? (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="name" className="flex items-center text-sm font-medium text-gray-600">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Room Name
                </label>
                <button 
                  onClick={handleToggleLock}
                  className={`p-2 rounded-md transition-colors ${selectedRoom.locked ? 'bg-blue-100 text-blue-600' : 'bg-transparent hover:bg-gray-200'}`}
                  title={selectedRoom.locked ? 'Unlock Room' : 'Lock Room Position'}
                  aria-label={selectedRoom.locked ? 'Unlock room position' : 'Lock room position'}
                >
                  {selectedRoom.locked ? <Lock className="h-4 w-4"/> : <Unlock className="h-4 w-4"/>}
                </button>
              </div>
              <input
                type="text"
                id="name"
                name="name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                value={selectedRoom.name}
                onChange={handleInputChange}
              />
            </div>
            
            <div>
                <label className="flex items-center text-sm font-medium text-gray-600 mb-2">
                    <Maximize className="w-4 h-4 mr-2" />
                    Dimensions
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="width" className="block text-xs text-gray-500 mb-1">Width</label>
                        <div className="relative">
                            <input
                                type="number"
                                id="width"
                                name="width"
                                className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                                value={Math.round(selectedRoom.width)}
                                onChange={handleInputChange}
                                min="0"
                                step="1"
                                disabled={selectedRoom.locked}
                            />
                            <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-400">units</span>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="height" className="block text-xs text-gray-500 mb-1">Height</label>
                        <div className="relative">
                            <input
                                type="number"
                                id="height"
                                name="height"
                                className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                                value={Math.round(selectedRoom.height)}
                                onChange={handleInputChange}
                                min="0"
                                step="1"
                                disabled={selectedRoom.locked}
                            />
                             <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-400">units</span>
                        </div>
                    </div>
                </div>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-600 mb-2">
                  <Palette className="w-4 h-4 mr-2" />
                  Color
              </label>
              <div className="flex flex-wrap gap-2">
                {roomColors.map(color => (
                  <button
                    key={color}
                    onClick={() => onUpdateRoom(selectedRoom.id, { color })}
                    className={`w-8 h-8 rounded-full border-2 transition-transform transform hover:scale-110 ${
                      selectedRoom.color === color 
                        ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-1' 
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Set color to ${color}`}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <label htmlFor="zIndex" className="flex items-center text-sm font-medium text-gray-600 mb-1">
                <Layers className="w-4 h-4 mr-2" />
                Stacking Layer
              </label>
              <input
                type="number"
                id="zIndex"
                name="zIndex"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                value={selectedRoom.zIndex}
                onChange={handleInputChange}
                min="0"
                disabled={selectedRoom.locked}
              />
            </div>
            
            <div className="border-t border-gray-200 pt-4">
                <label className="flex items-center text-sm font-medium text-gray-600 mb-2">
                    Features
                </label>
                <div className="space-y-3 mb-4">
                    {selectedRoom.features?.length > 0 ? (
                        selectedRoom.features.map(feature => (
                            <FeatureEditor 
                                key={feature.id}
                                feature={feature}
                                onUpdateFeature={handleUpdateFeature}
                                onDeleteFeature={handleDeleteFeature}
                                roomLocked={!!selectedRoom.locked}
                            />
                        ))
                    ) : (
                        <p className="text-xs text-gray-500 text-center py-2">No doors or windows added.</p>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleAddFeature('door')} className="flex items-center justify-center text-sm p-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors">
                        <DoorOpen className="w-4 h-4 mr-2"/> Add Door
                    </button>
                    <button onClick={() => handleAddFeature('window')} className="flex items-center justify-center text-sm p-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors">
                        <Wind className="w-4 h-4 mr-2"/> Add Window
                    </button>
                </div>
            </div>


          </div>
        ) : (
          <div className="text-center text-gray-500 mt-8">
            <p>Select a room to see its properties.</p>
            <p className="mt-2 text-sm">Or use the <span className="font-semibold">Draw Room</span> tool to create a new one.</p>
          </div>
        )}
      </div>
      {selectedRoom && (
        <div className="p-4 mt-auto border-t border-gray-200">
          <button
            onClick={() => onDeleteRoom(selectedRoom.id)}
            className="w-full flex items-center justify-center px-4 py-2 bg-red-500 text-white font-semibold rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Room
          </button>
        </div>
      )}
    </div>
  );
};

export default InspectorPanel;