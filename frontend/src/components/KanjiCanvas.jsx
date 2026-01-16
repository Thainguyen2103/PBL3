import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const KanjiCanvas = forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  
  // Lưu trữ nét vẽ: [ [ [x,y], [x,y] ], ... ]
  const traceRef = useRef([]); 
  const currentStrokeRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    
    // Xử lý độ phân giải cao (Retina display)
    const dpr = window.devicePixelRatio || 1;
    
    // Lấy kích thước hiển thị thực tế
    const rect = canvas.getBoundingClientRect();
    
    // Thiết lập kích thước bộ nhớ đệm khớp với kích thước hiển thị
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr); // Scale để vẽ nét mịn
    
    // Cấu hình nét bút
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 10; // Nét to hơn chút để dễ nhìn
    ctx.strokeStyle = "black";
    
    // Tắt tính năng "touch-action" của CSS để không bị cuộn trang khi vẽ
    canvas.style.touchAction = "none";
  }, []);

  // --- HÀM TÍNH TỌA ĐỘ CHUẨN XÁC 100% ---
  const getPos = (e) => {
    // nativeEvent.offsetX/Y trả về tọa độ tương đối so với Canvas (đã trừ padding/border)
    // Rất chính xác, không bị lệch chuột
    return {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };
  };

  // --- SỬ DỤNG POINTER EVENTS (Gộp cả Chuột & Cảm ứng) ---
  const startDrawing = (e) => {
    // Chỉ nhận input từ bút hoặc chuột trái (tránh chuột phải)
    if (e.buttons !== 1 && e.pointerType === 'mouse') return;

    // Capture pointer để không bị trượt ra ngoài khi vẽ nhanh
    e.target.setPointerCapture(e.pointerId);

    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
    
    // Bắt đầu nét mới
    currentStrokeRef.current = [[x, y]];
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Lưu điểm vào nét hiện tại
    currentStrokeRef.current.push([x, y]);
  };

  const endDrawing = (e) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    // Release pointer
    e.target.releasePointerCapture(e.pointerId);
    
    // Lưu nét vẽ vào bộ nhớ tổng, CHỈ KHI nét đó có dữ liệu
    if (currentStrokeRef.current.length > 0) {
        traceRef.current.push(currentStrokeRef.current);
    }
    
    // Gửi tín hiệu ra ngoài để nhận diện ngay lập tức
    if (props.onStrokeEnd) {
      props.onStrokeEnd();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    traceRef.current = [];
    currentStrokeRef.current = [];
  };

  const undo = () => {
    if (traceRef.current.length === 0) return;
    traceRef.current.pop(); // Xóa nét cuối
    redraw();
    
    // Gọi lại nhận diện sau khi undo
    if (props.onStrokeEnd) props.onStrokeEnd();
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    ctx.beginPath();
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
    getTrace: () => traceRef.current
  }));

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair touch-none"
      // Thay thế toàn bộ sự kiện cũ bằng Pointer Events
      onPointerDown={startDrawing}
      onPointerMove={draw}
      onPointerUp={endDrawing}
      // Không cần onMouseLeave vì đã dùng setPointerCapture
    />
  );
});

export default KanjiCanvas;