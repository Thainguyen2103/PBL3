import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const KanjiCanvas = forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawing = useRef(false);
  
  const traceRef = useRef([]); 
  const currentStrokeRef = useRef([]);
  const pointsRef = useRef([]); 

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    // Resize canvas
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1; 
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    // Cấu hình bút vẽ mặc định
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a1a"; 
    ctx.shadowBlur = 2;
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    
    canvas.style.touchAction = "none";
  }, []);

  const getPos = (e) => {
    if (e.nativeEvent && typeof e.nativeEvent.offsetX === 'number') {
      return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Hàm vẽ đường cong (dùng cho cả Live Drawing và Redraw)
  const drawSegment = (ctx, p1, p2, pPrev) => {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const baseWidth = 14; 
    // Thuật toán giả lập bút lông: Nét càng nhanh/dài thì càng mảnh
    let width = Math.max(5, baseWidth - (dist * 0.4)); 
    
    ctx.lineWidth = width;
    ctx.beginPath();
    
    const midPoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    
    // Tính điểm bắt đầu của đường cong (trung điểm của đoạn trước)
    const prevMid = pPrev ? { x: (pPrev.x + p1.x) / 2, y: (pPrev.y + p1.y) / 2 } : p1;

    ctx.moveTo(prevMid.x, prevMid.y);
    ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
    ctx.stroke();
  };

  // --- VẼ TRỰC TIẾP (LIVE) ---
  const drawCurve = (ctx, points) => {
    if (points.length < 3) return;
    const p1 = points[points.length - 2];
    const p2 = points[points.length - 1];
    const pPrev = points[points.length - 3];
    drawSegment(ctx, p1, p2, pPrev);
  };

  const startDrawing = (e) => {
    if (e.buttons !== 1 && e.type === 'pointerdown') return;
    e.target.setPointerCapture(e.pointerId);

    const pos = getPos(e);
    isDrawing.current = true;
    
    pointsRef.current = [pos]; 
    currentStrokeRef.current = [[Math.round(pos.x), Math.round(pos.y)]]; 
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault(); 

    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    
    pointsRef.current.push(pos);
    drawCurve(ctx, pointsRef.current);

    const lastPoint = currentStrokeRef.current[currentStrokeRef.current.length - 1];
    if (lastPoint) {
        const dist = Math.hypot(pos.x - lastPoint[0], pos.y - lastPoint[1]);
        if (dist > 5) { 
            currentStrokeRef.current.push([Math.round(pos.x), Math.round(pos.y)]);
        }
    }
  };

  const endDrawing = (e) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (e.target && e.pointerId) e.target.releasePointerCapture(e.pointerId);

    if (currentStrokeRef.current.length > 1) {
        traceRef.current.push(currentStrokeRef.current);
        if (props.onStrokeEnd) props.onStrokeEnd();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    traceRef.current = [];
    currentStrokeRef.current = [];
    pointsRef.current = [];
  };

  const undo = () => {
    if (traceRef.current.length === 0) return;
    traceRef.current.pop();
    redraw(); // <--- Gọi hàm vẽ lại xịn xò
    if (props.onStrokeEnd) props.onStrokeEnd();
  };

  // --- HÀM VẼ LẠI (REDRAW) ĐÃ ĐƯỢC NÂNG CẤP ---
  // Thay vì vẽ đường thẳng (lineTo), ta vẽ lại từng đường cong bezier y như lúc vẽ thật
  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // Cài đặt lại bút vẽ
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.shadowBlur = 2;
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    
    traceRef.current.forEach(stroke => {
      if (stroke.length === 0) return;

      // Nếu chỉ có 1 điểm (chấm mực)
      if (stroke.length === 1) {
          ctx.beginPath();
          ctx.arc(stroke[0][0], stroke[0][1], 5, 0, Math.PI * 2);
          ctx.fillStyle = "#1a1a1a";
          ctx.fill();
          return;
      }

      // Nếu là nét vẽ dài -> Tái tạo hiệu ứng nét thanh nét đậm
      for (let i = 1; i < stroke.length; i++) {
          const p1 = { x: stroke[i-1][0], y: stroke[i-1][1] };
          const p2 = { x: stroke[i][0],   y: stroke[i][1] };
          // Điểm trước p1 (để tính đường cong mượt)
          const pPrev = i > 1 ? { x: stroke[i-2][0], y: stroke[i-2][1] } : null;
          
          drawSegment(ctx, p1, p2, pPrev);
      }
    });
  };

  const getDimensions = () => {
      if (!canvasRef.current) return { width: 500, height: 500 };
      const rect = canvasRef.current.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
  };

  useImperativeHandle(ref, () => ({
    clear: clearCanvas,
    undo: undo,
    getTrace: () => traceRef.current,
    getDimensions: getDimensions 
  }));

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#fdfbf7]">
      
      {/* GRID NỀN (Ô MỄ) */}
      <div className="absolute inset-0 z-0 pointer-events-none p-4">
        <div className="w-full h-full border-2 border-red-300/50 relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-300/40 border-l border-dashed border-red-400"></div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-red-300/40 border-t border-dashed border-red-400"></div>
            <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
                <line x1="0" y1="0" x2="100%" y2="100%" stroke="#f87171" strokeWidth="1" strokeDasharray="5,5" />
                <line x1="100%" y1="0" x2="0" y2="100%" stroke="#f87171" strokeWidth="1" strokeDasharray="5,5" />
            </svg>
        </div>
      </div>

      {/* CANVAS */}
      <canvas
        ref={canvasRef}
        className="relative z-10 w-full h-full cursor-crosshair touch-none"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={endDrawing}
        onPointerLeave={endDrawing} 
        onPointerCancel={endDrawing}
      />
    </div>
  );
});

export default KanjiCanvas;