/// <reference types="vite/client" />

declare module 'lucide-react' {
  import * as React from 'react'
  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string
    strokeWidth?: number | string
    absoluteStrokeWidth?: boolean
  }
  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<SVGSVGElement>
  >

  export const Sparkles: LucideIcon
  export const Download: LucideIcon
  export const Check: LucideIcon
  export const Cpu: LucideIcon
  export const Heading2: LucideIcon
  export const Heading3: LucideIcon
  export const Bold: LucideIcon
  export const List: LucideIcon
  export const Quote: LucideIcon
  export const Table: LucideIcon
  export const Eye: LucideIcon
  export const Edit3: LucideIcon
  export const Plus: LucideIcon
  export const Wand2: LucideIcon
  export const ExternalLink: LucideIcon
  export const AlertCircle: LucideIcon
  export const X: LucideIcon
  export const ArrowRight: LucideIcon
  export const Loader2: LucideIcon
  export const Hash: LucideIcon
  export const HelpCircle: LucideIcon
  export const Activity: LucideIcon
  export const PanelLeftClose: LucideIcon
  export const PanelLeftOpen: LucideIcon
  export const PanelRightClose: LucideIcon
  export const PanelRightOpen: LucideIcon
  export const ListTree: LucideIcon
  export const FileText: LucideIcon
  export const RefreshCw: LucideIcon
  export const Scale: LucideIcon
  export const BarChart2: LucideIcon
  export const Grid3X3: LucideIcon
  export const Search: LucideIcon
  export const ChevronDown: LucideIcon
  export const CheckCircle2: LucideIcon
  export const Copy: LucideIcon
  export const ArrowUpDown: LucideIcon
  export const CheckSquare: LucideIcon
  export const Square: LucideIcon
  export const User: LucideIcon
  export const Mail: LucideIcon
  export const Lock: LucideIcon
  export const Briefcase: LucideIcon
  export const FolderClosed: LucideIcon
  export const FilePlus: LucideIcon
  export const Trash2: LucideIcon
  export const Clock: LucideIcon
  export const Database: LucideIcon
  export const Save: LucideIcon
  export const Settings: LucideIcon
  export const LogOut: LucideIcon
  export const Users: LucideIcon
  export const Image: LucideIcon
  export const MoreHorizontal: LucideIcon
  export const FileCheck: LucideIcon
  export const Compass: LucideIcon
  export const BookOpen: LucideIcon
  export const BarChart3: LucideIcon
  export const Layers: LucideIcon
  export const Globe: LucideIcon
  export const SlidersHorizontal: LucideIcon
  export const Flame: LucideIcon
  export const Award: LucideIcon
  export const ChevronRight: LucideIcon
  export const TrendingUp: LucideIcon
  export const AlertTriangle: LucideIcon
}


