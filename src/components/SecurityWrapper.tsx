"use client";
import { useEffect } from 'react';

export default function SecurityWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const disabledEvents = ['contextmenu', 'copy', 'cut', 'paste', 'keydown', 'keypress'];
    
    const handleDisabled = (e: Event) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.ctrlKey && 
        ['u', 'c', 'v', 'x', 's', 'p', 'a', 'f'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
      if (e.key === 'F12') {
        e.preventDefault();
      }
    };

    disabledEvents.forEach(event => {
      if (event === 'keydown' || event === 'keypress') {
        document.addEventListener(event, handleKeyDown as EventListener);
      } else {
        document.addEventListener(event, handleDisabled);
      }
    });

    const style = document.createElement('style');
    style.textContent = `
      body { 
        -webkit-user-select: none; 
        -moz-user-select: none; 
        -ms-user-select: none; 
        user-select: none; 
      }
      input, textarea { 
        -webkit-user-select: text; 
        -moz-user-select: text; 
        -ms-user-select: text; 
        user-select: text; 
      }
    `;
    document.head.appendChild(style);

    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        document.body.style.display = 'none';
        document.documentElement.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui;text-align:center;padding:20px;"><div><h1 style="color:#333;">Access Denied</h1><p style="color:#666;">Developer tools are not allowed.</p></div></div>';
      }
    };

    const devToolsCheck = setInterval(detectDevTools, 1000);

    return () => {
      disabledEvents.forEach(event => {
        if (event === 'keydown' || event === 'keypress') {
          document.removeEventListener(event, handleKeyDown as EventListener);
        } else {
          document.removeEventListener(event, handleDisabled);
        }
      });
      document.head.removeChild(style);
      clearInterval(devToolsCheck);
    };
  }, []);

  return <>{children}</>;
}
