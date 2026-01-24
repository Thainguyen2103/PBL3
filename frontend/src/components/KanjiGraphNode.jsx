import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const KanjiGraphNode = ({ data }) => {
    // data: { char, hanviet, isRoot, onNodeClick }
    
    return (
        <div 
            onClick={() => data.onNodeClick && data.onNodeClick(data.char)}
            className="relative group cursor-pointer"
        >
            {/* 🔥 MẤU CHỐT 1: Đưa cả 2 điểm neo (Input/Output) vào CHÍNH GIỮA (Center) 
                opacity-0: Ẩn đi để không thấy cái chấm đen
            */}
            <Handle 
                type="target" 
                position={Position.Top} 
                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0 }} 
            />
            
            {/* 🔥 MẤU CHỐT 2: Giao diện HÌNH TRÒN (rounded-full)
                Dùng aspect-square để đảm bảo luôn tròn vo
            */}
            <div className={`
                flex flex-col items-center justify-center aspect-square shadow-xl transition-all duration-300
                ${data.isRoot 
                    ? 'w-32 h-32 rounded-full bg-slate-900 text-white border-[6px] border-white ring-4 ring-slate-100 z-50' 
                    : 'w-24 h-24 rounded-full bg-white text-slate-800 border-[4px] border-slate-100 ring-1 ring-slate-200 hover:border-blue-400 hover:scale-110 z-40'}
            `}>
                {/* Kanji */}
                <span className={`font-kai leading-none mb-1 ${data.isRoot ? 'text-6xl' : 'text-4xl'}`}>
                    {data.char}
                </span>

                {/* Hán Việt */}
                {!data.isRoot && (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-full text-slate-500">
                        {data.hanviet}
                    </span>
                )}
            </div>

            {/* Tooltip */}
            {!data.isRoot && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap pointer-events-none shadow-lg z-50">
                    Xem chi tiết
                </div>
            )}

            {/* Handle Output cũng ở giữa luôn */}
            <Handle 
                type="source" 
                position={Position.Bottom} 
                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0 }} 
            />
        </div>
    );
};

export default memo(KanjiGraphNode);