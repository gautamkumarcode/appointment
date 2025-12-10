'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { staffApi } from '../../../lib/staff-api';
import { Staff, StaffHoliday } from '../../../types';

interface StaffScheduleProps {
  staff: Staff;
  onSuccess: (staff: Staff) => void;
  onCancel: () => void;
}

interface TimeSlot {
  start: string;
  end: string;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function StaffSchedule({ staff, onSuccess, onCancel }: StaffScheduleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, TimeSlot[]>>(
    staff.weeklySchedule
  );
  const [holidays, setHolidays] = useState<StaffHoliday[]>([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', reason: '' });
  const [activeTab, setActiveTab] = useState<'schedule' | 'holidays'>('schedule');

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      const data = await staffApi.getHolidays(staff.id);
      setHolidays(data);
    } catch (err: any) {
      console.error('Failed to load holidays:', err);
    }
  };

  const handleScheduleChange = (
    day: string,
    slotIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: prev[day].map((slot, index) =>
        index === slotIndex ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  const addTimeSlot = (day: string) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: [...prev[day], { start: '09:00', end: '17:00' }],
    }));
  };

  const removeTimeSlot = (day: string, slotIndex: number) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, index) => index !== slotIndex),
    }));
  };

  const handleSaveSchedule = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedStaff = await staffApi.updateAvailability(staff.id, weeklySchedule);
      onSuccess(updatedStaff);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.date) return;

    try {
      const holiday = await staffApi.addHoliday(staff.id, newHoliday);
      setHolidays([...holidays, holiday]);
      setNewHoliday({ date: '', reason: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add holiday');
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    try {
      await staffApi.deleteHoliday(staff.id, holidayId);
      setHolidays(holidays.filter((h) => h.id !== holidayId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete holiday');
    }
  };

  return (
    <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50">
      <div className="relative top-10 mx-auto w-full max-w-4xl rounded-md border bg-white p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Manage Schedule - {staff.name}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`border-b-2 px-1 py-2 text-sm font-medium ${
                activeTab === 'schedule'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Weekly Schedule
            </button>
            <button
              onClick={() => setActiveTab('holidays')}
              className={`border-b-2 px-1 py-2 text-sm font-medium ${
                activeTab === 'holidays'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Holidays & Off Days
            </button>
          </nav>
        </div>

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {DAYS.map(({ key, label }) => (
              <div key={key} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">{label}</h4>
                  <button
                    onClick={() => addTimeSlot(key)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="mr-1 inline h-4 w-4" />
                    Add Time Slot
                  </button>
                </div>

                {weeklySchedule[key]?.length === 0 ? (
                  <p className="text-sm italic text-gray-500">No working hours</p>
                ) : (
                  <div className="space-y-2">
                    {weeklySchedule[key]?.map((slot, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) =>
                            handleScheduleChange(key, index, 'start', e.target.value)
                          }
                          className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => handleScheduleChange(key, index, 'end', e.target.value)}
                          className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        <button
                          onClick={() => removeTimeSlot(key, index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'holidays' && (
          <div className="space-y-6">
            {/* Add Holiday Form */}
            <div className="rounded-lg border p-4">
              <h4 className="mb-3 text-sm font-medium text-gray-900">Add Holiday/Off Day</h4>
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={newHoliday.reason}
                    onChange={(e) => setNewHoliday({ ...newHoliday, reason: e.target.value })}
                    placeholder="e.g., Vacation, Sick leave"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <button
                  onClick={handleAddHoliday}
                  disabled={!newHoliday.date}
                  className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Holidays List */}
            <div className="rounded-lg border p-4">
              <h4 className="mb-3 text-sm font-medium text-gray-900">Scheduled Holidays</h4>
              {holidays.length === 0 ? (
                <p className="text-sm italic text-gray-500">No holidays scheduled</p>
              ) : (
                <div className="space-y-2">
                  {holidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(holiday.date).toLocaleDateString()}
                        </div>
                        {holiday.reason && (
                          <div className="text-sm text-gray-500">{holiday.reason}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 border-t pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          {activeTab === 'schedule' && (
            <button
              onClick={handleSaveSchedule}
              disabled={isLoading}
              className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Schedule'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
