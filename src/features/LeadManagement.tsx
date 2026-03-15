import React, { useState, useEffect } from 'react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult,
  DroppableProvided,
  DraggableProvided
} from '@hello-pangea/dnd';
// ĐÃ THÊM: Send, CheckCircle2
import { Plus, X, Phone, User, Mail, BookOpen, Search, Filter, Info, Calendar, Send, CheckCircle2 } from 'lucide-react';

// ĐÃ THÊM: markTestAsSent
import { subscribeToLeads, updateLeadStatus, createLead, markTestAsSent, LeadData } from '../services/leadService';
import { subscribeToCourses, CourseData } from '../services/courseService';

const COLUMNS = ['MỚI', 'ĐÃ LIÊN HỆ', 'HẸN TEST', 'ĐÃ NHẬP HỌC', 'TẠM DỪNG'];

const LeadManagement = () => {
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  
  // States cho Tìm kiếm & Lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');

  // States quản lý Modal Tạo Mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '', phone: '', email: '', status: 'MỚI', course: '', source: '', note: ''
  });

  // States quản lý Modal Xem Chi Tiết
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);

  // Lấy data realtime
  useEffect(() => {
    const unsubscribeLeads = subscribeToLeads((data) => setLeads(data));
    const unsubscribeCourses = subscribeToCourses((data) => setCourses(data));
    return () => {
      unsubscribeLeads();
      unsubscribeCourses();
    };
  }, []);

  // Logic Lọc & Tìm kiếm
  const filteredLeads = leads.filter(lead => {
    // Tìm theo tên, sđt, email
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Tìm theo khóa học
    const matchesCourse = filterCourse === 'All' || lead.course === filterCourse;

    return matchesSearch && matchesCourse;
  });

  // Xử lý kéo thả
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }
    await updateLeadStatus(draggableId, destination.droppableId);
  };

  // Mở modal tạo mới
  const handleOpenCreateModal = (defaultStatus: string = 'MỚI') => {
    setNewLead(prev => ({ ...prev, status: defaultStatus }));
    setIsCreateModalOpen(true);
  };

  // Mở modal xem chi tiết
  const handleOpenDetailModal = (lead: LeadData) => {
    setSelectedLead(lead);
    setIsDetailModalOpen(true);
  };

  // Xử lý submit form tạo mới
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

  // ĐÃ THÊM: HÀM XỬ LÝ GỬI BÀI TEST
  const handleSendTest = async (e: React.MouseEvent, lead: LeadData) => {
    e.stopPropagation(); // Ngăn không cho click này mở Detail Modal
    
    // Cập nhật Database
    await markTestAsSent(lead.id!);

    // Mở ứng dụng Email (Mailto)
    if (lead.email) {
      const subject = encodeURIComponent("Lịch làm bài Test xếp lớp tại Talemy");
      const body = encodeURIComponent(`Chào ${lead.name},\n\nTrung tâm gửi bạn link làm bài test xếp lớp cho khóa ${lead.course}.\n\nVui lòng hoàn thành bài test tại link sau: [Điền link test]\n\nTrân trọng!`);
      window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`);
    } else {
      alert(`Đã đánh dấu là Đã gửi. Tuy nhiên học viên ${lead.name} chưa có Email trong hệ thống!`);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col relative">
      {/* HEADER: Tiêu đề + Tìm kiếm + Nút Tạo */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-black text-slate-800 whitespace-nowrap">Sales Pipeline</h2>
        
        {/* Thanh tìm kiếm và bộ lọc */}
        <div className="flex-1 max-w-2xl flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm tên, SĐT, Email..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none shadow-sm appearance-none font-medium text-slate-700 cursor-pointer"
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
            >
              <option value="All">Tất cả khóa học</option>
              {courses.map(course => (
                <option key={course.id} value={course.name}>{course.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={() => handleOpenCreateModal('MỚI')}
          className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
        >
          <Plus size={20} /> Tạo Lead Mới
        </button>
      </div>
      
      {/* BẢNG KÉO THẢ (KANBAN) */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4 h-full">
          {COLUMNS.map(columnStatus => (
            <Droppable key={columnStatus} droppableId={columnStatus}>
              {(provided: DroppableProvided) => (
                <div 
                  ref={provided.innerRef} 
                  {...provided.droppableProps}
                  className="bg-slate-100 min-w-[300px] w-[300px] rounded-3xl p-4 flex flex-col border border-slate-200/60"
                >
                  <div className="flex justify-between items-center mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-700 tracking-wide text-sm">{columnStatus}</h3>
                      <span className="bg-slate-200 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">
                        {filteredLeads.filter(l => l.status === columnStatus).length}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleOpenCreateModal(columnStatus)}
                      className="text-slate-400 hover:text-orange-500 hover:bg-white p-1.5 rounded-lg transition-all shadow-sm"
                      title={`Thêm lead vào mục ${columnStatus}`}
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
                            onClick={() => handleOpenDetailModal(lead)} // Click để xem chi tiết
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-orange-200 transition-all group cursor-pointer flex flex-col"
                          >
                            <p className="font-bold text-slate-800 group-hover:text-orange-600 transition-colors">{lead.name}</p>
                            <div className="space-y-1.5 mt-2">
                                <p className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                                    <Phone size={13} className="text-slate-400"/> {lead.phone}
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-md">
                                        {lead.course}
                                    </span>
                                </div>
                            </div>

                            {/* ĐÃ THÊM: NÚT GỬI TEST (Chỉ hiện ở cột HẸN TEST) */}
                            {columnStatus === 'HẸN TEST' && (
                              <div className="mt-4 pt-3 border-t border-slate-50">
                                {!lead.isTestSent ? (
                                  <button 
                                    onClick={(e) => handleSendTest(e, lead)}
                                    className="w-full py-1.5 px-3 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 flex items-center justify-center gap-2 text-[11px] font-bold transition-colors"
                                  >
                                    <Send size={13} /> Gửi bài Test
                                  </button>
                                ) : (
                                  <div className="w-full py-1.5 px-3 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center gap-2 text-[11px] font-bold">
                                    <CheckCircle2 size={13} /> Đã gửi bài Test
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

      {/* ----------------- MODAL CHI TIẾT LEAD ----------------- */}
      {isDetailModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="relative h-24 bg-gradient-to-r from-orange-400 to-orange-500 flex items-end p-6">
                <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-2 rounded-full transition-all">
                    <X size={20} />
                </button>
                <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-orange-500 font-black text-2xl absolute -bottom-8 border-4 border-white">
                    {selectedLead.name.charAt(0).toUpperCase()}
                </div>
            </div>

            <div className="pt-12 p-6">
                <h3 className="text-2xl font-black text-slate-800 mb-1">{selectedLead.name}</h3>
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg mb-6 tracking-wide">
                    Tình trạng: <span className="text-orange-500">{selectedLead.status}</span>
                </span>

                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0"><Phone size={18} /></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số điện thoại</p>
                            <p className="font-bold text-slate-700">{selectedLead.phone}</p>
                        </div>
                    </div>

                    {selectedLead.email && (
                    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0"><Mail size={18} /></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email liên hệ</p>
                            <p className="font-bold text-slate-700">{selectedLead.email}</p>
                        </div>
                    </div>
                    )}

                    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 shrink-0"><BookOpen size={18} /></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Khóa học quan tâm</p>
                            <p className="font-bold text-slate-700">{selectedLead.course}</p>
                        </div>
                    </div>

                    {(selectedLead.source || selectedLead.note) && (
                        <div className="bg-slate-50 p-4 rounded-2xl mt-4 border border-slate-100">
                            {selectedLead.source && (
                                <p className="text-sm text-slate-600 mb-2">
                                    <span className="font-bold">Nguồn:</span> {selectedLead.source}
                                </p>
                            )}
                            {selectedLead.note && (
                                <div className="text-sm text-slate-600">
                                    <span className="font-bold block mb-1">Ghi chú:</span> 
                                    <p className="italic bg-white p-3 rounded-xl border border-slate-200">{selectedLead.note}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL TẠO LEAD ----------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-500 text-white">
              <h3 className="text-xl font-bold">Thêm Học Viên Tiềm Năng</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Họ và Tên *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-slate-400" size={18}/>
                    <input required type="text" className="w-full pl-10 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none" value={newLead.name} onChange={(e) => setNewLead({...newLead, name: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Số điện thoại *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-slate-400" size={18}/>
                    <input required type="text" className="w-full pl-10 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none" value={newLead.phone} onChange={(e) => setNewLead({...newLead, phone: e.target.value})} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-400" size={18}/>
                  <input type="email" className="w-full pl-10 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none" value={newLead.email} onChange={(e) => setNewLead({...newLead, email: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Khóa học quan tâm *</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-3 text-slate-400" size={18}/>
                    <select required className="w-full pl-10 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white" value={newLead.course} onChange={(e) => setNewLead({...newLead, course: e.target.value})}>
                      <option value="" disabled>-- Chọn khóa học --</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.name}>{course.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none font-semibold text-orange-600" value={newLead.status} onChange={(e) => setNewLead({...newLead, status: e.target.value})}>
                    {COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nguồn khách hàng</label>
                <input type="text" placeholder="VD: Facebook, Bạn bè giới thiệu..." className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none" value={newLead.source} onChange={(e) => setNewLead({...newLead, source: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Ghi chú</label>
                <textarea className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none h-20" value={newLead.note} onChange={(e) => setNewLead({...newLead, note: e.target.value})}></textarea>
              </div>

              <button type="submit" className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all mt-4">
                Lưu Học Viên Tiềm Năng
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* CSS làm mượt thanh cuộn */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default LeadManagement;