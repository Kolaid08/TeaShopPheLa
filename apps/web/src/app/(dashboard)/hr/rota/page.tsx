'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, UserPlus, Clock, X, Save } from 'lucide-react';
import { Button, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '@/components/ui/core';
import { api, ShiftLog, Shift, Employee } from '@/lib/api';
import { toast } from 'sonner';

export default function RotaManagementPage() {
  const [logs, setLogs] = useState<ShiftLog[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [logList, shiftList, empList] = await Promise.all([
        api.getShiftLogs(),
        api.getShifts(),
        api.getEmployees()
      ]);
      setLogs(logList);
      setShifts(shiftList);
      setEmployees(empList);
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu Rota');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getWeekDays = () => {
    const today = new Date();
    // Start of current week (Monday)
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - distanceToMonday + (currentWeekOffset * 7));
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const weekDays = getWeekDays();

  const handleOpenAssign = (date: Date, shift: Shift) => {
    setSelectedDate(date);
    setSelectedShift(shift);
    setSelectedEmployeeId('');
    setIsAssignModalOpen(true);
  };

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedShift || !selectedEmployeeId) {
      toast.error('Vui lòng chọn nhân viên');
      return;
    }

    try {
      // Local timezone string date formatted YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}T00:00:00.000Z`;

      await api.scheduleShift({
        EmployeeID: parseInt(selectedEmployeeId),
        ShiftID: selectedShift.ShiftID,
        WorkDate: dateString
      });
      toast.success('Xếp ca thành công');
      setIsAssignModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xếp ca');
    }
  };

  const handleUnassignShift = async (shiftLogId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ca này?')) return;
    try {
      await api.unscheduleShift(shiftLogId);
      toast.success('Xóa ca thành công');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa ca');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif font-black text-3xl text-foreground tracking-tight flex items-center gap-2">
            <Calendar className="w-8 h-8 text-primary" />
            Xếp Ca Làm Việc (Rota)
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">
            Lên lịch làm việc hàng tuần cho nhân viên
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCurrentWeekOffset(prev => prev - 1)}>&larr; Tuần trước</Button>
          <Button variant="outline" onClick={() => setCurrentWeekOffset(0)}>Tuần này</Button>
          <Button variant="outline" onClick={() => setCurrentWeekOffset(prev => prev + 1)}>Tuần tới &rarr;</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-40 font-bold">Ca làm việc</TableHead>
                {weekDays.map(date => (
                  <TableHead key={date.toISOString()} className="text-center min-w-[150px]">
                    <div className="font-bold text-foreground">
                      {date.toLocaleDateString('vi-VN', { weekday: 'short' })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map(shift => (
                <TableRow key={shift.ShiftID}>
                  <TableCell className="font-medium align-top bg-muted/10">
                    <div className="font-bold">{shift.ShiftName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {shift.StartTime.slice(0,5)} - {shift.EndTime.slice(0,5)}
                    </div>
                  </TableCell>
                  {weekDays.map(date => {
                    // Match date strictly by local day/month/year
                    const scheduledForCell = logs.filter(l => {
                      const lDate = new Date(l.WorkDate);
                      return l.ShiftID === shift.ShiftID &&
                             lDate.getDate() === date.getDate() &&
                             lDate.getMonth() === date.getMonth() &&
                             lDate.getFullYear() === date.getFullYear();
                    });

                    return (
                      <TableCell key={date.toISOString()} className="align-top border-l border-border/40 p-2">
                        <div className="flex flex-col gap-2">
                          {scheduledForCell.map(log => (
                            <div key={log.ShiftLogID} className="bg-primary/10 border border-primary/20 p-2 rounded-lg relative group flex flex-col items-start text-left">
                              <span className="text-xs font-bold text-primary truncate w-full">
                                {log.Employee?.FullName || 'Unknown'}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {log.ShiftStatus}
                              </span>
                              {log.ShiftStatus === 'SCHEDULED' && (
                                <button
                                  onClick={() => handleUnassignShift(log.ShiftLogID)}
                                  className="absolute top-1 right-1 p-1 text-destructive hover:bg-destructive/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="w-full h-8 border border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                            onClick={() => handleOpenAssign(date, shift)}
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1" />
                            Xếp ca
                          </Button>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Xếp ca cho nhân viên"
      >
        <form onSubmit={handleAssignShift} className="space-y-4">
          <div className="bg-muted p-3 rounded-xl mb-4 text-sm">
            <p><strong>Ngày:</strong> {selectedDate?.toLocaleDateString('vi-VN')}</p>
            <p><strong>Ca làm:</strong> {selectedShift?.ShiftName} ({selectedShift?.StartTime.slice(0,5)} - {selectedShift?.EndTime.slice(0,5)})</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Chọn nhân viên</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              required
            >
              <option value="">-- Chọn nhân viên --</option>
              {employees.map(emp => (
                <option key={emp.EmployeeID} value={emp.EmployeeID}>
                  {emp.FullName} - {emp.Role?.RoleName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
            <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)} className="rounded-xl">Hủy</Button>
            <Button type="submit" className="rounded-xl font-bold bg-primary text-white">Xác nhận</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
