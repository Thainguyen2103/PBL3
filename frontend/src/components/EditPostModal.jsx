import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

const EditPostModal = ({ post, user, onClose, onUpdate }) => {
    const [content, setContent] = useState(post.content || '');
    
    // Tách riêng ảnh cũ (URL) và ảnh mới chọn (File)
    const [existingImages, setExistingImages] = useState(post.images || []); 
    const [newFiles, setNewFiles] = useState([]);
    const [newPreviews, setNewPreviews] = useState([]); // Để hiển thị xem trước ảnh mới

    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

    // --- XỬ LÝ ẢNH CŨ ---
    const handleRemoveExisting = (index) => {
        setExistingImages(existingImages.filter((_, i) => i !== index));
    };

    // --- XỬ LÝ ẢNH MỚI ---
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setNewFiles([...newFiles, ...files]);
            const previews = files.map(file => URL.createObjectURL(file));
            setNewPreviews([...newPreviews, ...previews]);
        }
    };

    const handleRemoveNew = (index) => {
        setNewFiles(newFiles.filter((_, i) => i !== index));
        setNewPreviews(newPreviews.filter((_, i) => i !== index));
    };

    // --- LƯU THAY ĐỔI ---
    const handleSave = async () => {
        if (!content.trim() && existingImages.length === 0 && newFiles.length === 0) {
            alert("Bài viết không được để trống!");
            return;
        }
        setSaving(true);

        let finalImages = [...existingImages]; // Bắt đầu với danh sách ảnh cũ còn lại

        // 1. Upload ảnh mới (nếu có)
        if (newFiles.length > 0) {
            const uploadPromises = newFiles.map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;
                const { error } = await supabase.storage.from('forum-images').upload(fileName, file);
                if (error) throw error;
                const { data } = supabase.storage.from('forum-images').getPublicUrl(fileName);
                return data.publicUrl;
            });

            try {
                const uploadedUrls = await Promise.all(uploadPromises);
                finalImages = [...finalImages, ...uploadedUrls]; // Gộp ảnh mới vào
            } catch (error) {
                alert("Lỗi upload ảnh mới: " + error.message);
                setSaving(false);
                return;
            }
        }
        
        // 2. Cập nhật Database
        const { error } = await supabase
            .from('posts')
            .update({ content, images: finalImages })
            .eq('id', post.id);

        if (!error) {
            onUpdate(post.id, content, finalImages);
            onClose();
        } else {
            alert("Lỗi cập nhật: " + error.message);
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h3 className="font-bold text-lg text-slate-800">Chỉnh sửa bài viết</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">✕</button>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-32 p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none resize-none text-base text-slate-800"
                        placeholder="Nội dung bài viết..."
                    />

                    {/* Khu vực ảnh */}
                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-bold text-gray-500 uppercase">Ảnh đính kèm ({existingImages.length + newFiles.length})</p>
                            <button 
                                onClick={() => fileInputRef.current.click()}
                                className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                            >
                                <span>➕</span> Thêm ảnh
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" multiple />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {/* Render Ảnh Cũ */}
                            {existingImages.map((img, idx) => (
                                <div key={`old-${idx}`} className="relative group rounded-lg overflow-hidden h-24 border border-gray-200">
                                    <img src={img} className="w-full h-full object-cover" alt="" />
                                    <button onClick={() => handleRemoveExisting(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors">✕</button>
                                </div>
                            ))}

                            {/* Render Ảnh Mới */}
                            {newPreviews.map((img, idx) => (
                                <div key={`new-${idx}`} className="relative group rounded-lg overflow-hidden h-24 border-2 border-blue-200">
                                    <img src={img} className="w-full h-full object-cover opacity-90" alt="" />
                                    <div className="absolute inset-0 bg-blue-500/10 pointer-events-none"></div> {/* Lớp phủ xanh nhẹ để biết là ảnh mới */}
                                    <button onClick={() => handleRemoveNew(idx)} className="absolute top-1 right-1 bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-gray-900 transition-colors">✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">Hủy</button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all disabled:opacity-70 flex items-center gap-2"
                    >
                        {saving && <span className="animate-spin">⏳</span>}
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditPostModal;