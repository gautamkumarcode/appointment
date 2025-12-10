'use client';

import { Calendar, Edit, Mail, Phone, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { staffApi } from '../../../lib/staff-api';
import { Staff } from '../../../types';
import StaffForm from './StaffForm';
import StaffSchedule from './StaffSchedule';

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showSchedule, setShowSchedule] = useState<Staff | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await staffApi.getStaff();
      setStaff(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = () => {
    setEditingStaff(null);
    setShowForm(true);
  };

  const handleEditStaff = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setShowForm(true);
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      await staffApi.deleteStaff(id);
      setStaff(staff.filter((s) => s.id !== id));
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete staff member');
    }
  };

  const handleFormSuccess = (staffMember: Staff) => {
    if (editingStaff) {
      setStaff(staff.map((s) => (s.id === staffMember.id ? staffMember : s)));
    } else {
      setStaff([...staff, staffMember]);
    }
    setShowForm(false);
    setEditingStaff(null);
  };

  const handleScheduleUpdate = (updatedStaff: Staff) => {
    setStaff(staff.map((s) => (s.id === updatedStaff.id ? updatedStaff : s)));
    setShowSchedule(null);
  };

  const getWorkingDays = (weeklySchedule: Record<string, { start: string; end: string }[]>) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const workingDays = days.filter((day) => weeklySchedule[day] && weeklySchedule[day].length > 0);
    return workingDays.length;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Staff</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your team members and their availability.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={handleCreateStaff}
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus className="mr-2 inline-block h-4 w-4" />
            Add Staff Member
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            {staff.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                    />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No staff members</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first team member.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleCreateStaff}
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Staff Member
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Staff Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Working Days
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {staff.map((staffMember) => (
                      <tr key={staffMember.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                <span className="text-sm font-medium text-blue-700">
                                  {staffMember.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {staffMember.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="space-y-1">
                            {staffMember.email && (
                              <div className="flex items-center text-sm text-gray-500">
                                <Mail className="mr-2 h-4 w-4" />
                                {staffMember.email}
                              </div>
                            )}
                            {staffMember.phone && (
                              <div className="flex items-center text-sm text-gray-500">
                                <Phone className="mr-2 h-4 w-4" />
                                {staffMember.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {getWorkingDays(staffMember.weeklySchedule)} days/week
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setShowSchedule(staffMember)}
                              className="text-green-600 hover:text-green-900"
                              title="Manage Schedule"
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditStaff(staffMember)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit Staff Member"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(staffMember.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Staff Member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Staff Form Modal */}
      {showForm && (
        <StaffForm
          staff={editingStaff}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingStaff(null);
          }}
        />
      )}

      {/* Staff Schedule Modal */}
      {showSchedule && (
        <StaffSchedule
          staff={showSchedule}
          onSuccess={handleScheduleUpdate}
          onCancel={() => setShowSchedule(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50">
          <div className="relative top-20 mx-auto w-96 rounded-md border bg-white p-5 shadow-lg">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">Delete Staff Member</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this staff member? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-4 px-4 py-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="rounded-md bg-gray-300 px-4 py-2 text-base font-medium text-gray-800 shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteStaff(deleteConfirm)}
                  className="rounded-md bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
