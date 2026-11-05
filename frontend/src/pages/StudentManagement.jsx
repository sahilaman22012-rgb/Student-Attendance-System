import React, { useState } from 'react';
import { Search, UserPlus, Filter, BookOpen, Eye, Mail, Trash2 } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export function StudentManagement() {
  const { role } = useAuth();
  const { students, courses, addStudent, enrollStudent } = useData();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Modals
  const [detailStudent, setDetailStudent] = useState(null);
  const [enrollmentStudent, setEnrollmentStudent] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  // New Student Form State
  const [newStudent, setNewStudent] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    roll_number: '',
    batch_year: new Date().getFullYear(),
    department: 'Computer Science',
  });

  const filteredStudents = students.filter((st) => {
    const fullName = `${st.first_name || ''} ${st.last_name || ''}`.toLowerCase();
    const roll = (st.roll_number || '').toLowerCase();
    const email = (st.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = fullName.includes(search) || roll.includes(search) || email.includes(search);
    const matchesDept = !departmentFilter || st.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.first_name || !newStudent.last_name || !newStudent.roll_number || !newStudent.password) {
      showToast('Please complete all required fields.', 'warning');
      return;
    }

    try {
      const created = await addStudent(newStudent);
      showToast(`Student ${created.first_name} ${created.last_name} registered successfully.`, 'success');
      setAddModalOpen(false);
      setNewStudent({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        roll_number: '',
        batch_year: new Date().getFullYear(),
        department: 'Computer Science',
      });
    } catch (error) {
      showToast(error.message || 'Could not register student.', 'error');
    }
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!enrollmentStudent || !selectedCourseId) return;
    try {
      await enrollStudent(selectedCourseId, enrollmentStudent.id);
      showToast('Student enrolled in the selected course.', 'success');
      setEnrollModalOpen(false);
      setEnrollmentStudent(null);
      setSelectedCourseId('');
    } catch (error) {
      showToast(error.message || 'Could not enroll student.', 'error');
    }
  };

  return (
    <MainLayout title="Student Roster & Management">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Registered Students Roster</h2>
          <p className="text-xs text-slate-500">Manage enrolled students, departments, and course assignments</p>
        </div>

        {role === 'ADMIN' && (
          <Button variant="primary" icon={UserPlus} onClick={() => setAddModalOpen(true)}>
            Add Student
          </Button>
        )}
      </div>

      {/* Filters and Search Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-96">
              <Input
                placeholder="Search by name, roll number, or email..."
                icon={Search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <Select
                icon={Filter}
                placeholder="All Departments"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                options={[
                  { value: 'Computer Science', label: 'Computer Science' },
                  { value: 'Information Technology', label: 'Information Technology' },
                  { value: 'Software Engineering', label: 'Software Engineering' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roster Table */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          title="No Students Found"
          description="Try adjusting search query or department filter."
          actionLabel={role === 'ADMIN' ? 'Add New Student' : undefined}
          onAction={role === 'ADMIN' ? () => setAddModalOpen(true) : undefined}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll Number</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Attendance Rate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((st) => (
                <TableRow key={st.id}>
                  <TableCell className="font-mono text-xs font-bold text-indigo-900">
                    {st.roll_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {st.first_name} {st.last_name}
                      </p>
                      <p className="text-xs text-slate-500">{st.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{st.department}</TableCell>
                  <TableCell className="text-xs font-semibold">{st.batch_year}</TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500">
                    --
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={BookOpen}
                        onClick={() => {
                          setEnrollmentStudent(st);
                          setSelectedCourseId('');
                          setEnrollModalOpen(true);
                        }}
                      >
                        Enroll
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Eye}
                        onClick={() => setDetailStudent(st)}
                      >
                        Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Student Details Modal */}
      <Modal
        isOpen={!!detailStudent}
        onClose={() => setDetailStudent(null)}
        title="Student Record Profile"
        description="Detailed student registration and academic info"
      >
        {detailStudent && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-900 text-white font-bold text-lg flex items-center justify-center">
                {detailStudent.first_name[0]}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {detailStudent.first_name} {detailStudent.last_name}
                </h4>
                <p className="text-xs text-slate-500">{detailStudent.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block font-semibold uppercase">Roll Number</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{detailStudent.roll_number}</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block font-semibold uppercase">Department</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{detailStudent.department}</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block font-semibold uppercase">Batch Year</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{detailStudent.batch_year}</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block font-semibold uppercase">Overall Attendance</span>
                <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                  {detailStudent.overall_attendance ?? '--'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Student Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Register New Student"
        description="Create a student account with a unique roll number."
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              required
              value={newStudent.first_name}
              onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
            />
            <Input
              label="Last Name"
              required
              value={newStudent.last_name}
              onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
            />
          </div>
          <Input
            label="Email Address"
            type="email"
            icon={Mail}
            required
            value={newStudent.email}
            onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
          />
          <Input
            label="Initial Password"
            type="password"
            minLength={8}
            required
            value={newStudent.password}
            onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Roll Number"
              required
              placeholder="e.g. 2026-CS-010"
              value={newStudent.roll_number}
              onChange={(e) => setNewStudent({ ...newStudent, roll_number: e.target.value })}
            />
            <Input
              label="Batch Year"
              type="number"
              required
              value={newStudent.batch_year}
              onChange={(e) => setNewStudent({ ...newStudent, batch_year: parseInt(e.target.value, 10) || new Date().getFullYear() })}
            />
          </div>
          <Select
            label="Department"
            required
            value={newStudent.department}
            onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
            options={[
              { value: 'Computer Science', label: 'Computer Science' },
              { value: 'Information Technology', label: 'Information Technology' },
              { value: 'Software Engineering', label: 'Software Engineering' },
            ]}
          />
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Register Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* Enroll Student Modal */}
      <Modal
        isOpen={enrollModalOpen}
        onClose={() => {
          setEnrollModalOpen(false);
          setEnrollmentStudent(null);
          setSelectedCourseId('');
        }}
        title="Enroll Student in Subject Course"
        description="Select active course for student registration"
      >
        <form onSubmit={handleEnrollStudent} className="space-y-4">
          <Select
            label="Target Course"
            placeholder="Select course..."
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            options={courses.map((c) => ({
              value: c.id,
              label: `${c.course_code} - ${c.title}`,
            }))}
            required
          />
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setEnrollModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Enrollment
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
