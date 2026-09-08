import { Mail, Globe, Link as LinkIcon } from "lucide-react";
import type { SocialLink } from "@/lib/db/schema";
import { GithubIcon, LinkedinIcon, TwitterIcon } from "./brand-icons";

const ICONS: Record<
  SocialLink["platform"],
  React.ComponentType<{ className?: string }>
> = {
  GITHUB: GithubIcon,
  LINKEDIN: LinkedinIcon,
  TWITTER: TwitterIcon,
  EMAIL: Mail,
  WEBSITE: Globe,
  OTHER: LinkIcon,
};

export function SocialIcon({
  platform,
  className,
}: {
  platform: SocialLink["platform"];
  className?: string;
}) {
  const Icon = ICONS[platform];
  return <Icon className={className} />;
}
