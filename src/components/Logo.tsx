import React from 'react';
import logoSvgUrl from '../assets/53M.svg';
import logoPngUrl from '../assets/53MFINAL.png';

interface LogoProps {
  className?: string;
  variant?: 'svg' | 'png';
  alt?: string;
}

export function Logo({ className = "h-8", variant = 'svg', alt = "53&M Restaurante Terraza" }: LogoProps) {
  const logoSrc = variant === 'png' ? logoPngUrl : logoSvgUrl;

  return (
    <img 
      src={logoSrc} 
      alt={alt} 
      className={`object-contain inline-block transition-all ${className}`}
    />
  );
}

export function LogoPng(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="png" />;
}

export function LogoSvg(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="svg" />;
}

