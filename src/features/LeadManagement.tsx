import React, { useState, useEffect } from 'react';
import {
    DragDropContext, Droppable, Draggable,
    DropResult, DroppableProvided, DraggableProvided
} from '@hello-pangea/dnd';
import {
    Plus, X, Phone, User, Mail, BookOpen,
    Search, Filter, Send, Edit, Trash2, FileText, DollarSign
} from 'lucide-react';
import emailjs from '@emailjs/browser'; 

import {
    subscribeToLeads, updateLeadStatus, createLead,
    sendTestSchedule, updateLead, deleteLead, LeadData
} from '../services/leadService';
import { subscribeToCourses, CourseData } from '../services/courseService';

// IMPORT SERVICES CHO HỢP ĐỒNG, HỌC VIÊN VÀ NHÂN SỰ
import { createStudent } from '../services/studentService';
import { createContract } from '../services/contractService';
import { subscribeToStaffByPosition, StaffData } from '../services/staffService';

const COLUMNS = ['MỚI', 'ĐÃ LIÊN HỆ', 'HẸN TEST', 'ĐÃ NHẬP HỌC', 'TẠM DỪNG'];

const LeadManagement = () => {
    // ------------------- STATES CHO DATA -------------------
    const [leads, setLeads] = useState<LeadData[]>([]);
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [teachers, setTeachers] = useState<StaffData[]>([]); // Dùng StaffData

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCourse, setFilterCourse] = useState('All');

    // ------------------- STATES CHO MODAL CREATE / EDIT LEAD -------------------
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
    const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', status: 'MỚI', course: '', source: '', note: '' });

    // ------------------- STATES CHO MODAL VIEW DETAIL -------------------
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);

    // ------------------- STATES CHO MODAL GỬI EMAIL LỊCH TEST -------------------
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleLead, setScheduleLead] = useState<LeadData | null>(null);
    const [testDate, setTestDate] = useState('');
    const [testTime, setTestTime] = useState('');

    // ------------------- STATES CHO MODAL TẠO HỢP ĐỒNG -------------------
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [contractLead, setContractLead] = useState<LeadData | null>(null);
    const [contractForm, setContractForm] = useState({
        contractCode: '',
        studentCCCD: '',
        studentAddress: '',
        teacherId: '',
        courseName: '', 
        totalSessions: 0,
        sessionsPerWeek: '2',
        totalFee: 0,
        paymentMethod: '1_LẦN',
        firstInstallment: 0,
        secondInstallment: 0,
        secondDeadline: '',
        note: ''
    });

    // ------------------- EFFECT LẮNG NGHE REALTIME DATA -------------------
    useEffect(() => {
        const unsubscribeLeads = subscribeToLeads(setLeads);
        const unsubscribeCourses = subscribeToCourses(setCourses);
        const unsubscribeTeachers = subscribeToStaffByPosition('teacher', setTeachers);
        
        return () => {
            unsubscribeLeads();
            unsubscribeCourses();
            unsubscribeTeachers();
        };
    }, []);

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || lead.phone.includes(searchTerm) || (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCourse = filterCourse === 'All' || lead.course === filterCourse;
        return matchesSearch && matchesCourse;
    });

    // ------------------- LOGIC KÉO THẢ VÀ TỰ ĐỘNG ĐIỀN FORM HỢP ĐỒNG -------------------
    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

        await updateLeadStatus(draggableId, destination.droppableId);

        if (destination.droppableId === 'ĐÃ NHẬP HỌC') {
            const leadToEnroll = leads.find(l => l.id === draggableId);
            if (leadToEnroll) {
                const matchedCourse = courses.find(c => c.name === leadToEnroll.course);
                const defaultFee = matchedCourse ? matchedCourse.price : 0;
                const defaultDuration = matchedCourse ? matchedCourse.duration : 0;

                setContractLead(leadToEnroll);
                setContractForm({
                    contractCode: `HD-${Math.floor(Date.now() / 1000)}`,
                    studentCCCD: '', 
                    studentAddress: '', 
                    teacherId: '',
                    courseName: leadToEnroll.course || '', 
                    totalSessions: defaultDuration,
                    sessionsPerWeek: '2',
                    totalFee: defaultFee,
                    paymentMethod: '1_LẦN', 
                    firstInstallment: 0, 
                    secondInstallment: 0, 
                    secondDeadline: '', 
                    note: ''
                });
                setIsContractModalOpen(true);
            }
        }
    };

    // ------------------- HÀM XỬ LÝ KHI ĐỔI KHÓA HỌC TRONG COMBOBOX -------------------
    const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCourseName = e.target.value;
        const matchedCourse = courses.find(c => c.name === selectedCourseName);
        
        setContractForm(prev => ({
            ...prev,
            courseName: selectedCourseName,
            totalFee: matchedCourse ? matchedCourse.price : 0,
            totalSessions: matchedCourse ? matchedCourse.duration : 0
        }));
    };

    // ------------------- CÁC HÀM XỬ LÝ CHUNG CHO LEAD -------------------
    const handleOpenCreateModal = (defaultStatus: string = 'MỚI') => { setEditingLeadId(null); setNewLead({ name: '', phone: '', email: '', status: defaultStatus, course: '', source: '', note: '' }); setIsCreateModalOpen(true); };
    const handleOpenEditModal = () => { if (!selectedLead) return; setNewLead({ name: selectedLead.name, phone: selectedLead.phone, email: selectedLead.email || '', status: selectedLead.status, course: selectedLead.course, source: selectedLead.source || '', note: selectedLead.note || '' }); setEditingLeadId(selectedLead.id!); setIsDetailModalOpen(false); setIsCreateModalOpen(true); };
    const handleOpenDetailModal = (lead: LeadData) => { setSelectedLead(lead); setIsDetailModalOpen(true); };
    const handleDeleteLead = async (id: string) => { if (window.confirm("Bạn có chắc chắn muốn xóa học viên này?")) { try { await deleteLead(id); setIsDetailModalOpen(false); setSelectedLead(null); } catch (error) { alert("Lỗi khi xóa!"); } } };
    
    const handleCreateLead = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (!newLead.course) return alert("Vui lòng chọn khóa học!"); 
        try { 
            if (editingLeadId) await updateLead(editingLeadId, newLead); 
            else await createLead(newLead); 
            setIsCreateModalOpen(false); 
            setEditingLeadId(null); 
        } catch (error) { alert("Có lỗi xảy ra!"); } 
    };

    // ------------------- LOGIC GỬI LỊCH TEST -------------------
    const openScheduleModal = (e: React.MouseEvent, lead: LeadData) => { 
        e.stopPropagation(); 
        if (!lead.email) return alert("Học viên này chưa có Email!"); 
        setScheduleLead(lead); 
        setIsScheduleModalOpen(true); 
    };

    const handleConfirmSchedule = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (!scheduleLead || !testDate || !testTime) return; 
        try { 
            // Cấu hình gửi mail (EmailJS)
            await emailjs.send('service_ymxefrn', 'template_wlwvjhe', { 
                email: scheduleLead.email, 
                to_name: scheduleLead.name, 
                course_name: scheduleLead.course, 
                test_date: testDate, 
                test_time: testTime, 
            }, 'mdfO13Zb5XWh4IbcJ'); 
            
            // Cập nhật số lần gửi vào Firebase
            await sendTestSchedule(scheduleLead.id!, scheduleLead.testRemindCount || 0); 
            
            setIsScheduleModalOpen(false); 
            setScheduleLead(null); 
            setTestDate(''); 
            setTestTime(''); 
            alert('Đã gửi email thành công!'); 
        } catch (error) { 
            alert('Gửi email thất bại!'); 
        } 
    };

    // ------------------- LOGIC LƯU HỢP ĐỒNG -------------------
    const handleCreateContractSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contractLead) return;
        if (!contractForm.teacherId) return alert("Vui lòng chọn Giáo viên!");
        if (!contractForm.courseName) return alert("Vui lòng chọn Khóa học!");

        try {
            const selectedTeacher = teachers.find(t => t.id === contractForm.teacherId);
            const selectedCourse = courses.find(c => c.name === contractForm.courseName);
            
            if (!selectedTeacher) return alert("Không tìm thấy dữ liệu giáo viên!");

            const generatedStudentCode = `HV${Math.floor(Math.random() * 10000)}`;

            // 1. TẠO HỌC VIÊN TRƯỚC
            const newStudentId = await createStudent({
                studentCode: generatedStudentCode,
                fullName: contractLead.name,
                phone: contractLead.phone,
                email: contractLead.email || '',
                cccd: contractForm.studentCCCD,
                address: contractForm.studentAddress,
                enrolledCourse: contractForm.courseName,
                totalFee: Number(contractForm.totalFee),
                paidAmount: 0,
                status: 'CHỜ THANH TOÁN',
                note: `Chuyển từ Lead. Mã HĐ: ${contractForm.contractCode}`
            });

            // 2. TẠO HỢP ĐỒNG 
            await createContract({
                contractCode: contractForm.contractCode,
                studentId: newStudentId, 
                teacherId: selectedTeacher.id!,
                
                studentName: contractLead.name,
                studentCCCD: contractForm.studentCCCD,
                studentPhone: contractLead.phone,
                studentAddress: contractForm.studentAddress,
                
                // DATA TỪ BẢNG STAFF
                teacherName: selectedTeacher.name, // Lấy trường name từ bảng staff
                teacherCCCD: selectedTeacher.cccd || '',
                teacherPhone: selectedTeacher.phone || '',
                teacherAddress: selectedTeacher.address || '',
                
                courseName: contractForm.courseName,
                courseDuration: selectedCourse?.duration || 0,
                totalSessions: Number(contractForm.totalSessions),
                sessionsPerWeek: String(contractForm.sessionsPerWeek),

                totalFee: Number(contractForm.totalFee),
                paidAmount: 0,
                paymentMethod: contractForm.paymentMethod as '1_LẦN' | '2_LẦN',
                firstInstallment: Number(contractForm.firstInstallment),
                secondInstallment: Number(contractForm.secondInstallment),
                secondDeadline: contractForm.secondDeadline,

                contractStatus: 'NHÁP',
                note: contractForm.note
            });
            
            alert("Đã tạo Hồ sơ Học viên và Hợp đồng thành công!");
            setIsContractModalOpen(false);
            setContractLead(null);
        } catch (error) {
            console.error("Lỗi khi tạo hợp đồng:", error);
            alert("Có lỗi khi tạo hợp đồng. Vui lòng kiểm tra console.");
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col relative overflow-hidden bg-slate-50">
            {/* Header, Search & Filter */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sales Pipeline</h2>
                    <p className="text-slate-500 text-sm italic">Quản lý và theo dõi tiến độ tư vấn học viên</p>
                </div>
                <div className="w-full xl:max-w-3xl flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Tìm tên, SĐT, Email..." className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 outline-none shadow-sm text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="relative w-full sm:w-48 lg:w-64">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-200 outline-none font-bold text-slate-700 cursor-pointer text-sm" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
                            <option value="All">Tất cả khóa học</option>
                            {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <button onClick={() => handleOpenCreateModal('MỚI')} className="w-full sm:w-auto bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-200 hover:bg-orange-600 flex items-center justify-center gap-2 text-sm transition-all active:scale-95">
                        <Plus size={20} /> <span className="sm:hidden lg:inline">Tạo Lead Mới</span>
                    </button>
                </div>
            </div>

            {/* KANBAN BOARD */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 h-full snap-x snap-mandatory lg:snap-none custom-scrollbar">
                    {COLUMNS.map(columnStatus => (
                        <Droppable key={columnStatus} droppableId={columnStatus}>
                            {(provided: DroppableProvided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps} className="bg-slate-100/60 min-w-[280px] md:min-w-[320px] rounded-[2rem] p-4 flex flex-col border border-slate-200/40 snap-center">
                                    <div className="flex justify-between items-center mb-5 px-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-slate-700 tracking-tight text-sm uppercase">{columnStatus}</h3>
                                            <span className="bg-white text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm border border-orange-100">{filteredLeads.filter(l => l.status === columnStatus).length}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                        {filteredLeads.filter(l => l.status === columnStatus).map((lead, index) => (
                                            <Draggable key={lead.id} draggableId={lead.id!} index={index}>
                                                {(provided: DraggableProvided) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={() => handleOpenDetailModal(lead)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-orange-200 transition-all cursor-pointer flex flex-col group">
                                                        <p className="font-black text-slate-800 text-sm group-hover:text-orange-600 transition-colors">{lead.name}</p>
                                                        <div className="space-y-2 mt-3">
                                                            <p className="text-[11px] text-slate-500 flex items-center gap-2 font-bold"><Phone size={13} className="text-orange-400"/> {lead.phone}</p>
                                                            <span className="inline-block text-[9px] text-orange-600 font-black bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 uppercase">{lead.course}</span>
                                                        </div>
                                                        
                                                        {/* NÚT GỬI LỊCH TEST CHUẨN */}
                                                        {lead.status === 'HẸN TEST' && (
                                                            <button 
                                                                onClick={(e) => openScheduleModal(e, lead)} 
                                                                className="mt-4 w-full py-2.5 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-500 hover:text-white transition-colors flex justify-center items-center gap-2 text-xs border border-blue-100 hover:border-blue-500"
                                                            >
                                                                <Mail size={14} /> 
                                                                {(lead.testRemindCount && lead.testRemindCount > 0) 
                                                                    ? `Gửi lại (${lead.testRemindCount})` 
                                                                    : 'Gửi lịch Test'}
                                                            </button>
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

            {/* MODAL VIEW DETAIL LEAD */}
            {isDetailModalOpen && selectedLead && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsDetailModalOpen(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-black text-slate-800 text-lg">Chi tiết Học viên</h3>
                            <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-xl shadow-sm"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1"><p className="text-[10px] font-bold text-slate-400 uppercase">Họ và Tên</p><p className="font-bold text-slate-700">{selectedLead.name}</p></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><p className="text-[10px] font-bold text-slate-400 uppercase">Số điện thoại</p><p className="font-bold text-slate-700">{selectedLead.phone}</p></div>
                                <div className="space-y-1"><p className="text-[10px] font-bold text-slate-400 uppercase">Khóa học</p><span className="inline-block text-xs text-orange-600 font-black bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 uppercase">{selectedLead.course}</span></div>
                            </div>
                            <div className="space-y-1"><p className="text-[10px] font-bold text-slate-400 uppercase">Email</p><p className="font-bold text-slate-700">{selectedLead.email || 'Chưa cập nhật'}</p></div>
                            <div className="space-y-1"><p className="text-[10px] font-bold text-slate-400 uppercase">Trạng thái hiện tại</p><span className="inline-block text-xs font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase border border-slate-200">{selectedLead.status}</span></div>
                            <div className="space-y-1"><p className="text-[10px] font-bold text-slate-400 uppercase">Ghi chú</p><p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 min-h-[80px]">{selectedLead.note || 'Không có ghi chú'}</p></div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                            <button onClick={handleOpenEditModal} className="flex-1 py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-500 hover:text-white transition-colors flex justify-center items-center gap-2 text-sm"><Edit size={16}/> Sửa</button>
                            <button onClick={() => handleDeleteLead(selectedLead.id!)} className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-500 hover:text-white transition-colors flex justify-center items-center gap-2 text-sm"><Trash2 size={16}/> Xóa</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CREATE / EDIT LEAD */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-black text-slate-800 text-lg">{editingLeadId ? 'Cập nhật Lead' : 'Thêm Lead mới'}</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-xl shadow-sm"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreateLead} className="p-6 space-y-4">
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Họ và Tên *</label><input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-bold" value={newLead.name} onChange={(e) => setNewLead({...newLead, name: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Số điện thoại *</label><input type="tel" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-bold" value={newLead.phone} onChange={(e) => setNewLead({...newLead, phone: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Khóa học *</label><select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-bold text-slate-700" value={newLead.course} onChange={(e) => setNewLead({...newLead, course: e.target.value})}><option value="" disabled>-- Chọn --</option>{courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                            </div>
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Email</label><input type="email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-bold" value={newLead.email} onChange={(e) => setNewLead({...newLead, email: e.target.value})} /></div>
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Nguồn</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-bold" value={newLead.source} onChange={(e) => setNewLead({...newLead, source: e.target.value})} placeholder="VD: Facebook, Google..." /></div>
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Trạng thái</label><select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-bold text-slate-700" value={newLead.status} onChange={(e) => setNewLead({...newLead, status: e.target.value})}>{COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}</select></div>
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Ghi chú</label><textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-medium resize-none h-20" value={newLead.note} onChange={(e) => setNewLead({...newLead, note: e.target.value})} /></div>
                            <button type="submit" className="w-full py-4 bg-orange-500 text-white font-black rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200">{editingLeadId ? 'LƯU THAY ĐỔI' : 'TẠO LEAD MỚI'}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL GỬI EMAIL LỊCH TEST */}
            {isScheduleModalOpen && scheduleLead && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="p-6 bg-blue-500 flex justify-between items-center text-white">
                            <h3 className="font-black text-lg">Gửi lịch Test</h3>
                            <button onClick={() => setIsScheduleModalOpen(false)} className="hover:bg-white/20 p-2 rounded-xl transition-colors"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleConfirmSchedule} className="p-6 space-y-4">
                            <p className="text-sm text-slate-600 mb-4">Gửi email cho: <strong className="text-slate-800">{scheduleLead.email}</strong></p>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Ngày Test</label>
                                <input type="date" required className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 rounded-2xl outline-none font-bold text-slate-700" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Giờ Test</label>
                                <input type="time" required className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 rounded-2xl outline-none font-bold text-slate-700" value={testTime} onChange={(e) => setTestTime(e.target.value)} />
                            </div>
                            <button type="submit" className="w-full bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-blue-600 transition-all mt-4 uppercase"><Send size={16} className="inline mr-2"/> XÁC NHẬN GỬI</button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL TẠO HỢP ĐỒNG KHI KÉO VÀO "ĐÃ NHẬP HỌC" */}
            {isContractModalOpen && contractLead && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 bg-orange-500 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-black flex items-center gap-2"><FileText size={20}/> Khởi tạo Hồ sơ & Hợp đồng</h3>
                                <p className="text-xs opacity-90 mt-1">Hoàn thiện thông tin cho học viên: <strong>{contractLead.name}</strong></p>
                            </div>
                            <button onClick={() => setIsContractModalOpen(false)} className="hover:bg-white/20 p-2 rounded-xl transition-all"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCreateContractSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            {/* THÔNG TIN HỌC VIÊN */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm border-b pb-2"><User size={16} className="text-orange-500"/> Thông tin Học viên (Bên A)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Họ và Tên</label>
                                        <input type="text" disabled className="w-full p-3 bg-slate-100 rounded-xl font-bold text-slate-500 cursor-not-allowed" value={contractLead.name} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Số CCCD/CMND *</label>
                                        <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-medium" 
                                            value={contractForm.studentCCCD} onChange={(e) => setContractForm({...contractForm, studentCCCD: e.target.value})} placeholder="Nhập số CCCD..." />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Địa chỉ liên lạc *</label>
                                    <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-medium" 
                                        value={contractForm.studentAddress} onChange={(e) => setContractForm({...contractForm, studentAddress: e.target.value})} placeholder="Nhập địa chỉ..." />
                                </div>
                            </div>

                            {/* THÔNG TIN KHÓA HỌC VÀ GIÁO VIÊN */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm border-b pb-2"><BookOpen size={16} className="text-orange-500"/> Khóa học & Giáo viên (Bên B)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Khóa học đăng ký *</label>
                                        <select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-bold text-slate-700"
                                            value={contractForm.courseName} onChange={handleCourseChange}>
                                            <option value="" disabled>-- Chọn Khóa học --</option>
                                            {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Chọn Giáo viên *</label>
                                        <select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-bold text-slate-700"
                                            value={contractForm.teacherId} onChange={(e) => setContractForm({...contractForm, teacherId: e.target.value})}>
                                            <option value="" disabled>-- Chọn Giáo viên --</option>
                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name} (SĐT: {t.phone})</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Số buổi học</label>
                                        <input type="number" readOnly className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-600 cursor-not-allowed"
                                            value={contractForm.totalSessions} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Lịch học (Buổi/Tuần) *</label>
                                        <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-bold"
                                            value={contractForm.sessionsPerWeek} onChange={(e) => setContractForm({...contractForm, sessionsPerWeek: e.target.value})} placeholder="VD: 2" />
                                    </div>
                                </div>
                            </div>

                            {/* HỌC PHÍ & THANH TOÁN */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm border-b pb-2"><DollarSign size={16} className="text-orange-500"/> Học phí & Thanh toán</h4>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Mã hợp đồng</label>
                                        <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-bold text-slate-700"
                                            value={contractForm.contractCode} onChange={(e) => setContractForm({...contractForm, contractCode: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Tổng học phí (VNĐ) *</label>
                                        <input type="text" readOnly className="w-full p-3 bg-orange-50 border border-orange-200 rounded-xl outline-none text-sm font-black text-orange-700 cursor-not-allowed"
                                            value={contractForm.totalFee > 0 ? contractForm.totalFee.toLocaleString('vi-VN') : '0'} />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Hình thức đóng phí</label>
                                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 focus:border-orange-500"
                                        value={contractForm.paymentMethod} onChange={(e) => setContractForm({...contractForm, paymentMethod: e.target.value})}>
                                        <option value="1_LẦN">Đóng toàn bộ 1 lần</option>
                                        <option value="2_LẦN">Chia làm 2 lần thanh toán</option>
                                    </select>
                                </div>

                                {contractForm.paymentMethod === '2_LẦN' && (
                                    <div className="grid grid-cols-3 gap-3 bg-slate-100 p-4 rounded-xl border border-slate-200">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Đợt 1 (VNĐ)</label>
                                            <input type="number" required className="w-full p-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-orange-500" value={contractForm.firstInstallment} onChange={(e) => setContractForm({...contractForm, firstInstallment: Number(e.target.value)})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Đợt 2 (VNĐ)</label>
                                            <input type="number" required className="w-full p-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-orange-500" value={contractForm.secondInstallment} onChange={(e) => setContractForm({...contractForm, secondInstallment: Number(e.target.value)})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Hạn Đợt 2</label>
                                            <input type="text" placeholder="VD: Trước buổi 5" required className="w-full p-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-orange-500" value={contractForm.secondDeadline} onChange={(e) => setContractForm({...contractForm, secondDeadline: e.target.value})} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="w-full bg-orange-500 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all active:scale-[0.98] mt-4 uppercase">
                                XÁC NHẬN LƯU & TẠO HỢP ĐỒNG
                            </button>
                        </form>
                    </div>
                </div>
            )}
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }`}</style>
        </div>
    );
};

export default LeadManagement;