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
    Search, Filter, Send, Edit, Trash2, CalendarClock, FileText, DollarSign
} from 'lucide-react';
import emailjs from '@emailjs/browser'; 

import {
    subscribeToLeads,
    updateLeadStatus,
    createLead,
    sendTestSchedule, 
    updateLead,
    deleteLead,
    LeadData
} from '../services/leadService';
import { subscribeToCourses, CourseData } from '../services/courseService';
// THÊM: Import service tạo hợp đồng
import { createContract } from '../services/contractService';

const COLUMNS = ['MỚI', 'ĐÃ LIÊN HỆ', 'HẸN TEST', 'ĐÃ NHẬP HỌC', 'TẠM DỪNG'];

const LeadManagement = () => {
    const [leads, setLeads] = useState<LeadData[]>([]);
    const [courses, setCourses] = useState<CourseData[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCourse, setFilterCourse] = useState('All');

    // States cho Create / Edit
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
    const [newLead, setNewLead] = useState({
        name: '', phone: '', email: '', status: 'MỚI', course: '', source: '', note: ''
    });

    // States cho View Detail
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);

    // States cho Modal Gửi Lịch Test
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleLead, setScheduleLead] = useState<LeadData | null>(null);
    const [testDate, setTestDate] = useState('');
    const [testTime, setTestTime] = useState('');

    // States cho Modal Tạo Hợp Đồng
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [contractLead, setContractLead] = useState<LeadData | null>(null);
    const [contractForm, setContractForm] = useState({
        contractCode: '', totalFee: 0, actualFee: 0, paymentStatus: 'Chưa thanh toán', contractStatus: 'Nháp', note: ''
    });

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

    // HÀM XỬ LÝ KÉO THẢ
    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return;
        }

        // 1. Cập nhật trạng thái sang cột mới
        await updateLeadStatus(draggableId, destination.droppableId);

        // 2. NẾU KÉO VÀO CỘT "ĐÃ NHẬP HỌC" -> BẬT MODAL TẠO HỢP ĐỒNG
        if (destination.droppableId === 'ĐÃ NHẬP HỌC') {
            const leadToEnroll = leads.find(l => l.id === draggableId);
            if (leadToEnroll) {
                setContractLead(leadToEnroll);
                // Tạo sẵn mã hợp đồng ngẫu nhiên
                setContractForm({
                    contractCode: `HD-${Math.floor(Date.now() / 1000)}`,
                    totalFee: 0, actualFee: 0, paymentStatus: 'Chưa thanh toán', contractStatus: 'Nháp', note: ''
                });
                setIsContractModalOpen(true);
            }
        }
    };

    const handleOpenCreateModal = (defaultStatus: string = 'MỚI') => {
        setEditingLeadId(null);
        setNewLead({ name: '', phone: '', email: '', status: defaultStatus, course: '', source: '', note: '' });
        setIsCreateModalOpen(true);
    };

    const handleOpenEditModal = () => {
        if (!selectedLead) return;
        setNewLead({
            name: selectedLead.name,
            phone: selectedLead.phone,
            email: selectedLead.email || '',
            status: selectedLead.status,
            course: selectedLead.course,
            source: selectedLead.source || '',
            note: selectedLead.note || ''
        });
        setEditingLeadId(selectedLead.id!); 
        setIsDetailModalOpen(false);        
        setIsCreateModalOpen(true);         
    };

    const handleOpenDetailModal = (lead: LeadData) => {
        setSelectedLead(lead);
        setIsDetailModalOpen(true);
    };

    const handleDeleteLead = async (id: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa học viên này? Hành động này không thể khôi phục.")) {
            try {
                await deleteLead(id);
                setIsDetailModalOpen(false);
                setSelectedLead(null);
            } catch (error) {
                alert("Lỗi khi xóa học viên!");
            }
        }
    };

    const handleCreateLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLead.course) return alert("Vui lòng chọn một khóa học!");
        try {
            if (editingLeadId) {
                await updateLead(editingLeadId, newLead);
            } else {
                await createLead(newLead);
            }
            setIsCreateModalOpen(false);
            setNewLead({ name: '', phone: '', email: '', status: 'MỚI', course: '', source: '', note: '' });
            setEditingLeadId(null);
        } catch (error) {
            alert("Có lỗi xảy ra khi lưu thông tin!");
        }
    };

    // Mở popup chọn ngày giờ
    const openScheduleModal = (e: React.MouseEvent, lead: LeadData) => {
        e.stopPropagation();
        if (!lead.email) {
            alert("Học viên này chưa có Email trong hệ thống. Vui lòng cập nhật Email trước!");
            return;
        }
        setScheduleLead(lead);
        setIsScheduleModalOpen(true);
    };

    // Xác nhận gửi email
    const handleConfirmSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scheduleLead || !testDate || !testTime) return;

        try {
            // Gửi qua EmailJS
            await emailjs.send(
                'service_ob7mks5',      
                'template_wlwvjhe',     
                {
                    to_email: scheduleLead.email,
                    to_name: scheduleLead.name,
                    course_name: scheduleLead.course,
                    test_date: testDate,
                    test_time: testTime,
                },
                '_SSaW3zYwDxcunLP7'      
            );

            // Cập nhật Firebase
            const currentCount = scheduleLead.testRemindCount || 0;
            await sendTestSchedule(scheduleLead.id!, currentCount);

            // Reset form
            setIsScheduleModalOpen(false);
            setScheduleLead(null);
            setTestDate('');
            setTestTime('');
            alert('Đã gửi email lịch test thành công!');

        } catch (error) {
            console.error("Lỗi khi gửi email:", error);
            alert('Gửi email thất bại. Vui lòng kiểm tra lại cấu hình!');
        }
    };

    // Xác nhận Tạo Hợp Đồng
    const handleCreateContractSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contractLead) return;

        try {
            await createContract({
                leadId: contractLead.id!,
                studentName: contractLead.name,
                studentEmail: contractLead.email || '',
                studentPhone: contractLead.phone,
                course: contractLead.course,
                contractCode: contractForm.contractCode,
                totalFee: Number(contractForm.totalFee),
                actualFee: Number(contractForm.actualFee),
                paymentStatus: contractForm.paymentStatus,
                contractStatus: contractForm.contractStatus,
                note: contractForm.note
            });
            
            alert("Tạo hợp đồng thành công! Hãy sang tab Contract Management để xem.");
            setIsContractModalOpen(false);
            setContractLead(null);
        } catch (error) {
            alert("Có lỗi khi tạo hợp đồng.");
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col relative overflow-hidden bg-slate-50">

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
                                                                <button
                                                                    onClick={(e) => openScheduleModal(e, lead)}
                                                                    className={`w-full py-2.5 px-3 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-black transition-all ${
                                                                        (!lead.testRemindCount || lead.testRemindCount === 0)
                                                                        ? 'border-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white hover:border-orange-500' 
                                                                        : 'border-blue-100 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500'
                                                                    }`}
                                                                >
                                                                    <Send size={14} /> 
                                                                    {(!lead.testRemindCount || lead.testRemindCount === 0) 
                                                                        ? 'GỬI LỊCH TEST' 
                                                                        : `NHẮC LẠI LẦN ${lead.testRemindCount + 1}`}
                                                                </button>
                                                                
                                                                {(lead.testRemindCount || 0) > 0 && lead.lastTestRemindedAt && (
                                                                    <div className="flex items-center justify-center gap-1 mt-2 text-slate-400">
                                                                        <CalendarClock size={10} />
                                                                        <span className="text-[9px] font-medium italic">
                                                                            Đã gửi: {lead.lastTestRemindedAt?.toDate?.()?.toLocaleDateString('vi-VN')}
                                                                        </span>
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

            {/* MODAL GỬI EMAIL CHỐT LỊCH TEST */}
            {isScheduleModalOpen && scheduleLead && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-slate-100 bg-blue-500 text-white">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xl font-black">Chốt lịch Test 1-1</h3>
                                <button onClick={() => setIsScheduleModalOpen(false)} className="hover:bg-white/20 p-1.5 rounded-xl transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-sm opacity-90">Học viên: <strong>{scheduleLead.name}</strong></p>
                            <p className="text-xs opacity-75 mt-1 flex items-center gap-1"><Mail size={12}/> {scheduleLead.email}</p>
                        </div>

                        <form onSubmit={handleConfirmSchedule} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Ngày Test</label>
                                <input 
                                    type="date" 
                                    required 
                                    className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 rounded-2xl outline-none font-bold text-slate-700"
                                    value={testDate}
                                    onChange={(e) => setTestDate(e.target.value)}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Giờ Test</label>
                                <input 
                                    type="time" 
                                    required 
                                    className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 rounded-2xl outline-none font-bold text-slate-700"
                                    value={testTime}
                                    onChange={(e) => setTestTime(e.target.value)}
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="w-full bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all active:scale-[0.98] mt-4 tracking-widest text-sm uppercase flex justify-center items-center gap-2"
                            >
                                <Send size={16}/> XÁC NHẬN GỬI EMAIL
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL TẠO HỢP ĐỒNG KHI KÉO VÀO CỘT ĐÃ NHẬP HỌC */}
            {isContractModalOpen && contractLead && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-slate-100 bg-emerald-500 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black flex items-center gap-2"><FileText size={20}/> Khởi tạo Hợp đồng</h3>
                                <p className="text-xs opacity-90 mt-1">Học viên: {contractLead.name} - Khóa: {contractLead.course}</p>
                            </div>
                            <button onClick={() => setIsContractModalOpen(false)} className="hover:bg-white/20 p-2 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateContractSubmit} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Mã hợp đồng</label>
                                <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                                    value={contractForm.contractCode} onChange={(e) => setContractForm({...contractForm, contractCode: e.target.value})} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Học phí gốc (VNĐ)</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" required className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                                            value={contractForm.totalFee} onChange={(e) => setContractForm({...contractForm, totalFee: Number(e.target.value)})} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Thực thu (VNĐ)</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                                        <input type="number" required className="w-full pl-9 pr-3 py-3 bg-emerald-50 border border-emerald-200 rounded-xl outline-none font-black text-emerald-700"
                                            value={contractForm.actualFee} onChange={(e) => setContractForm({...contractForm, actualFee: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Trạng thái thanh toán</label>
                                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                                        value={contractForm.paymentStatus} onChange={(e) => setContractForm({...contractForm, paymentStatus: e.target.value})}>
                                        <option value="Chưa thanh toán">Chưa thanh toán</option>
                                        <option value="Thanh toán một phần">Thanh toán một phần</option>
                                        <option value="Đã hoàn thành">Đã hoàn thành</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Trạng thái HĐ</label>
                                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                                        value={contractForm.contractStatus} onChange={(e) => setContractForm({...contractForm, contractStatus: e.target.value})}>
                                        <option value="Nháp">Nháp</option>
                                        <option value="Đã gửi">Đã gửi cho HV</option>
                                        <option value="Đã ký">Đã ký</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-[0.98] mt-4 uppercase">
                                XÁC NHẬN TẠO HỢP ĐỒNG
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CHI TIẾT LEAD */}
            {isDetailModalOpen && selectedLead && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4 transition-all">
                    <div className="bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300 flex flex-col">
                        <div className="relative h-32 bg-gradient-to-br from-orange-400 to-orange-600 flex items-end p-8 shrink-0">
                            <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-6 right-6 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-2.5 rounded-2xl transition-all">
                                <X size={20} />
                            </button>
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-2xl flex items-center justify-center text-orange-500 font-black text-3xl absolute -bottom-10 left-8 border-8 border-white">
                                {selectedLead.name.charAt(0).toUpperCase()}
                            </div>
                        </div>

                        <div className="pt-14 p-8 flex-1 overflow-y-auto">
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

                        <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-2 gap-4 shrink-0">
                            <button
                                onClick={handleOpenEditModal}
                                className="flex items-center justify-center gap-2 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors text-sm"
                            >
                                <Edit size={16} /> Chỉnh sửa
                            </button>
                            <button
                                onClick={() => handleDeleteLead(selectedLead.id!)}
                                className="flex items-center justify-center gap-2 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl transition-colors text-sm"
                            >
                                <Trash2 size={16} /> Xóa Lead
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TẠO / SỬA LEAD */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[55] p-0 sm:p-4">
                    <div className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-orange-500 text-white shadow-lg">
                            <div>
                                <h3 className="text-2xl font-black tracking-tight">
                                    {editingLeadId ? 'Cập Nhật Thông Tin' : 'Thêm Lead Mới'}
                                </h3>
                                <p className="text-orange-100 text-xs mt-1 italic">
                                    {editingLeadId ? 'Chỉnh sửa thông tin học viên đang chọn' : 'Nhập thông tin học viên tiềm năng vào hệ thống'}
                                </p>
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
                                {editingLeadId ? 'LƯU CẬP NHẬT' : 'XÁC NHẬN LƯU THÔNG TIN'}
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