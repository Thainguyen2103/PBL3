import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';

const KanjiCanvas = forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const currentLineWidth = useRef(15); 

  // --- CÁC HÀM CHO PHÉP FILE CHA (HOMEPAGE) GỌI ---
  useImperativeHandle(ref, () => ({
    // Hàm xóa bảng vẽ
    clear: () => {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
    },
    // Hàm trích xuất ảnh để gửi cho AI
    getCanvasImage: () => {
      if (canvasRef.current) {
        const mainCanvas = canvasRef.current;
        
        // 1. Tạo một Canvas tạm thời trong bộ nhớ để xử lý nền
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = mainCanvas.width;
        tempCanvas.height = mainCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // 2. TÔ NỀN TRẮNG: AI không thể nhìn thấy nét đen trên nền trong suốt (mặc định thành đen)
        tempCtx.fillStyle = "#FFFFFF"; 
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // 3. Chép nét vẽ từ canvas chính sang nền trắng của canvas tạm
        tempCtx.drawImage(mainCanvas, 0, 0);

        // 4. Trả về chuỗi Base64 đã có nền trắng hoàn hảo cho Gemini nhận diện
        return tempCanvas.toDataURL('image/png');
      }
      return null;
    }
  }));

  // --- KHỞI TẠO CANVAS (ĐỘ PHÂN GIẢI CAO) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    
    const updateSize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      
      // Retina scaling (x2) để nét vẽ mượt mà, AI dễ nhận diện hơn
      canvas.width = rect.width * 2; 
      canvas.height = rect.height * 2;
      
      const context = canvas.getContext("2d");
      context.scale(2, 2); 
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#000000"; // Mực đen tuyệt đối
      contextRef.current = context;
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // --- TÍNH TOÁN TỌA ĐỘ CHUẨN ---
  const getCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    lastPos.current = getCoords(e);
    currentLineWidth.current = 15; 
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const coords = getCoords(e);
    const context = contextRef.current;
    
    const dist = Math.sqrt(
      Math.pow(coords.x - lastPos.current.x, 2) + 
      Math.pow(coords.y - lastPos.current.y, 2)
    );
    
    // Nét vẽ động: Vẽ nhanh nét thanh, vẽ chậm nét đậm
    let targetWidth = 22 - (dist / 10) * 8; 
    if (targetWidth < 8) targetWidth = 8; 
    if (targetWidth > 22) targetWidth = 22; 

    currentLineWidth.current = currentLineWidth.current * 0.8 + targetWidth * 0.2;

    context.beginPath();
    context.lineWidth = currentLineWidth.current;
    context.moveTo(lastPos.current.x, lastPos.current.y);
    context.lineTo(coords.x, coords.y);
    context.stroke();
    
    lastPos.current = coords;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      className="w-full h-full cursor-crosshair bg-[#FCFAF7] block touch-none"
      style={{ touchAction: 'none' }} 
    />
  );
});

export default KanjiCanvas;