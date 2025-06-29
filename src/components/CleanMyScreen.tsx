import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Sparkles } from 'lucide-react';

interface CleanMyScreenProps {}

const CleanMyScreen: React.FC<CleanMyScreenProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cleanPercentage, setCleanPercentage] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Initialize canvas dimensions
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Initialize dirt overlay
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Create dirt overlay with multiple layers
    drawDirtOverlay(ctx, dimensions.width, dimensions.height);
  }, [dimensions]);

  // Initialize mask canvas
  useEffect(() => {
    if (!maskCanvasRef.current || dimensions.width === 0) return;

    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    maskCanvas.width = dimensions.width;
    maskCanvas.height = dimensions.height;

    // Clear mask canvas
    maskCtx.clearRect(0, 0, dimensions.width, dimensions.height);
  }, [dimensions]);

  const drawDirtOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Base dirt layer
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(40, 40, 40, 0.85)');
    gradient.addColorStop(0.3, 'rgba(60, 55, 50, 0.9)');
    gradient.addColorStop(0.7, 'rgba(45, 45, 45, 0.88)');
    gradient.addColorStop(1, 'rgba(35, 35, 35, 0.92)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add texture with random spots
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 30 + 5;
      const opacity = Math.random() * 0.3 + 0.1;

      const spotGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      spotGradient.addColorStop(0, `rgba(20, 20, 20, ${opacity})`);
      spotGradient.addColorStop(1, 'transparent');

      ctx.fillStyle = spotGradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add smudge patterns
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const width_smudge = Math.random() * 80 + 20;
      const height_smudge = Math.random() * 20 + 5;
      const opacity = Math.random() * 0.4 + 0.2;

      ctx.fillStyle = `rgba(25, 25, 25, ${opacity})`;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillRect(-width_smudge/2, -height_smudge/2, width_smudge, height_smudge);
      ctx.restore();
    }
  };

  const getEventPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

 const drawCleanPath = useCallback((x: number, y: number) => {
  if (!maskCanvasRef.current || !canvasRef.current) return;

  const maskCtx = maskCanvasRef.current.getContext('2d');
  const ctx = canvasRef.current.getContext('2d');
  if (!maskCtx || !ctx) return;

  const radius = 80; // 👈 adjust this value as needed

  // Draw to mask
  maskCtx.globalCompositeOperation = 'source-over';
  maskCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  maskCtx.beginPath();
  maskCtx.arc(x, y, radius, 0, Math.PI * 2);
  maskCtx.fill();

  // Draw to main canvas with gradient
  ctx.globalCompositeOperation = 'destination-out';
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
}, []);


  const calculateCleanPercentage = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;
    let totalPixels = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      totalPixels++;
      if (pixels[i + 3] < 50) { // Alpha channel less than 50
        transparentPixels++;
      }
    }

    const percentage = Math.round((transparentPixels / totalPixels) * 100);
    setCleanPercentage(percentage);

    if (percentage >= 85 && !isComplete) {
      setIsComplete(true);
    }
  }, [isComplete]);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getEventPos(e);
    drawCleanPath(pos.x, pos.y);
  }, [getEventPos, drawCleanPath]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getEventPos(e);
    drawCleanPath(pos.x, pos.y);
    
    // Throttle percentage calculation
    if (Math.random() < 0.1) {
      calculateCleanPercentage();
    }
  }, [isDrawing, getEventPos, drawCleanPath, calculateCleanPercentage]);

  const handleEnd = useCallback(() => {
    setIsDrawing(false);
    calculateCleanPercentage();
  }, [calculateCleanPercentage]);

  const reset = useCallback(() => {
    if (!canvasRef.current || !maskCanvasRef.current) return;

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    if (ctx && maskCtx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      drawDirtOverlay(ctx, canvas.width, canvas.height);
    }

    setCleanPercentage(0);
    setIsComplete(false);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
  <div
    className={`absolute inset-0 bg-[url("data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.1%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")]`}
  ></div>
</div>

      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-pointer touch-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />

      {/* Mask canvas (hidden) */}
      <canvas
        ref={maskCanvasRef}
        className="absolute inset-0 pointer-events-none opacity-0"
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none w-full">
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute flex justify-center top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-10"
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
            <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              CleanMyScreen
            </h1>
          </div>
        </motion.div>

        {/* Progress indicator */}
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute top-6 right-6 pointer-events-auto z-10"
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
            <div className="text-sm font-medium text-gray-700">
              {cleanPercentage}% Clean
            </div>
            <div className="w-20 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${cleanPercentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>

        {/* Reset button */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-6 left-6 pointer-events-auto z-10"
        >
          <motion.button
            onClick={reset}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white/90 backdrop-blur-sm rounded-full p-4 shadow-lg hover:shadow-xl transition-shadow duration-200 text-gray-700 hover:text-gray-900"
          >
            <RotateCcw className="w-6 h-6" />
          </motion.button>
        </motion.div>

        {/* Bolt.new badge */}
        <motion.div 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-6 right-6 pointer-events-auto z-10"
        >
          <motion.a
            href="https://bolt.new"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="group bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 text-sm font-medium"
          >
            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-purple-500" />
            </div>
            <span className="group-hover:text-purple-100 transition-colors">
              Made with Bolt
            </span>
          </motion.a>
        </motion.div>

        {/* Instructions */}
        <AnimatePresence>
          {cleanPercentage === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto z-10"
            >
              <div className="bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
                <p className="text-sm text-gray-600">
                  Drag to clean the screen • Works with touch too!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion celebration */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-auto z-20"
            >
              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl text-center max-w-sm mx-4"
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 0.6,
                    repeat: Infinity,
                    repeatDelay: 2
                  }}
                  className="text-6xl mb-4"
                >
                  ✨
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Sparkling Clean!
                </h2>
                <p className="text-gray-600 mb-6">
                  Your screen is now {cleanPercentage}% clean!
                </p>
                <motion.button
                  onClick={reset}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-shadow duration-200"
                >
                  Clean Again
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  
  );
};

export default CleanMyScreen;