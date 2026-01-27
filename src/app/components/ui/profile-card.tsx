import * as React from "react"
import { cn } from "@/app/components/ui/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Textarea } from "@/app/components/ui/textarea"
import {
  User,
  Mail,
  Calendar,
  MapPin,
  Briefcase,
  Edit,
  Settings,
  LogOut,
  Loader2
} from "lucide-react"
import { UserUpdateRequest } from "@/lib/api"

export interface ProfileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string
  email?: string
  avatar?: string
  role?: string
  location?: string
  joinDate?: string
  bio?: string
  isLoading?: boolean
  onUpdateProfile?: (data: UserUpdateRequest) => Promise<void>
  stats?: {
    projects?: number
    likes?: number
    views?: number
  }
}

export function ProfileCard({
  className,
  name,
  email,
  avatar,
  role,
  location,
  joinDate,
  bio,
  isLoading = false,
  onUpdateProfile,
  stats = {
    projects: 0,
    likes: 0,
    views: 0,
  },
  ...props
}: ProfileCardProps) {
  const displayName = name || (isLoading ? "Loading..." : "Guest User");
  const displayEmail = email || (isLoading ? "loading email..." : "No email provided");
  const displayJoinDate = joinDate || (isLoading ? "..." : "Recently joined");
  const displayRole = role || "Developer";
  const displayLocation = location || "South Korea";
  const displayBio = bio || "3D modeling and motion control enthusiast.";

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [formData, setFormData] = React.useState<UserUpdateRequest>({
    nickname: name || "",
    region: location || "",
    job: role || "",
    description: bio || "",
  });

  // Update form data when props change
  React.useEffect(() => {
    setFormData({
      nickname: name || "",
      region: location || "",
      job: role || "",
      description: bio || "",
    });
  }, [name, location, role, bio]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id === "bio" ? "description" : id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateProfile) return;

    setIsUpdating(true);
    try {
      await onUpdateProfile(formData);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const initials = displayName
    .split(" ")
    .map((n) => n ? n[0] : "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  return (
    <div className={cn("w-full max-w-4xl mx-auto p-6", className)} {...props}>
      <Card className="overflow-hidden">
        {/* Header with gradient background */}
        <div className="h-32 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative">
          <div className="absolute bottom-0 left-6 transform translate-y-1/2">
            <Avatar className="h-24 w-24 border-4 border-background">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <CardHeader className="pt-16 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-3xl font-bold mb-2">{displayName}</CardTitle>
              <CardDescription className="text-base flex items-center gap-2 mb-4">
                <Briefcase className="h-4 w-4" />
                {displayRole}
              </CardDescription>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{displayEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{displayLocation}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {displayJoinDate}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isLoading || isUpdating}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>
                        Make changes to your profile here. Click save when you're done.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="nickname" className="text-right">
                          Nickname
                        </Label>
                        <Input
                          id="nickname"
                          value={formData.nickname}
                          onChange={handleInputChange}
                          className="col-span-3"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="job" className="text-right">
                          Job
                        </Label>
                        <Input
                          id="job"
                          value={formData.job}
                          onChange={handleInputChange}
                          placeholder="e.g. 3D Designer"
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="region" className="text-right">
                          Region
                        </Label>
                        <Input
                          id="region"
                          value={formData.region}
                          onChange={handleInputChange}
                          placeholder="e.g. Seoul, South Korea"
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="bio" className="text-right">
                          Bio
                        </Label>
                        <Textarea
                          id="bio"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Tell us about yourself"
                          className="col-span-3 resize-none"
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save changes
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" disabled={isLoading}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Bio */}
          <div>
            <h3 className="text-sm font-semibold mb-2">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {displayBio}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{stats.projects || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Projects</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{stats.likes || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Likes</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{stats.views || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Views</div>
            </div>
          </div>

          {/* Skills/Tags */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">3D Modeling</Badge>
              <Badge variant="secondary">GLB/GLTF</Badge>
              <Badge variant="secondary">Three.js</Badge>
              <Badge variant="secondary">Design</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
