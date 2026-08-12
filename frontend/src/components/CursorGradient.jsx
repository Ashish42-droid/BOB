import React, { useEffect, useState } from 'react';

export default function CursorGradient() {
  const [position, setPosition] = useState({ x: -500, y: -500 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
      style={{
        background: `radial-gradient(650px circle at ${position.x}px ${position.y}px, rgba(6, 182, 212, 0.12), rgba(16, 185, 129, 0.08) 40%, rgba(15, 23, 42, 0) 80%)`
      }}
    />
  );
}
