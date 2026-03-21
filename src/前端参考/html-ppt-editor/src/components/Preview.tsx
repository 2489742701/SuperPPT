import React, { useState, useEffect } from 'react';
import { useEditorStore, ElementAnimation } from '../store/useEditorStore';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const getAnimationProps = (animation?: ElementAnimation, baseOpacity: number = 1) => {
  if (!animation || animation.type === 'none') {
    return { initial: { opacity: baseOpacity }, animate: { opacity: baseOpacity } };
  }

  const transition = { duration: animation.duration, delay: animation.delay, ease: 'easeOut' };

  switch (animation.type) {
    case 'fadeIn':
      return { initial: { opacity: 0 }, animate: { opacity: baseOpacity }, transition };
    case 'slideInLeft':
      return { initial: { x: -100, opacity: 0 }, animate: { x: 0, opacity: baseOpacity }, transition };
    case 'slideInRight':
      return { initial: { x: 100, opacity: 0 }, animate: { x: 0, opacity: baseOpacity }, transition };
    case 'slideInUp':
      return { initial: { y: 100, opacity: 0 }, animate: { y: 0, opacity: baseOpacity }, transition };
    case 'slideInDown':
      return { initial: { y: -100, opacity: 0 }, animate: { y: 0, opacity: baseOpacity }, transition };
    case 'scaleIn':
      return { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: baseOpacity }, transition };
    default:
      return { initial: { opacity: baseOpacity }, animate: { opacity: baseOpacity } };
  }
};

