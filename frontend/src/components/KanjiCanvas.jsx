import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

const KanjiCanvas = forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawing = useRef(false);
  
  // State để lưu kích thước cạnh hình vuông
  const [squareSize, setSquareSize] = useState(0);

  const traceRef = useRef([]); 
  const currentStrokeRef = useRef([]);
  const pointsRef = useRef([]); 

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    // Lấy kích thước của khung chứa bên ngoài
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // --- XỬ LÝ QUAN TRỌNG NHẤT ---
    // Tìm cạnh nhỏ nhất giữa chiều rộng và chiều cao của khung chứa
    // Để đảm bảo khu vực vẽ luôn là HÌNH VUÔNG và nằm gọn bên trong
    const sideLength = Math.min(rect.width, rect.height);

    // Lưu kích thước này vào state để dùng cho CSS
    setSquareSize(sideLength);
    
    // Set độ phân giải thật cho canvas (internal resolution) theo hình vuông
    canvas.width = sideLength * dpr;
    canvas.height = sideLength * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a1a"; 
    ctx.shadowBlur = 2;
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    
    canvas.style.touchAction = "none";
  }, []);

  // ... (Các hàm getPos, drawCurve, startDrawing, draw, endDrawing, clearCanvas, undo, redraw GIỮ NGUYÊN KHÔNG ĐỔI)
  // Vui lòng giữ lại code cũ của các hàm này để tiết kiệm không gian bài viết

  const getPos = (e) => {
    if (e.nativeEvent && typeof e.nativeEvent.offsetX === 'number') {
      return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    }
    // Fallback cho cảm ứng
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const drawCurve = (ctx, points) => {
    if (points.length < 3) return;
    const p1 = points[points.length - 2];
    const p2 = points[points.length - 1];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const baseWidth = 14; 
    let width = Math.max(5, baseWidth - (dist * 0.4)); 
    
    ctx.lineWidth = width;
    ctx.beginPath();
    const midPoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const prevP = points[points.length - 3] || p1;
    const prevMid = { x: (prevP.x + p1.x) / 2, y: (prevP.y + p1.y) / 2 };
    ctx.moveTo(prevMid.x, prevMid.y);
    ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
    ctx.stroke();
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
    redraw();
    if (props.onStrokeEnd) props.onStrokeEnd();
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 10;
    traceRef.current.forEach(stroke => {
      ctx.beginPath();
      if(stroke.length > 0) ctx.moveTo(stroke[0][0], stroke[0][1]);
      stroke.forEach(p => ctx.lineTo(p[0], p[1]));
      ctx.stroke();
    });
  };

  const getDimensions = () => {
      if (!canvasRef.current) return { width: 500, height: 500 };
      // Trả về kích thước hình vuông đã tính toán
      return { width: squareSize, height: squareSize };
  };

  useImperativeHandle(ref, () => ({
    clear: clearCanvas,
    undo: undo,
    getTrace: () => traceRef.current,
    getDimensions: getDimensions 
  }));

  return (
    // Container bên ngoài: Dùng flex để căn giữa nội dung bên trong
    <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-transparent">
      
      {/* Wrapper của phần vẽ: Bắt buộc là HÌNH VUÔNG nhờ style width/height */}
      <div 
        className="relative bg-[#fffcf5] shadow-sm border border-red-900/10 overflow-hidden"
        // Ép cứng kích thước hiển thị thành hình vuông dựa trên tính toán ở useEffect
        style={{ width: squareSize ? `${squareSize}px` : '100%', height: squareSize ? `${squareSize}px` : '100%' }}
      >
        {/* Nền ô mễ (Grid background) */}
        <div className="absolute inset-0 z-0 pointer-events-none p-2">
            <div className="w-full h-full border border-red-300/40 relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-300/30"></div>
                <div className="absolute top-1/2 left-0 right-0 h-px bg-red-300/30"></div>
                <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
                    <line x1="0" y1="0" x2="100%" y2="100%" stroke="#f87171" strokeWidth="1" strokeDasharray="4,4" />
                    <line x1="100%" y1="0" x2="0" y2="100%" stroke="#f87171" strokeWidth="1" strokeDasharray="4,4" />
                </svg>
            </div>
        </div>

        {/* Canvas vẽ */}
        <canvas
            ref={canvasRef}
            className="relative z-10 w-full h-full cursor-crosshair touch-none"
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={endDrawing}
            onPointerLeave={endDrawing} 
            onPointerCancel={endDrawing}
            // Quan trọng: Set kích thước hiển thị CSS cho canvas trùng với wrapper
            style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
});

export default KanjiCanvas;