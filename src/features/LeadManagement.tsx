import React, { useState } from 'react';
import { MoreVertical, Plus, Phone, Calendar, X, Search, Mail, GraduationCap } from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';

interface Lead {
    id: string;
    name: string;
    status: string;
    course: string;
    phone: string;
    email?: string;
    source?: string;
    note?: string;
}

interface Props {
    leads: Lead[];
}

const COLUMNS = [
    { id: 'New', label: 'MỚI', color: 'bg-slate-500' },
    { id: 'Contacted', label: 'ĐÃ LIÊN HỆ', color: 'bg-blue-500' },
    { id: 'Test', label: 'HẸN TEST', color: 'bg-amber-500' },
    { id: 'Enrolled', label: 'ĐÃ NHẬP HỌC', color: 'bg-emerald-500' },
    { id: 'Failed', label: 'TẠM DỪNG', color: 'bg-red-500' },
];

const LeadManagement: React.FC<Props> = ({ leads }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newLead, setNewLead] = useState({ name: '', course: '', phone: '', email: '', source: 'Facebook', note: '', status: 'New' });

    const filteredLeads = leads.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm)
    );

    const onDragEnd = async (result: DropResult) => {
        const { destination, draggableId } = result;
        if (!destination) return;
        try {
            const leadRef = doc(db, "leads", draggableId);
            await updateDoc(leadRef, { status: destination.droppableId });
        } catch (error) {
            console.error("Lỗi cập nhật:", error);
        }
    };

    const handleCreateLead = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "leads"), {
                ...newLead,
                create_at: serverTimestamp() // Dùng đúng create_at cho giống database
            });
            setIsModalOpen(false);
            setNewLead({ name: '', course: '', phone: '', email: '', source: 'Facebook', note: '', status: 'New' });
        } catch (error) {
            alert("Lỗi khi thêm: " + error);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Toolbar */}
            <div className="p-6 flex justify-between items-center bg-white border-b border-slate-200 shadow-sm">
                <h2 className="text-2xl font-black text-slate-800">Sales Pipeline</h2>
                <div className="flex items-center gap-4 flex-1 max-w-xl mx-8">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" placeholder="Tìm tên hoặc SĐT..." 
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all">
                    <Plus size={20} /> <span>Tạo Lead</span>
                </button>
            </div>

            {/* Board */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-x-auto p-6 flex gap-6">
                    {COLUMNS.map((col) => (
                        <Droppable droppableId={col.id} key={col.id}>
                            {(provided: DroppableProvided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="w-80 flex flex-col bg-slate-200/50 rounded-[2rem] border border-slate-200/60 overflow-hidden">
                                    <div className="p-4 flex justify-between items-center bg-white/50 backdrop-blur-sm border-b border-slate-200/50">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${col.color}`}></span>
                                            <h3 className="font-bold text-slate-700 text-xs tracking-widest">{col.label}</h3>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                                            {filteredLeads.filter(l => l.status === col.id).length}
                                        </span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                        {filteredLeads.filter(l => l.status === col.id).map((lead, index) => (
                                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                                {(provided: DraggableProvided) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                                        <div className="flex justify-between mb-2">
                                                            <p className="font-bold text-slate-800 text-sm group-hover:text-orange-600 transition-colors">{lead.name}</p>
                                                            <MoreVertical size={14} className="text-slate-300" />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-2 text-[11px] text-orange-600 font-bold">
                                                                <Phone size={12} /> <span>{lead.phone}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                                                <GraduationCap size={12} /> <span>{lead.course}</span>
                                                            </div>
                                                            <div className="pt-2 flex gap-1">
                                                                <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">{lead.source}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                </div>
                            )}
                        </Droppable>
                    ))}
                </div>
            </DragDropContext>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleCreateLead} className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-black text-slate-800">Thêm Lead Mới</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)}><X /></button>
                        </div>
                        <input required placeholder="Họ tên *" className="input-style" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} />
                        <input required placeholder="Số điện thoại *" className="input-style" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} />
                        <input placeholder="Khóa học quan tâm" className="input-style" value={newLead.course} onChange={e => setNewLead({...newLead, course: e.target.value})} />
                        <select className="input-style" value={newLead.source} onChange={e => setNewLead({...newLead, source: e.target.value})}>
                            <option value="Facebook">Facebook</option>
                            <option value="Tiktok">Tiktok</option>
                            <option value="Website">Website</option>
                            <option value="Referral">Người quen</option>
                        </select>
                        <button type="submit" className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg">LƯU THÔNG TIN</button>
                    </form>
                </div>
            )}
            <style>{`.input-style { width: 100%; padding: 0.75rem 1.25rem; border-radius: 1rem; background: #f8fafc; border: 1px solid #f1f5f9; outline: none; font-weight: 600; font-size: 0.875rem; } .input-style:focus { border-color: #f97316; background: white; }`}</style>
        </div>
    );
};

export default LeadManagement;