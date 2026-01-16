import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const KanjiCanvas = forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  
  // Dùng useRef để lưu dữ liệu nét vẽ TỨC THÌ (không bị trễ như useState)
  const traceRef = useRef([]); 
  const currentStrokeRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    // Tăng độ phân giải Canvas (Fix lỗi nét bị răng cưa)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 8; // Nét đậm hơn để dễ nhận diện
    ctx.strokeStyle = "#000000";
  }, []);

  // Hàm lấy tọa độ chuẩn (Làm tròn số nguyên để Google API dễ đọc)
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    return {
      x: Math.round(clientX - rect.left),
      y: Math.round(clientY - rect.top)
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
    
    // Bắt đầu lưu nét mới
    currentStrokeRef.current = [[x, y]];
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Lưu tọa độ liên tục vào useRef
    currentStrokeRef.current.push([x, y]);
  };

  const endDrawing = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    isDrawing.current = false;
    
    // Đẩy nét vừa vẽ vào mảng tổng
    if (currentStrokeRef.current.length > 0) {
        traceRef.current.push(currentStrokeRef.current);
    }
    
    // Gửi tín hiệu để HomePage nhận diện ngay lập tức
    if (props.onStrokeEnd) {
      props.onStrokeEnd();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // Xóa hình ảnh
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // Xóa dữ liệu trong bộ nhớ
    traceRef.current = [];
    currentStrokeRef.current = [];
  };

  const undo = () => {
    if (traceRef.current.length === 0) return;
    
    // Bỏ nét cuối cùng
    traceRef.current.pop();
    redraw();
    
    // Tự động nhận diện lại sau khi hoàn tác
    if (props.onStrokeEnd) {
        props.onStrokeEnd();
    }
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Xóa sạch để vẽ lại
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    ctx.beginPath();
    // Duyệt qua từng nét trong bộ nhớ và vẽ lại
    traceRef.current.forEach(stroke => {
      if (stroke.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0][0], stroke[0][1]);
      stroke.forEach(point => {
        ctx.lineTo(point[0], point[1]);
      });
      ctx.stroke();
    });
  };

  useImperativeHandle(ref, () => ({
    clear: clearCanvas,
    undo: undo,
    // HÀM QUAN TRỌNG: Trả về dữ liệu từ useRef (luôn mới nhất)
    getTrace: () => traceRef.current 
  }));

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair touch-none"
      style={{ width: '100%', height: '100%' }}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={endDrawing}
      onMouseLeave={endDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={endDrawing}
    />
  );
});

export default KanjiCanvas;