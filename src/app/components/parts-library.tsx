import { Search, TreeDeciduous, Building2, Car, Box } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Input } from '@/app/components/ui/input';
import { useState } from 'react';

interface Part {
  id: string;
  name: string;
  category: 'nature' | 'buildings' | 'vehicles' | 'props';
  thumbnail: string;
}

interface PartsLibraryProps {
  onPartSelect: (part: Part) => void;
}

const MOCK_PARTS: Part[] = [
  // Nature
  { id: 'n1', name: 'Oak Tree', category: 'nature', thumbnail: '🌳' },
  { id: 'n2', name: 'Pine Tree', category: 'nature', thumbnail: '🌲' },
  { id: 'n3', name: 'Bush', category: 'nature', thumbnail: '🌿' },
  { id: 'n4', name: 'Flower', category: 'nature', thumbnail: '🌸' },
  { id: 'n5', name: 'Rock', category: 'nature', thumbnail: '🪨' },
  { id: 'n6', name: 'Grass', category: 'nature', thumbnail: '🌱' },
  
  // Buildings
  { id: 'b1', name: 'House', category: 'buildings', thumbnail: '🏠' },
  { id: 'b2', name: 'Office', category: 'buildings', thumbnail: '🏢' },
  { id: 'b3', name: 'Castle', category: 'buildings', thumbnail: '🏰' },
  { id: 'b4', name: 'Barn', category: 'buildings', thumbnail: '🏚️' },
  { id: 'b5', name: 'Tower', category: 'buildings', thumbnail: '🗼' },
  { id: 'b6', name: 'Bridge', category: 'buildings', thumbnail: '🌉' },
  
  // Vehicles
  { id: 'v1', name: 'Car', category: 'vehicles', thumbnail: '🚗' },
  { id: 'v2', name: 'Truck', category: 'vehicles', thumbnail: '🚚' },
  { id: 'v3', name: 'Airplane', category: 'vehicles', thumbnail: '✈️' },
  { id: 'v4', name: 'Boat', category: 'vehicles', thumbnail: '⛵' },
  { id: 'v5', name: 'Train', category: 'vehicles', thumbnail: '🚂' },
  { id: 'v6', name: 'Bike', category: 'vehicles', thumbnail: '🚲' },
  
  // Props
  { id: 'p1', name: 'Bench', category: 'props', thumbnail: '🪑' },
  { id: 'p2', name: 'Lamp', category: 'props', thumbnail: '💡' },
  { id: 'p3', name: 'Mailbox', category: 'props', thumbnail: '📮' },
  { id: 'p4', name: 'Fence', category: 'props', thumbnail: '🚧' },
  { id: 'p5', name: 'Sign', category: 'props', thumbnail: '🪧' },
  { id: 'p6', name: 'Barrel', category: 'props', thumbnail: '🛢️' },
];

export function PartsLibrary({ onPartSelect }: PartsLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filterParts = (category: string) => {
    let filtered = MOCK_PARTS.filter(part => part.category === category);
    if (searchQuery) {
      filtered = filtered.filter(part =>
        part.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  };

  const PartCard = ({ part }: { part: Part }) => (
    <button
      onClick={() => onPartSelect(part)}
      className="bg-[#1e1f2e] rounded-xl p-3 hover:bg-[#242532] border border-white/5 hover:border-[#00d4ff]/50 hover:shadow-lg hover:shadow-[#00d4ff]/20 transition-all duration-300 flex flex-col items-center gap-2 group"
    >
      <div className="w-full aspect-square bg-[#16171f] rounded-lg flex items-center justify-center text-4xl group-hover:scale-105 transition-transform duration-200 border border-white/5">
        {part.thumbnail}
      </div>
      <span className="text-xs text-gray-400 text-center group-hover:text-gray-300">{part.name}</span>
    </button>
  );

  return (
    <div className="w-80 bg-[#1a1b26]/80 backdrop-blur-xl border-r border-white/5 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Box className="w-5 h-5 text-[#00d4ff]" />
          <h2 className="text-white font-semibold">Parts Library</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search parts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#16171f] border-white/5 text-white placeholder:text-gray-600 focus:border-[#00d4ff]/50 h-9"
          />
        </div>
      </div>

      {/* Categories Tabs */}
      <Tabs defaultValue="nature" className="flex-1 flex flex-col">
        <TabsList className="w-full bg-[#16171f]/50 border-b border-white/5 rounded-none p-0 h-11 grid grid-cols-4">
          <TabsTrigger
            value="nature"
            className="data-[state=active]:bg-transparent data-[state=active]:text-[#00d4ff] data-[state=active]:border-b-2 data-[state=active]:border-[#00d4ff] rounded-none text-gray-500 text-xs"
          >
            <TreeDeciduous className="w-3.5 h-3.5 mr-1" />
            Nature
          </TabsTrigger>
          <TabsTrigger
            value="buildings"
            className="data-[state=active]:bg-transparent data-[state=active]:text-[#00d4ff] data-[state=active]:border-b-2 data-[state=active]:border-[#00d4ff] rounded-none text-gray-500 text-xs"
          >
            <Building2 className="w-3.5 h-3.5 mr-1" />
            Buildings
          </TabsTrigger>
          <TabsTrigger
            value="vehicles"
            className="data-[state=active]:bg-transparent data-[state=active]:text-[#00d4ff] data-[state=active]:border-b-2 data-[state=active]:border-[#00d4ff] rounded-none text-gray-500 text-xs"
          >
            <Car className="w-3.5 h-3.5 mr-1" />
            Vehicles
          </TabsTrigger>
          <TabsTrigger
            value="props"
            className="data-[state=active]:bg-transparent data-[state=active]:text-[#00d4ff] data-[state=active]:border-b-2 data-[state=active]:border-[#00d4ff] rounded-none text-gray-500 text-xs"
          >
            <Box className="w-3.5 h-3.5 mr-1" />
            Props
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="nature" className="p-4 mt-0">
            <div className="grid grid-cols-2 gap-3">
              {filterParts('nature').map(part => (
                <PartCard key={part.id} part={part} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="buildings" className="p-4 mt-0">
            <div className="grid grid-cols-2 gap-3">
              {filterParts('buildings').map(part => (
                <PartCard key={part.id} part={part} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="vehicles" className="p-4 mt-0">
            <div className="grid grid-cols-2 gap-3">
              {filterParts('vehicles').map(part => (
                <PartCard key={part.id} part={part} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="props" className="p-4 mt-0">
            <div className="grid grid-cols-2 gap-3">
              {filterParts('props').map(part => (
                <PartCard key={part.id} part={part} />
              ))}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

export type { Part };