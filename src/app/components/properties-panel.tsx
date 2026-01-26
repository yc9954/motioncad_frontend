import { Trash2, Settings, Move3d, RotateCw, Maximize } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Slider } from '@/app/components/ui/slider';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Separator } from '@/app/components/ui/separator';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import type { Part } from './parts-library';

interface TransformValues {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
}

interface PropertiesPanelProps {
  selectedPart: Part | null;
  transform: TransformValues;
  onTransformChange: (transform: TransformValues) => void;
  onDelete: () => void;
}

export function PropertiesPanel({
  selectedPart,
  transform,
  onTransformChange,
  onDelete,
}: PropertiesPanelProps) {
  const updatePosition = (axis: 'x' | 'y' | 'z', value: number) => {
    onTransformChange({
      ...transform,
      position: { ...transform.position, [axis]: value },
    });
  };

  const updateRotation = (axis: 'x' | 'y' | 'z', value: number) => {
    onTransformChange({
      ...transform,
      rotation: { ...transform.rotation, [axis]: value },
    });
  };

  const updateScale = (value: number) => {
    onTransformChange({
      ...transform,
      scale: value,
    });
  };

  if (!selectedPart) {
    return (
      <div className="w-80 bg-[#1a1b26]/80 backdrop-blur-xl border-l border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#00d4ff]" />
            <h2 className="text-white font-semibold">Properties</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-[#16171f] rounded-full flex items-center justify-center border border-white/5">
              <Settings className="w-10 h-10 text-gray-700" />
            </div>
            <p className="text-gray-500 text-sm mb-2">No Part Selected</p>
            <p className="text-gray-600 text-xs">
              Select a part from the library or click on an object in the viewport
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[#1a1b26]/80 backdrop-blur-xl border-l border-white/5 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#00d4ff]" />
          <h2 className="text-white font-semibold">Properties</h2>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Part Preview */}
          <div className="space-y-2">
            <Label className="text-gray-400 text-xs">Selected Part</Label>
            <div className="w-full aspect-square bg-[#16171f] rounded-xl flex items-center justify-center border border-white/5">
              <div className="text-7xl">{selectedPart.thumbnail}</div>
            </div>
            <p className="text-center text-white font-medium">{selectedPart.name}</p>
            <p className="text-center text-xs text-gray-600 capitalize">{selectedPart.category}</p>
          </div>

          <Separator className="bg-white/5" />

          {/* Position Controls */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Move3d className="w-4 h-4 text-[#00d4ff]" />
              <Label className="font-medium">Position</Label>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-500">X Axis</Label>
                  <Input
                    type="number"
                    value={transform.position.x.toFixed(1)}
                    onChange={(e) => updatePosition('x', parseFloat(e.target.value) || 0)}
                    className="w-16 h-7 bg-[#16171f] border-white/5 text-white text-xs text-right"
                  />
                </div>
                <Slider
                  value={[transform.position.x]}
                  onValueChange={([value]) => updatePosition('x', value)}
                  min={-10}
                  max={10}
                  step={0.1}
                  className="[&_[role=slider]]:bg-[#00d4ff] [&_[role=slider]]:border-[#00d4ff] [&_.bg-primary]:bg-[#00d4ff]/20"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-500">Y Axis</Label>
                  <Input
                    type="number"
                    value={transform.position.y.toFixed(1)}
                    onChange={(e) => updatePosition('y', parseFloat(e.target.value) || 0)}
                    className="w-16 h-7 bg-[#16171f] border-white/5 text-white text-xs text-right"
                  />
                </div>
                <Slider
                  value={[transform.position.y]}
                  onValueChange={([value]) => updatePosition('y', value)}
                  min={-10}
                  max={10}
                  step={0.1}
                  className="[&_[role=slider]]:bg-[#00d4ff] [&_[role=slider]]:border-[#00d4ff] [&_.bg-primary]:bg-[#00d4ff]/20"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-500">Z Axis</Label>
                  <Input
                    type="number"
                    value={transform.position.z.toFixed(1)}
                    onChange={(e) => updatePosition('z', parseFloat(e.target.value) || 0)}
                    className="w-16 h-7 bg-[#16171f] border-white/5 text-white text-xs text-right"
                  />
                </div>
                <Slider
                  value={[transform.position.z]}
                  onValueChange={([value]) => updatePosition('z', value)}
                  min={-10}
                  max={10}
                  step={0.1}
                  className="[&_[role=slider]]:bg-[#00d4ff] [&_[role=slider]]:border-[#00d4ff] [&_.bg-primary]:bg-[#00d4ff]/20"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-white/5" />

          {/* Rotation Controls */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <RotateCw className="w-4 h-4 text-[#00d4ff]" />
              <Label className="font-medium">Rotation</Label>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-500">X Axis</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={transform.rotation.x}
                      onChange={(e) => updateRotation('x', parseInt(e.target.value) || 0)}
                      className="w-12 h-7 bg-[#16171f] border-white/5 text-white text-xs text-right"
                    />
                    <span className="text-xs text-gray-600">°</span>
                  </div>
                </div>
                <Slider
                  value={[transform.rotation.x]}
                  onValueChange={([value]) => updateRotation('x', value)}
                  min={0}
                  max={360}
                  step={1}
                  className="[&_[role=slider]]:bg-[#00d4ff] [&_[role=slider]]:border-[#00d4ff] [&_.bg-primary]:bg-[#00d4ff]/20"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-500">Y Axis</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={transform.rotation.y}
                      onChange={(e) => updateRotation('y', parseInt(e.target.value) || 0)}
                      className="w-12 h-7 bg-[#16171f] border-white/5 text-white text-xs text-right"
                    />
                    <span className="text-xs text-gray-600">°</span>
                  </div>
                </div>
                <Slider
                  value={[transform.rotation.y]}
                  onValueChange={([value]) => updateRotation('y', value)}
                  min={0}
                  max={360}
                  step={1}
                  className="[&_[role=slider]]:bg-[#00d4ff] [&_[role=slider]]:border-[#00d4ff] [&_.bg-primary]:bg-[#00d4ff]/20"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-500">Z Axis</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={transform.rotation.z}
                      onChange={(e) => updateRotation('z', parseInt(e.target.value) || 0)}
                      className="w-12 h-7 bg-[#16171f] border-white/5 text-white text-xs text-right"
                    />
                    <span className="text-xs text-gray-600">°</span>
                  </div>
                </div>
                <Slider
                  value={[transform.rotation.z]}
                  onValueChange={([value]) => updateRotation('z', value)}
                  min={0}
                  max={360}
                  step={1}
                  className="[&_[role=slider]]:bg-[#00d4ff] [&_[role=slider]]:border-[#00d4ff] [&_.bg-primary]:bg-[#00d4ff]/20"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-white/5" />

          {/* Scale Control */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Maximize className="w-4 h-4 text-[#00d4ff]" />
              <Label className="font-medium">Scale</Label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-500">Size</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={transform.scale}
                    onChange={(e) => updateScale(parseInt(e.target.value) || 100)}
                    className="w-14 h-7 bg-[#16171f] border-white/5 text-white text-xs text-right"
                  />
                  <span className="text-xs text-gray-600">%</span>
                </div>
              </div>
              <Slider
                value={[transform.scale]}
                onValueChange={([value]) => updateScale(value)}
                min={10}
                max={300}
                step={5}
                className="[&_[role=slider]]:bg-[#00d4ff] [&_[role=slider]]:border-[#00d4ff] [&_.bg-primary]:bg-[#00d4ff]/20"
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Delete Button */}
      <div className="p-4 border-t border-white/5">
        <Button
          onClick={onDelete}
          variant="destructive"
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 h-9"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Part
        </Button>
      </div>
    </div>
  );
}

export type { TransformValues };