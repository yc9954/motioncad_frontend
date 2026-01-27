import * as React from "react"
import { cn } from "@/app/components/ui/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Briefcase,
  Edit,
  Settings,
  LogOut
} from "lucide-react"

export interface ProfileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string
  email?: string
  avatar?: string
  role?: string
  location?: string
  joinDate?: string
  bio?: string
  stats?: {
    projects?: number
    likes?: number
    views?: number
  }
}

export function ProfileCard({
  className,
  name = "John Doe",
  email = "john@example.com",
  avatar,
  role = "3D Designer",
  location = "Seoul, South Korea",
  joinDate = "January 2024",
  bio = "Passionate about 3D modeling and design. Creating amazing 3D worlds one model at a time.",
  stats = {
    projects: 12,
    likes: 234,
    views: 1234,
  },
  ...props
}: ProfileCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

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
              <CardTitle className="text-3xl font-bold mb-2">{name}</CardTitle>
              <CardDescription className="text-base flex items-center gap-2 mb-4">
                <Briefcase className="h-4 w-4" />
                {role}
              </CardDescription>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {joinDate}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="outline" size="sm">
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
            <p className="text-sm text-muted-foreground leading-relaxed">{bio}</p>
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
