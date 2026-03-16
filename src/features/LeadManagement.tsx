import React, { useState, useEffect } from 'react';
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
    DroppableProvided,
    DraggableProvided
} from '@hello-pangea/dnd';
import {
    Plus, X, Phone, User, Mail, BookOpen,
    Search, Filter, Send, CheckCircle2
} from 'lucide-react';

import {
    subscribeToLeads,
    updateLeadStatus,
    createLead,
    markTestAsSent,
    LeadData
} from '../services/leadService';
import { subscribeToCourses, CourseData } from '../services/courseService';

const COLUMNS = ['MỚI', 'ĐÃ LIÊN HỆ', 'HẸN TEST', 'ĐÃ NHẬP HỌC', 'TẠM DỪNG'];

const LeadManagement = () => {
    const [leads, setLeads] = useState<LeadData[]>([]);
    const [courses, setCourses] = useState<CourseData[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCourse, setFilterCourse] = useState('All');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newLead, setNewLead] = useState({
        name: '', phone: '', email: '', status: 'MỚI', course: '', source: '', note: ''
    });

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);

    useEffect(() => {
        const unsubscribeLeads = subscribeToLeads((data) => setLeads(data));
        const unsubscribeCourses = subscribeToCourses((data) => setCourses(data));
        return () => {
            unsubscribeLeads();
            unsubscribeCourses();
        };
    }, []);

    const filteredLeads = leads.filter(lead => {
        const matchesSearch =
            lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.phone.includes(searchTerm) ||
            (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCourse = filterCourse === 'All' || lead.course === filterCourse;
        return matchesSearch && matchesCourse;
    });

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return;
        }
        await updateLeadStatus(draggableId, destination.droppableId);
    };

    const handleOpenCreateModal = (defaultStatus: string = 'MỚI') => {
        setNewLead(prev => ({ ...prev, status: defaultStatus }));
        setIsCreateModalOpen(true);
    };

    const handleOpenDetailModal = (lead: LeadData) => {
        setSelectedLead(lead);
        setIsDetailModalOpen(true);
    };

    const handleCreateLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLead.course) return alert("Vui lòng chọn một khóa học!");
        try {
            await createLead(newLead);
            setIsCreateModalOpen(false);
            setNewLead({ name: '', phone: '', email: '', status: 'MỚI', course: '', source: '', note: '' });
        } catch (error) {
            alert("Có lỗi xảy ra khi tạo Lead mới!");
        }
    };

    const handleSendTest = async (e: React.MouseEvent, lead: LeadData) => {
        e.stopPropagation();
        await markTestAsSent(lead.id!);
        if (lead.email) {
            const subject = encodeURIComponent("Lịch làm bài Test xếp lớp tại Talemy");
            const body = encodeURIComponent(`Chào ${lead.name},\n\nTrung tâm gửi bạn link làm bài test xếp lớp cho khóa ${lead.course}.\n\nVui lòng hoàn thành bài test tại link sau: [Điền link test]\n\nTrân trọng!`);
            window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`);
        } else {
            alert(`Đã đánh dấu là Đã gửi. Tuy nhiên học viên ${lead.name} chưa có Email trong hệ thống!`);
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col relative overflow-hidden bg-slate-50">

            {/* HEADER: Responsive Layout */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sales Pipeline</h2>
                    <p className="text-slate-500 text-sm italic">Quản lý và theo dõi tiến độ tư vấn học viên</p>
                </div>

                <div className="w-full xl:max-w-3xl flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm tên, SĐT, Email..."
                            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 outline-none shadow-sm transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative w-full sm:w-48 lg:w-64">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 outline-none shadow-sm appearance-none font-bold text-slate-700 cursor-pointer text-sm"
                            value={filterCourse}
                            onChange={(e) => setFilterCourse(e.target.value)}
                        >
                            <option value="All">Tất cả khóa học</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.name}>{course.name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => handleOpenCreateModal('MỚI')}
                        className="w-full sm:w-auto bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-200 hover:bg-orange-600 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                    >
                        <Plus size={20} /> <span className="sm:hidden lg:inline">Tạo Lead Mới</span>
                    </button>
                </div>
            </div>

            {/* BẢNG KANBAN: Horizontal Scroll on Mobile */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 h-full snap-x snap-mandatory lg:snap-none custom-scrollbar">
                    {COLUMNS.map(columnStatus => (
                        <Droppable key={columnStatus} droppableId={columnStatus}>
                            {(provided: DroppableProvided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="bg-slate-100/60 min-w-[280px] md:min-w-[320px] rounded-[2rem] p-4 flex flex-col border border-slate-200/40 snap-center"
                                >
                                    <div className="flex justify-between items-center mb-5 px-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-slate-700 tracking-tight text-sm uppercase">{columnStatus}</h3>
                                            <span className="bg-white text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm border border-orange-100">
                        {filteredLeads.filter(l => l.status === columnStatus).length}
                      </span>
                                        </div>
                                        <button
                                            onClick={() => handleOpenCreateModal(columnStatus)}
                                            className="text-slate-400 hover:text-orange-500 hover:bg-white p-1.5 rounded-xl transition-all shadow-sm bg-white/50"
                                        >
                                            <Plus size={16} strokeWidth={3} />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                        {filteredLeads.filter(lead => lead.status === columnStatus).map((lead, index) => (
                                            <Draggable key={lead.id} draggableId={lead.id!} index={index}>
                                                {(provided: DraggableProvided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() => handleOpenDetailModal(lead)}
                                                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-orange-200 transition-all group cursor-pointer flex flex-col relative overflow-hidden"
                                                    >
                                                        <p className="font-black text-slate-800 group-hover:text-orange-600 transition-colors text-sm">{lead.name}</p>
                                                        <div className="space-y-2 mt-3">
                                                            <p className="text-[11px] text-slate-500 flex items-center gap-2 font-bold">
                                                                <Phone size={13} className="text-orange-400"/> {lead.phone}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-orange-600 font-black bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 uppercase tracking-tighter">
                                        {lead.course}
                                    </span>
                                                            </div>
                                                        </div>

                                                        {columnStatus === 'HẸN TEST' && (
                                                            <div className="mt-4 pt-4 border-t border-slate-50">
                                                                {!lead.isTestSent ? (
                                                                    <button
                                                                        onClick={(e) => handleSendTest(e, lead)}
                                                                        className="w-full py-2 px-3 rounded-xl border-2 border-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 flex items-center justify-center gap-2 text-[10px] font-black transition-all"
                                                                    >
                                                                        <Send size={13} /> GỬI BÀI TEST
                                                                    </button>
                                                                ) : (
                                                                    <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center gap-2 text-[10px] font-black border border-emerald-100">
                                                                        <CheckCircle2 size={13} /> ĐÃ GỬI BÀI TEST
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
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

            {/* MODAL CHI TIẾT LEAD: Full screen on mobile */}
            {isDetailModalOpen && selectedLead && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4 transition-all">
                    <div className="bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
                        <div className="relative h-32 bg-gradient-to-br from-orange-400 to-orange-600 flex items-end p-8">
                            <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-6 right-6 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-2.5 rounded-2xl transition-all">
                                <X size={20} />
                            </button>
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-2xl flex items-center justify-center text-orange-500 font-black text-3xl absolute -bottom-10 left-8 border-8 border-white">
                                {selectedLead.name.charAt(0).toUpperCase()}
                            </div>
                        </div>

                        <div className="pt-14 p-8">
                            <h3 className="text-3xl font-black text-slate-800 mb-2">{selectedLead.name}</h3>
                            <span className="inline-flex items-center px-4 py-1.5 bg-orange-50 text-orange-600 font-black text-[10px] rounded-full mb-8 tracking-widest border border-orange-100 uppercase">
                    TÌNH TRẠNG: {selectedLead.status}
                </span>

                            <div className="space-y-5">
                                <div className="flex items-center gap-5 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 shadow-sm"><Phone size={22} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số điện thoại</p>
                                        <p className="font-bold text-slate-800 text-lg">{selectedLead.phone}</p>
                                    </div>
                                </div>

                                {selectedLead.email && (
                                    <div className="flex items-center gap-5 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 shadow-sm"><Mail size={22} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email liên hệ</p>
                                            <p className="font-bold text-slate-800">{selectedLead.email}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-5 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0 shadow-sm"><BookOpen size={22} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Khóa học quan tâm</p>
                                        <p className="font-bold text-slate-800 uppercase text-sm">{selectedLead.course}</p>
                                    </div>
                                </div>

                                {(selectedLead.source || selectedLead.note) && (
                                    <div className="bg-slate-50 p-6 rounded-[1.5rem] mt-6 border border-slate-100 shadow-inner">
                                        {selectedLead.source && (
                                            <p className="text-sm text-slate-600 mb-3 flex items-center gap-2">
                                                <span className="font-black text-slate-400 text-[10px] uppercase">Nguồn:</span>
                                                <span className="font-bold text-slate-700">{selectedLead.source}</span>
                                            </p>
                                        )}
                                        {selectedLead.note && (
                                            <div className="text-sm text-slate-600">
                                                <span className="font-black text-slate-400 text-[10px] uppercase block mb-2">Ghi chú:</span>
                                                <p className="italic bg-white p-4 rounded-2xl border border-slate-200 text-slate-700 leading-relaxed shadow-sm">{selectedLead.note}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TẠO LEAD: Responsive Grid */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4">
                    <div className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-orange-500 text-white shadow-lg">
                            <div>
                                <h3 className="text-2xl font-black tracking-tight">Thêm Lead Mới</h3>
                                <p className="text-orange-100 text-xs mt-1 italic">Nhập thông tin học viên tiềm năng vào hệ thống</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="hover:rotate-90 transition-all p-2 bg-white/10 rounded-2xl"><X size={28} /></button>
                        </div>

                        <form onSubmit={handleCreateLead} className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và Tên *</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20}/>
                                        <input required type="text" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-800" value={newLead.name} onChange={(e) => setNewLead({...newLead, name: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại *</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20}/>
                                        <input required type="text" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-800" value={newLead.phone} onChange={(e) => setNewLead({...newLead, phone: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Email liên lạc</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20}/>
                                    <input type="email" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-800" value={newLead.email} onChange={(e) => setNewLead({...newLead, email: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Khóa học quan tâm *</label>
                                    <div className="relative group">
                                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20}/>
                                        <select required className="w-full pl-12 pr-10 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/20 focus:bg-white rounded-2xl outline-none appearance-none font-bold text-slate-800 cursor-pointer" value={newLead.course} onChange={(e) => setNewLead({...newLead, course: e.target.value})}>
                                            <option value="" disabled>Chọn khóa học</option>
                                            {courses.map((course) => (
                                                <option key={course.id} value={course.name}>{course.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Trạng thái ban đầu</label>
                                    <select className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/20 focus:bg-white rounded-2xl outline-none font-black text-orange-600 appearance-none cursor-pointer" value={newLead.status} onChange={(e) => setNewLead({...newLead, status: e.target.value})}>
                                        {COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Ghi chú & Nguồn khách</label>
                                <textarea className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-orange-500/20 focus:bg-white rounded-[2rem] outline-none h-32 transition-all font-medium text-slate-700 leading-relaxed shadow-inner" placeholder="Nhập thêm nguồn khách hàng hoặc ghi chú đặc biệt..." value={newLead.note} onChange={(e) => setNewLead({...newLead, note: e.target.value})}></textarea>
                            </div>

                            <button type="submit" className="w-full bg-orange-500 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-orange-200 hover:bg-orange-600 transition-all active:scale-[0.98] mt-6 tracking-widest text-lg uppercase">
                                XÁC NHẬN LƯU THÔNG TIN
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #f97316; }
      `}</style>
        </div>
    );
};

export default LeadManagement;