import {
  FlaskConical,
  BookOpen,
  PenLine,
  BarChart3,
  Briefcase,
  Calendar,
  Users,
  Baby,
  Home,
  Mail,
  FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const projectIconMap: Record<string, LucideIcon> = {
  flask: FlaskConical,
  book: BookOpen,
  pen: PenLine,
  chart: BarChart3,
  briefcase: Briefcase,
  calendar: Calendar,
  users: Users,
  baby: Baby,
  home: Home,
  mail: Mail,
  file: FileText,
}

export function getProjectIcon(icon?: string): LucideIcon {
  return projectIconMap[icon ?? 'flask'] ?? FlaskConical
}
