import {
  BarChart3,
  BriefcaseBusiness,
  Code2,
  Crown,
  Headphones,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  Palette,
  Megaphone,
  Handshake,
  Calculator,
  ClipboardCheck,
  Wrench,
  PackageSearch,
  FlaskConical,
} from "lucide-react";
import { defaultRoleIcon, roleColor } from "@/constants/roles";

const icons = {
  crown: Crown,
  shield: ShieldCheck,
  users: UsersRound,
  briefcase: BriefcaseBusiness,
  code: Code2,
  chart: BarChart3,
  headset: Headphones,
  review: UserRoundCheck,
  design: Palette,
  marketing: Megaphone,
  sales: Handshake,
  finance: Calculator,
  quality: ClipboardCheck,
  operations: Wrench,
  product: PackageSearch,
  research: FlaskConical,
};

export default function RoleIcon({ role, size = 18, style, ...props }) {
  const Icon = icons[defaultRoleIcon(role)] || UserRoundCheck;
  return <Icon aria-hidden="true" size={size} style={{ color: roleColor(role), ...style }} {...props} />;
}
