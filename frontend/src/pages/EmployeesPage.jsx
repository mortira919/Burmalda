import React, { useEffect, useState, useCallback } from 'react';
import { employeesApi } from '../api/client';
import { formatDate, formatMoney, EMPLOYEE_ROLE, ROLE_COLOR, PROJECT_STATUS } from '../utils/helpers';
import Modal from '../components/Modal';
import { UserCheck, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Banknote } from 'lucide-react';
import { useSync } from '../hooks/useSync';
import { PhoneInput, MoneyInput } from '../components/FormInputs';

const emptyForm = { name: '', role: 'mobile', defaultPercent: '', phone: '', email: '', notes: '' };

function EmployeeForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyForm);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = async (e) => { e.preventDefault(); setSaving(true); try { await onSave(form); } catch { setSaving(false); } };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="label">Имя *</label><input className="input" required value={form.name} onChange={e => set('name', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Роль</label>
          <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
            {Object.entries(EMPLOYEE_ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div><label className="label">% по умолчанию</label><input type="number" min="0" max="100" className="input font-mono" value={form.defaultPercent} onChange={e => set('defaultPercent', e.target.value)} /></div>
        <div><label className="label">Телефон</label><PhoneInput value={form.phone} onChange={v => set('phone', v)} /></div>
        <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} /></div>
      </div>
      <div><label className="label">Заметки</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary">Отмена</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Сохранение...' : 'Сохранить'}</button>
      </div>
    </form>
  );
}

function PaymentForm({ employee, onSave, onCancel }) {
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await onSave({ ...form, employeeId: employee.id }); } catch { setSaving(false); }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-400">Сотрудник: <span className="text-white font-medium">{employee.name}</span></p>
      <div><label className="label">Сумма (₸) *</label><MoneyInput required value={form.amount} onChange={v => set('amount', v)} placeholder="50 000" /></div>
      <div><label className="label">Дата</label><input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} /></div>
      <div><label className="label">Заметка</label><input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="За май, бонус..." /></div>
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary">Отмена</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Сохранение...' : 'Выплатить'}</button>
      </div>
    </form>
  );
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [tick, setTick] = useState(0);

  const load = () => employeesApi.getAll().then(r => setEmployees(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, [tick]);
  useSync(useCallback(() => setTick(t => t + 1), []));

  const handleCreate  = async (form) => { await employeesApi.create(form); load(); setModal(null); };
  const handleEdit    = async (form) => { await employeesApi.update(modal.employee.id, form); load(); setModal(null); };
  const handleDelete  = async (id)  => { if (!confirm('Удалить сотрудника?')) return; await employeesApi.delete(id); load(); };
  const handlePay     = async (form) => { await employeesApi.addSalaryPayment(form); load(); setModal(null); };
  const handleDelPay  = async (id)  => { if (!confirm('Удалить запись о выплате?')) return; await employeesApi.deleteSalaryPayment(id); load(); };

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><UserCheck size={24} className="text-primary-500" /> Сотрудники</h1>
          <p className="page-sub">{employees.length} человек в команде</p>
        </div>
        <button onClick={() => setModal({ type: 'create' })} className="btn-primary"><Plus size={16} /> Добавить</button>
      </div>

      <div className="grid gap-3">
        {employees.length === 0 && (
          <div className="card text-center py-16">
            <UserCheck size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">Добавьте первого сотрудника</p>
          </div>
        )}
        {employees.map(emp => {
          const activeProjects = emp.projectMembers?.filter(m => m.project?.status !== 'completed') || [];
          const totalAccrued = emp.projectMembers?.reduce((s, m) => {
            const total = (m.project?.budget || 0) + (m.project?.extraCost || 0);
            return s + total * m.percent / 100;
          }, 0) || 0;
          const totalPaid = emp.salaryPayments?.reduce((s, p) => s + p.amount, 0) || 0;
          const isExp = expanded === emp.id;

          return (
            <div key={emp.id} className="card p-0 overflow-hidden">
              <div className="flex items-start gap-4 p-4">
                <img
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emp.name)}&backgroundColor=76B900&fontFamily=Ubuntu&fontSize=38`}
                  alt={emp.name} className="w-12 h-12 rounded-xl shrink-0"
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isExp ? null : emp.id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white">{emp.name}</p>
                    <span className={`badge ${ROLE_COLOR[emp.role] || 'bg-gray-500/20 text-gray-400'}`}>
                      {EMPLOYEE_ROLE[emp.role] || emp.role}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                    {emp.phone && <span>📞 {emp.phone}</span>}
                    {emp.email && <span>✉️ {emp.email}</span>}
                    <span>Ставка: <strong className="text-primary-400 font-mono">{emp.defaultPercent}%</strong></span>
                    <span>Проектов: <strong className="text-gray-300">{activeProjects.length} активных</strong></span>
                    <span>Начислено: <strong className="text-yellow-400 font-mono">{formatMoney(totalAccrued)}</strong></span>
                    <span>Выплачено: <strong className={`font-mono ${totalPaid >= totalAccrued ? 'text-green-400' : 'text-orange-400'}`}>{formatMoney(totalPaid)}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setExpanded(isExp ? null : emp.id)} className="text-gray-600 hover:text-gray-300 transition-colors">
                    {isExp ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <button onClick={() => setModal({ type: 'pay', employee: emp })} className="btn-primary py-1 px-2" title="Выплатить зарплату"><Banknote size={13} /></button>
                  <button onClick={() => setModal({ type: 'edit', employee: emp, form: { ...emp, defaultPercent: emp.defaultPercent.toString() } })} className="btn-secondary py-1 px-2"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(emp.id)} className="btn-danger py-1 px-2"><Trash2 size={13} /></button>
                </div>
              </div>

              {isExp && (
                <div className="px-4 pb-4" style={{ borderTop: '1px solid #212121' }}>
                  {/* Projects */}
                  {emp.projectMembers?.length > 0 && (
                    <>
                      <p className="text-xs text-gray-600 uppercase tracking-wide mt-3 mb-2">Проекты</p>
                      <div className="space-y-1.5">
                        {emp.projectMembers.map(m => {
                          const projTotal = (m.project?.budget || 0) + (m.project?.extraCost || 0);
                          return (
                            <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg text-sm"
                              style={{ background: '#0F0F0F', border: '1px solid #212121' }}>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-300">{m.project?.name}</span>
                                {m.project?.status && <span className={`badge ${PROJECT_STATUS[m.project.status]?.color}`}>{PROJECT_STATUS[m.project.status]?.label}</span>}
                              </div>
                              <div className="flex items-center gap-2 font-mono text-xs">
                                <span className="text-gray-600">{m.percent}%</span>
                                <span className="text-yellow-400">{formatMoney(projTotal * m.percent / 100)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Salary payments */}
                  <div className="flex items-center justify-between mt-4 mb-2">
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Выплаты</p>
                    <button onClick={() => setModal({ type: 'pay', employee: emp })} className="text-xs text-primary-500 hover:text-primary-400 flex items-center gap-1">
                      <Plus size={11} /> Выплатить
                    </button>
                  </div>
                  {emp.salaryPayments?.length > 0 ? (
                    <div className="space-y-1.5">
                      {emp.salaryPayments.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg text-sm"
                          style={{ background: '#0F0F0F', border: '1px solid #212121' }}>
                          <div>
                            <span className="text-green-400 font-mono font-semibold">{formatMoney(p.amount)}</span>
                            {p.notes && <span className="text-gray-600 ml-2 text-xs">{p.notes}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700 font-mono text-xs">{formatDate(p.date)}</span>
                            <button onClick={() => handleDelPay(p.id)} className="text-gray-700 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs px-1 pt-1">
                        <span className="text-gray-600">Итого выплачено</span>
                        <span className="font-mono text-green-400 font-semibold">{formatMoney(totalPaid)}</span>
                      </div>
                      {totalAccrued > totalPaid && (
                        <div className="flex justify-between text-xs px-1">
                          <span className="text-gray-600">Остаток к выплате</span>
                          <span className="font-mono text-orange-400 font-semibold">{formatMoney(totalAccrued - totalPaid)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-700 py-2">Выплат пока нет</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={modal?.type === 'create'} onClose={() => setModal(null)} title="Новый сотрудник">
        <EmployeeForm onSave={handleCreate} onCancel={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === 'edit'} onClose={() => setModal(null)} title="Редактировать сотрудника">
        {modal?.type === 'edit' && <EmployeeForm initial={modal.form} onSave={handleEdit} onCancel={() => setModal(null)} />}
      </Modal>
      <Modal open={modal?.type === 'pay'} onClose={() => setModal(null)} title="Выплатить зарплату">
        {modal?.type === 'pay' && <PaymentForm employee={modal.employee} onSave={handlePay} onCancel={() => setModal(null)} />}
      </Modal>
    </div>
  );
}
