import React, { useState } from 'react';

const ImageGrid = ({ images }) => {
    const [selectedImage, setSelectedImage] = useState(null); // Để xem full ảnh

    if (!images || images.length === 0) return null;

    const count = images.length;

    // Hàm mở ảnh full màn hình
    const openLightbox = (img) => setSelectedImage(img);

    return (
        <>
            <div className={`grid gap-1 overflow-hidden rounded-xl border border-gray-100 ${
                count === 1 ? 'grid-cols-1' : 
                count === 2 ? 'grid-cols-2' : 
                count === 3 ? 'grid-cols-2 grid-rows-2' : 
                'grid-cols-2'
            }`}>
                {images.slice(0, 4).map((img, index) => {
                    // Logic tính toán class để chia ô (Grid layout)
                    let className = "relative overflow-hidden bg-gray-100 cursor-pointer group";
                    let imgClass = "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110";
                    
                    // Xử lý bố cục
                    if (count === 1) {
                        className += " h-auto max-h-[500px]"; 
                    } else if (count === 3 && index === 0) {
                        className += " row-span-2 h-[300px]"; // Ảnh đầu to gấp đôi
                    } else {
                        className += " h-[150px] md:h-[200px]";
                    }

                    return (
                        <div key={index} className={className} onClick={() => openLightbox(img)}>
                            <img src={img} className={imgClass} alt="post" loading="lazy" />
                            
                            {/* Nếu có hơn 4 ảnh, ảnh cuối cùng hiện số dư (+3) */}
                            {count > 4 && index === 3 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xl backdrop-blur-sm">
                                    +{count - 4}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* LIGHTBOX (Xem ảnh phóng to) */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <button className="absolute top-4 right-4 text-white text-4xl font-bold hover:text-gray-300">✕</button>
                    <img 
                        src={selectedImage} 
                        className="max-w-full max-h-screen object-contain rounded-lg shadow-2xl" 
                        alt="Full" 
                    />
                </div>
            )}
        </>
    );
};

export default ImageGrid;