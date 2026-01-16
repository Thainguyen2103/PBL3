import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';

const KanjiCanvas = forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  // Lưu tọa độ nét vẽ: [ [ [x,y], [x,y] ], ... ]
  const [trace, setTrace] = useState([]); 
  const [currentStroke, setCurrentStroke] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    // Tăng độ phân giải cho Canvas để nét vẽ mượt hơn trên màn hình Retina/HighDPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 6; // Độ dày nét bút
    ctx.strokeStyle = "#000000"; // Màu đen
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setCurrentStroke([[x, y]]); // Bắt đầu lưu nét mới
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setCurrentStroke(prev => [...prev, [x, y]]); // Lưu tọa độ liên tục
  };

  const endDrawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    
    const newTrace = [...trace, currentStroke];
    setTrace(newTrace);
    
    // Gửi tín hiệu ra ngoài (nếu cần nhận diện ngay lập tức khi nhấc bút)
    if (props.onStrokeEnd) {
      props.onStrokeEnd();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Xóa sạch hình ảnh
    setTrace([]); // Xóa sạch dữ liệu tọa độ
  };

  const undo = () => {
    if (trace.length === 0) return;
    const newTrace = trace.slice(0, -1); // Bỏ nét cuối
    setTrace(newTrace);
    redraw(newTrace); // Vẽ lại các nét còn lại
  };

  const redraw = (strokes) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // Xóa màn hình để vẽ lại từ đầu
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    ctx.beginPath();
    strokes.forEach(stroke => {
      if (stroke.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0][0], stroke[0][1]);
      stroke.forEach(point => {
        ctx.lineTo(point[0], point[1]);
      });
      ctx.stroke();
    });
  };

  // Xuất các hàm này ra ngoài để HomePage gọi được
  useImperativeHandle(ref, () => ({
    clear: clearCanvas,
    undo: undo,
    getTrace: () => trace, // HÀM QUAN TRỌNG NHẤT: Trả về tọa độ cho thư viện handwriting.js
    getCanvasImage: () => canvasRef.current.toDataURL("image/png") // Vẫn giữ hàm này nếu cần
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