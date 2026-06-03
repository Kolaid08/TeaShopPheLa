'use client';

import React, { useEffect, useState } from 'react';
import {
  Clock,
  UserCheck,
  Calendar,
  ShieldCheck,
  PlayCircle,
  StopCircle,
  RefreshCw,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/core';
import { api, ShiftLog, Shift } from '@/lib/api';
import { toast } from 'sonner';

export default function ShiftLogsAttendance() {
  const [logs, setLogs] = useState<ShiftLog[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const loadData = async () => {
    try {
      const active = api.getCurrentUser();
      setActiveUser(active);

      const [logList, shiftList] = await Promise.all([api.getShiftLogs(), api.getShifts()]);
      setLogs(logList);
      setShifts(shiftList);

      if (active) {
        const hasActive = logList.find(
          (l) => l.EmployeeID === active.EmployeeID && !l.CheckOutTime,
        );
        setIsCheckedIn(!!hasActive);
      }
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckIn = async (shiftId: number) => {
    try {
      await api.checkIn(shiftId);
      toast.success('Check-in thành công! Trạng thái Barista: Bắt đầu ca trực.');
      setIsCheckedIn(true);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi Check-in ca trực.');
    }
  };

  const handleCheckOut = async () => {
    try {
      await api.checkOut();
      toast.success('Check-out thành công. Hệ thống đã ghi nhận giờ tan ca.');
      setIsCheckedIn(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi Check-out.');
    }
  };

  // Calendar days generation for simple high-fidelity grid visualization
  const currentMonthDays = [];
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    currentMonthDays.push(d);
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif font-black text-3xl text-foreground tracking-tight">
            Điểm Danh & Ca Làm Việc
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-1">
            Lịch sử điểm danh đi muộn, về sớm và chấm công vân tay điện tử
          </p>
        </div>
        <div className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <span>
            Tháng {today.getMonth() + 1} / {today.getFullYear()}
          </span>
        </div>
      </div>

      {/* Barista Clocking Operations Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 border-primary/40 bg-primary/5 cafe-panel flex flex-col justify-between p-6">
          <div className="space-y-3">
            <Badge variant={isCheckedIn ? 'success' : 'neutral'} className="font-bold">
              {isCheckedIn ? 'Barista Đang Làm Việc' : 'Barista Ngoại Tuyến'}
            </Badge>
            <h3 className="font-serif font-black text-xl text-foreground tracking-tight">
              {activeUser?.FullName || 'Chưa đăng nhập'}
            </h3>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
              Quyền: {activeUser?.Role || 'STAFF'}
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {!isCheckedIn ? (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Chọn ca trực để Check-in:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {shifts.map((s) => (
                    <Button
                      key={s.ShiftID}
                      onClick={() => handleCheckIn(s.ShiftID)}
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-[10px] font-bold flex flex-col py-1.5 h-auto text-primary hover:bg-primary hover:text-white"
                    >
                      <span>{s.ShiftName.split(' ')[1]}</span>
                      <span className="font-mono text-[8px] font-semibold text-muted-foreground">
                        {s.StartTime}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <Button
                onClick={handleCheckOut}
                variant="danger"
                className="w-full py-3.5 rounded-xl font-serif uppercase tracking-wider text-xs font-bold gap-2 text-white"
              >
                <StopCircle className="w-4.5 h-4.5" /> Check-out kết thúc ca
              </Button>
            )}
          </div>
        </Card>

        {/* Dynamic Shift Presets Table */}
        <Card className="col-span-2 cafe-panel p-0 overflow-hidden">
          <CardHeader className="p-4 border-b border-border bg-muted/20">
            <CardTitle>Preset Ca Trực Cửa Hàng</CardTitle>
            <CardDescription>
              Thời gian bắt đầu và kết thúc quy định các ca làm việc
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên Ca</TableHead>
                <TableHead>Bắt đầu</TableHead>
                <TableHead>Kết thúc</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((s) => (
                <TableRow key={s.ShiftID}>
                  <TableCell className="font-serif font-black text-sm text-foreground">
                    {s.ShiftName}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-primary">
                    {s.StartTime}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-primary">
                    {s.EndTime}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.Note || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* High-Fidelity Calendar Month Grid view */}
      <Card className="cafe-panel">
        <CardHeader className="pb-4 border-b border-border/60">
          <CardTitle>Bản Đồ Điểm Danh Ca Làm Việc Tháng {today.getMonth() + 1}</CardTitle>
          <CardDescription>
            Biểu đồ lịch sử công, chấm vân tay điểm danh đi muộn của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-2 border-b border-border/40 pb-2">
            <div>CN</div>
            <div>T2</div>
            <div>T3</div>
            <div>T4</div>
            <div>T5</div>
            <div>T6</div>
            <div>T7</div>
          </div>

          <div className="grid grid-cols-7 gap-3 h-52">
            {/* offset days to match weekday starts (mocking current month start on Tuesday) */}
            <div className="bg-transparent" />

            {currentMonthDays.map((day) => {
              // check if there is an active log for this date day
              const logMatch = logs.find((l) => {
                const date = new Date(l.WorkDate);
                return date.getDate() === day && l.EmployeeID === activeUser?.EmployeeID;
              });

              return (
                <div
                  key={day}
                  className={`rounded-xl border flex flex-col items-center justify-between p-2 h-14 relative group transition-all hover:border-primary ${
                    logMatch
                      ? logMatch.ShiftStatus === 'LATE'
                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-600'
                        : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600'
                      : 'bg-card border-border/60 text-muted-foreground/50'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold self-start">{day}</span>
                  {logMatch && (
                    <span className="text-[8px] font-extrabold uppercase tracking-wider block font-mono self-end">
                      {logMatch.ShiftStatus}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Attendance log history table */}
      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        <CardHeader className="p-4 border-b border-border bg-muted/20">
          <CardTitle>Nhật Ký Vân Tay Ra/Vào Hôm Nay</CardTitle>
          <CardDescription>Báo cáo điểm danh check-in chi tiết của toàn bộ Barista</CardDescription>
        </CardHeader>
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground">
            Đang kết xuất nhật ký điểm danh...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            Chưa có nhật ký điểm danh ca nào hôm nay.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barista</TableHead>
                <TableHead>Ca Trực</TableHead>
                <TableHead>Ngày Trực</TableHead>
                <TableHead>Giờ Vào (Check-in)</TableHead>
                <TableHead>Giờ Ra (Check-out)</TableHead>
                <TableHead>Trạng Thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.ShiftLogID}>
                  <TableCell className="font-serif font-black text-sm text-foreground">
                    {log.Employee?.FullName}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-primary">
                    {log.Shift?.ShiftName}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {new Date(log.WorkDate).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground font-semibold">
                    {log.CheckInTime
                      ? new Date(log.CheckInTime).toLocaleTimeString('vi-VN')
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground">
                    {log.CheckOutTime ? (
                      new Date(log.CheckOutTime).toLocaleTimeString('vi-VN')
                    ) : (
                      <span className="italic text-muted-foreground/60">Đang trực ca</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.ShiftStatus === 'PRESENT' ? 'success' : 'warning'}>
                      {log.ShiftStatus === 'PRESENT' ? 'Đúng giờ' : 'Đi muộn'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
