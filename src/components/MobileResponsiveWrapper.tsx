import React from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
  mobileClassName?: string;
  desktopClassName?: string;
}

/**
 * Wrapper component for mobile-responsive layouts
 * Applies different styles based on screen size
 */
export const MobileResponsiveWrapper: React.FC<MobileResponsiveWrapperProps> = ({
  children,
  className,
  mobileClassName = '',
  desktopClassName = ''
}) => {
  const isMobile = useIsMobile();
  
  return (
    <div className={cn(
      className,
      isMobile ? mobileClassName : desktopClassName
    )}>
      {children}
    </div>
  );
};

/**
 * Component that only renders on mobile
 */
export const MobileOnly: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => {
  const isMobile = useIsMobile();
  
  if (!isMobile) return null;
  
  return <div className={className}>{children}</div>;
};

/**
 * Component that only renders on desktop
 */
export const DesktopOnly: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => {
  const isMobile = useIsMobile();
  
  if (isMobile) return null;
  
  return <div className={className}>{children}</div>;
};

/**
 * Responsive grid that adapts columns based on screen size
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  mobileCols?: 1 | 2;
  tabletCols?: 2 | 3;
  desktopCols?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  mobileCols = 1,
  tabletCols = 2,
  desktopCols = 3,
  gap = 'md'
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const mobileColClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2'
  };

  const tabletColClasses = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3'
  };

  const desktopColClasses = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4'
  };

  return (
    <div className={cn(
      'grid',
      mobileColClasses[mobileCols],
      tabletColClasses[tabletCols],
      desktopColClasses[desktopCols],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
};

/**
 * Responsive container with proper padding and max-width
 */
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  maxWidth = 'xl',
  padding = true
}) => {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full'
  };

  return (
    <div className={cn(
      'mx-auto w-full',
      maxWidthClasses[maxWidth],
      padding && 'px-4 sm:px-6 lg:px-8',
      className
    )}>
      {children}
    </div>
  );
};

/**
 * Responsive stack that changes direction based on screen size
 */
interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  mobileDirection?: 'column' | 'row';
  desktopDirection?: 'column' | 'row';
  gap?: 'sm' | 'md' | 'lg';
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  className,
  mobileDirection = 'column',
  desktopDirection = 'row',
  gap = 'md',
  alignItems = 'start'
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  };

  return (
    <div className={cn(
      'flex',
      mobileDirection === 'column' ? 'flex-col' : 'flex-row',
      desktopDirection === 'row' ? 'md:flex-row' : 'md:flex-col',
      gapClasses[gap],
      alignClasses[alignItems],
      className
    )}>
      {children}
    </div>
  );
};

export default {
  MobileResponsiveWrapper,
  MobileOnly,
  DesktopOnly,
  ResponsiveGrid,
  ResponsiveContainer,
  ResponsiveStack
};
