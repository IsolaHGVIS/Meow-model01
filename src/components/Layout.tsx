
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Cat, PawPrint, Settings, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [showPawPrint, setShowPawPrint] = useState(false);
  const [pawPosition, setPawPosition] = useState({ x: 0, y: 0 });
  
  const navItems = [
    { path: '/', label: 'Translate', icon: <PawPrint size={20} /> },
    { path: '/profile', label: 'Profile', icon: <UserRound size={20} /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  ];
  
  const handleMouseMove = (e: React.MouseEvent) => {
    // Only show paw prints occasionally when moving
    if (Math.random() > 0.95) {
      setPawPosition({ x: e.clientX, y: e.clientY });
      setShowPawPrint(true);
      
      setTimeout(() => {
        setShowPawPrint(false);
      }, 2000);
    }
  };
  
  return (
    <div 
      className="min-h-screen flex flex-col bg-background"
      onMouseMove={handleMouseMove}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 max-w-screen-lg items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Cat className="h-7 w-7 text-meow-pink animate-paw-wave" />
            <span className="font-bold text-xl">MeowMatic</span>
          </Link>
          
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "paw-nav-item",
                  location.pathname === item.path && "paw-nav-item-active"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 paw-container">
        {children}
      </main>
      
      {/* Mobile navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-md border-t">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center py-3 px-5",
                location.pathname === item.path ? "text-meow-pink" : "text-muted-foreground"
              )}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      
      {/* Paw print trail animation */}
      {showPawPrint && (
        <div 
          className="fixed pointer-events-none z-50 paw-print-trail"
          style={{ 
            left: pawPosition.x - 10, 
            top: pawPosition.y - 10,
          }}
        >
          <PawPrint 
            size={20} 
            className="text-meow-pink/30" 
          />
        </div>
      )}
    </div>
  );
};

export default Layout;
