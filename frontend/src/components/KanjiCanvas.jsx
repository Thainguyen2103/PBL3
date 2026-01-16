import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const KanjiCanvas = forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  
  // Lưu trữ nét vẽ: [ [ [x,y], [x,y] ], ... ]
  const traceRef = useRef([]); 
  const currentStrokeRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    // Xử lý độ phân giải cao (Retina)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set kích thước thực của Canvas khớp với kích thước hiển thị
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr); 
    
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 10; // Nét to, rõ
    ctx.strokeStyle = "black";
    
    // Chặn hành động cuộn trang mặc định khi chạm tay vào canvas
    canvas.style.touchAction = "none";
  }, []);

  // --- HÀM TÍNH TỌA ĐỘ BẤT TỬ (SỬA LỖI LỆCH CHUỘT) ---
  const getPos = (e) => {
    const canvas = canvasRef.current;
    // getBoundingClientRect luôn trả về vị trí chính xác của Canvas trên màn hình
    const rect = canvas.getBoundingClientRect();
    
    // Tính toán tọa độ chuột dựa trên vị trí Canvas
    // clientX/Y là vị trí chuột trên toàn màn hình
    // Trừ đi rect.left/top sẽ ra vị trí chính xác trong Canvas
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return { x, y };
  };

  const startDrawing = (e) => {
    // Chỉ vẽ khi nhấn chuột trái hoặc chạm bút/tay
    if (e.buttons !== 1 && e.pointerType === 'mouse') return;
    
    // Giữ con trỏ không bị trượt ra ngoài khi vẽ nhanh
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
    
    // Lưu điểm vào nét hiện tại (làm tròn số để API dễ đọc)
    currentStrokeRef.current.push([Math.round(x), Math.round(y)]);
  };

  const endDrawing = (e) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    e.target.releasePointerCapture(e.pointerId);
    
    // Lưu nét vẽ vào bộ nhớ tổng
    if (currentStrokeRef.current.length > 0) {
        traceRef.current.push(currentStrokeRef.current);
    }
    
    // Gửi tín hiệu nhận diện ngay lập tức
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
    if (props.onStrokeEnd) props.onStrokeEnd(); // Nhận diện lại sau khi hoàn tác
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
      // Dùng Pointer Events để hỗ trợ cả Chuột và Cảm ứng mượt mà
      onPointerDown={startDrawing}
      onPointerMove={draw}
      onPointerUp={endDrawing}
    />
  );
});

export default KanjiCanvas;