export function Preview() {
  const { presentation, setPreview } = useEditorStore();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showEndScreen, setShowEndScreen] = useState(false);

  const currentSlide = presentation.slides[currentSlideIndex];
  const baseWidth = presentation.settings.baseWidth || 1200;
  const baseHeight = presentation.settings.baseHeight || 675;

  const handleNext = () => {
    if (currentSlideIndex === presentation.slides.length - 1) {
      setShowEndScreen(true);
    } else {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (showEndScreen) {
      setShowEndScreen(false);
    } else {
      setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreview(false);
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        if (showEndScreen) {
          setPreview(false);
        } else {
          handleNext();
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentation.slides.length, setPreview, showEndScreen, currentSlideIndex]);

  if (!currentSlide && !showEndScreen) return null;

  const handleSlideClick = () => {
    if (showEndScreen) {
      setPreview(false);
      return;
    }
    if (presentation.settings.advanceMode === 'click') {
      handleNext();
    }
  };

  const handleButtonClick = (e: React.MouseEvent, action?: string) => {
    e.stopPropagation();
    if (action === 'prev') {
      handlePrev();
    } else if (action === 'url') {
      // Handled by link wrapper if present
    } else {
      handleNext();
    }
  };

  const slideHeight = currentSlide?.height || baseHeight;
  const isScrollable = slideHeight > baseHeight;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden">
      <button
        onClick={() => setPreview(false)}
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-50 p-2 bg-black/50 rounded-full"
      >
        <X size={24} />
      </button>

      {showEndScreen ? (
        <div 
          className="flex flex-col items-center justify-center text-white cursor-pointer select-none"
          onClick={() => setPreview(false)}
        >
          <motion.h1 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-8xl font-bold mb-4"
          >
            尾页
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.5 }}
            className="text-xl"
          >
            单击关闭演示文稿
          </motion.p>
        </div>
      ) : (
        <div
          className={`relative bg-white shadow-2xl ${isScrollable ? 'overflow-y-auto' : 'overflow-hidden'}`}
          style={{
            width: `${baseWidth}px`,
            height: `${Math.min(slideHeight, window.innerHeight / (Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight) * 0.95))}px`,
            maxHeight: `${slideHeight}px`,
            transform: `scale(${Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight) * 0.95})`,
            transformOrigin: 'center center',
          }}
          onClick={handleSlideClick}
        >
          <div style={{ width: baseWidth, height: slideHeight, position: 'relative' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                {currentSlide.elements.map((el) => {
              const transformStyle = `rotate(${el.style.angle || 0}deg) scaleX(${el.style.scaleX || 1}) scaleY(${el.style.scaleY || 1}) skewX(${el.style.skewX || 0}deg) skewY(${el.style.skewY || 0}deg)`;
              
              const commonInnerStyle: React.CSSProperties = {
                width: '100%',
                height: '100%',
                transform: transformStyle,
                transformOrigin: 'top left',
                border: el.style.strokeWidth ? `${el.style.strokeWidth}px solid ${el.style.stroke || '#000'}` : 'none',
              };

              let content = null;

              if (el.type === 'textbox') {
                content = (
                  <div
                    style={{
                      ...commonInnerStyle,
                      fontSize: el.style.fontSize,
                      color: el.style.color,
                      backgroundColor: el.style.backgroundColor || 'transparent',
                      fontFamily: 'Inter, sans-serif',
                      whiteSpace: 'pre-wrap',
                      fontWeight: el.style.fontWeight || 'normal',
                      fontStyle: el.style.fontStyle || 'normal',
                      textDecoration: el.style.textDecoration || 'none',
                      textAlign: (el.style.textAlign as any) || 'left',
                      letterSpacing: el.style.letterSpacing ? `${el.style.letterSpacing / 1000}em` : 'normal',
                      lineHeight: el.style.lineHeight || 1.2,
                      border: 'none', // Text usually doesn't have border in this simple model
                    }}
                  >
                    {el.content}
                  </div>
                );
              } else if (el.type === 'shape') {
                if (el.shapeType === 'rectangle') {
                  content = (
                    <div
                      style={{
                        ...commonInnerStyle,
                        backgroundColor: el.style.fill,
                      }}
                    />
                  );
                } else if (el.shapeType === 'circle') {
                  content = (
                    <div
                      style={{
                        ...commonInnerStyle,
                        backgroundColor: el.style.fill,
                        borderRadius: '50%',
                      }}
                    />
                  );
                } else if (el.shapeType === 'triangle') {
                  content = (
                    <div
                      style={{
                        ...commonInnerStyle,
                        width: 0,
                        height: 0,
                        borderLeft: `${el.style.width / 2}px solid transparent`,
                        borderRight: `${el.style.width / 2}px solid transparent`,
                        borderBottom: `${el.style.height}px solid ${el.style.fill}`,
                        backgroundColor: 'transparent',
                        border: 'none', // Triangle border is handled by border-bottom
                      }}
                    />
                  );
                } else if (el.shapeType === 'line') {
                  content = (
                    <div
                      style={{
                        ...commonInnerStyle,
                        height: '4px',
                        backgroundColor: el.style.fill || '#000',
                        border: 'none',
                      }}
                    />
                  );
                } else if (el.shapeType === 'star') {
                  content = (
                    <div
                      style={{
                        ...commonInnerStyle,
                        backgroundColor: el.style.fill,
                        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                      }}
                    />
                  );
                }
              } else if (el.type === 'media' && el.mediaType === 'image' && el.content) {
                content = (
                  <img
                    src={el.content}
                    alt="Slide element"
                    style={{
                      ...commonInnerStyle,
                      objectFit: 'contain',
                    }}
                    referrerPolicy="no-referrer"
                  />
                );
              } else if (el.type === 'media' && el.mediaType === 'video' && el.content) {
                content = (
                  <video
                    src={el.content}
                    controls
                    style={{
                      ...commonInnerStyle,
                      objectFit: 'contain',
                    }}
                  />
                );
              } else if (el.type === 'media' && el.mediaType === 'audio' && el.content) {
                content = (
                  <audio
                    src={el.content}
                    controls
                    style={{
                      ...commonInnerStyle,
                    }}
                  />
                );
              } else if (el.type === 'table') {
                content = (
                  <table
                    style={{
                      ...commonInnerStyle,
                      borderCollapse: 'collapse',
                      backgroundColor: el.style.fill || '#f4f4f5',
                      border: `${el.style.strokeWidth || 1}px solid ${el.style.stroke || '#d4d4d8'}`,
                    }}
                  >
                    <tbody>
                      <tr>
                        <td style={{ border: `${el.style.strokeWidth || 1}px solid ${el.style.stroke || '#d4d4d8'}`, padding: '8px' }}>Cell 1</td>
                        <td style={{ border: `${el.style.strokeWidth || 1}px solid ${el.style.stroke || '#d4d4d8'}`, padding: '8px' }}>Cell 2</td>
                      </tr>
                      <tr>
                        <td style={{ border: `${el.style.strokeWidth || 1}px solid ${el.style.stroke || '#d4d4d8'}`, padding: '8px' }}>Cell 3</td>
                        <td style={{ border: `${el.style.strokeWidth || 1}px solid ${el.style.stroke || '#d4d4d8'}`, padding: '8px' }}>Cell 4</td>
                      </tr>
                    </tbody>
                  </table>
                );
              } else if (el.type === 'icon') {
                content = (
                  <div
                    style={{
                      ...commonInnerStyle,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: Math.min(el.style.width, el.style.height),
                      color: el.style.color || '#000000',
                    }}
                  >
                    😊
                  </div>
                );
              } else if (el.type === 'button') {
                content = (
                  <button
                    onClick={(e) => handleButtonClick(e, el.action)}
                    style={{
                      ...commonInnerStyle,
                      backgroundColor: el.style.fill,
                      color: el.style.color,
                      fontSize: el.style.fontSize,
                      fontFamily: 'Inter, sans-serif',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    {el.content}
                  </button>
                );
              }

              if (el.style.link) {
                if (el.style.link.startsWith('slide://')) {
                  const targetSlideId = el.style.link.replace('slide://', '');
                  const targetIndex = presentation.slides.findIndex(s => s.id === targetSlideId);
                  if (targetIndex !== -1) {
                    content = (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentSlideIndex(targetIndex);
                        }} 
                        style={{ display: 'block', width: '100%', height: '100%', cursor: 'pointer' }}
                      >
                        {content}
                      </div>
                    );
                  }
                } else {
                  content = (
                    <a href={el.style.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: 'block', width: '100%', height: '100%', textDecoration: 'none' }}>
                      {content}
                    </a>
                  );
                }
              }

              return (
                <motion.div
                  key={el.id}
                  layoutId={el.id}
                  {...getAnimationProps(el.animation, el.style.opacity ?? 1)}
                  style={{
                    position: 'absolute',
                    left: el.style.x,
                    top: el.style.y,
                    width: el.style.width,
                    height: el.style.height,
                  }}
                >
                  {content}
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 text-white px-4 py-2 rounded-full z-50">
        <button
          onClick={handlePrev}
          disabled={currentSlideIndex === 0}
          className="disabled:opacity-50 hover:text-gray-300"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-sm font-medium">
          {currentSlideIndex + 1} / {presentation.slides.length}
        </span>
        <button
          onClick={handleNext}
          disabled={currentSlideIndex === presentation.slides.length - 1}
          className="disabled:opacity-50 hover:text-gray-300"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}
