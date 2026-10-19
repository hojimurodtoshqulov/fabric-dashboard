import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface LogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function Logo({ size = 36, className, priority }: LogoProps) {
  return (
    <Image
      src="/images/logo.png"
      alt="Selxozmash Textile"
      width={size}
      height={size}
      priority={priority}
      className={cn("flex-shrink-0 select-none", className)}
    />
  );
}
