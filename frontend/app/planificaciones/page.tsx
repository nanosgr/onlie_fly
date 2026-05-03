'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { usePagination } from '@/lib/hooks/usePagination';
import {
  planificacionService,
  pilotoService,
  aeronaveService,
  tipoOperacionService,
} from '@/lib/api/services';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/common/Card';
import Table from '@/components/common/Table';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import ProtectedComponent from '@/components/common/ProtectedComponent';
import FilterSelect from '@/components/common/FilterSelect';
import Pagination from '@/components/common/Pagination';
import ErrorAlert from '@/components/common/ErrorAlert';
import ModalFooter from '@/components/common/ModalFooter';
import {
  Planificacion,
  Piloto,
  Aeronave,
  TipoOperacion,
  CreatePlanificacionDTO,
  UpdatePlanificacionDTO,
  PlanificacionStatus,
  TableColumn,
  TableAction,
} from '@/types';
import { Plus, Pencil, Trash2, X as XIcon, CheckCircle, ChevronLeft, ChevronRight, LayoutList, CalendarDays } from 'lucide-react';

// ─── Status helpers ─────────────────────────────────────────────────────────

const STATUS_BADGE: Record<PlanificacionStatus, string> = {
  programado: 'bg-blue-100 text-blue-800',
  completado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
};

const STATUS_DOT: Record<PlanificacionStatus, string> = {
  programado: 'bg-blue-500',
  completado: 'bg-green-500',
  cancelado: 'bg-red-500',
};

const STATUS_LABEL: Record<PlanificacionStatus, string> = {
  programado: 'Programado',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'programado', label: 'Programado' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ─── Empty form ──────────────────────────────────────────────────────────────

const emptyCreate: CreatePlanificacionDTO = {
  fecha: '',
  hora_inicio: '',
  hora_fin: '',
  notas: '',
  status: 'programado',
  piloto_id: 0,
  aeronave_id: 0,
  tipo_operacion_id: 0,
};

// ─── Calendar component ──────────────────────────────────────────────────────

function CalendarView({
  planificaciones,
  onCellClick,
}: {
  planificaciones: Planificacion[];
  onCellClick: (date: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else { setMonth(m => m - 1); }
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else { setMonth(m => m + 1); }
  };

  const [popoverDate, setPopoverDate] = useState<string | null>(null);

  // Build a map of date string → planificaciones
  const byDate = useMemo(() => {
    const map: Record<string, Planificacion[]> = {};
    for (const p of planificaciones) {
      if (!map[p.fecha]) map[p.fecha] = [];
      map[p.fecha].push(p);
    }
    return map;
  }, [planificaciones]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  // Monday-first: getDay() returns 0=Sun, 1=Mon... convert to Mon=0..Sun=6
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = (d: number) => `${year}-${pad(month + 1)}-${pad(d)}`;

  const monthLabel = new Date(year, month, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
          <ChevronLeft className="w-4 h-4 text-stone-600 dark:text-stone-400" />
        </button>
        <span className="text-sm font-semibold capitalize text-stone-800 dark:text-stone-100">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
          <ChevronRight className="w-4 h-4 text-stone-600 dark:text-stone-400" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-stone-400 dark:text-stone-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-px bg-stone-200 dark:bg-stone-700 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={idx} className="bg-stone-50 dark:bg-stone-900 h-20" />;
          }
          const ds = dateStr(day);
          const plans = byDate[ds] ?? [];
          const isToday = ds === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
          const isOpen = popoverDate === ds;

          return (
            <div
              key={idx}
              className={`relative bg-white dark:bg-stone-900 h-20 p-1 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}
              onClick={() => {
                setPopoverDate(isOpen ? null : ds);
                onCellClick(ds);
              }}
            >
              <span className={`text-xs font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-stone-600 dark:text-stone-400'}`}>
                {day}
              </span>
              {plans.length > 0 && (
                <div className="mt-0.5 flex flex-wrap gap-0.5">
                  {plans.slice(0, 4).map((p) => (
                    <span
                      key={p.id}
                      className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[p.status]}`}
                    />
                  ))}
                  {plans.length > 4 && (
                    <span className="text-[9px] text-stone-400">+{plans.length - 4}</span>
                  )}
                </div>
              )}

              {/* Popover */}
              {isOpen && plans.length > 0 && (
                <div
                  className="absolute z-50 top-full left-0 mt-1 w-64 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg p-2 space-y-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {plans.map((p) => (
                    <div key={p.id} className="text-xs border-b border-stone-100 dark:border-stone-800 pb-1 last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{p.hora_inicio}{p.hora_fin ? `–${p.hora_fin}` : ''}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_BADGE[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      </div>
                      <div className="text-stone-500 dark:text-stone-400 mt-0.5">
                        {p.aeronave?.matricula ?? `Aeronave #${p.aeronave_id}`} — {p.piloto?.nombre_completo ?? p.piloto?.numero_licencia ?? `Piloto #${p.piloto_id}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page component ──────────────────────────────────────────────────────────

export default function PlanificacionesPage() {
  const { success, error: showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();
  const router = useRouter();

  const [items, setItems] = useState<Planificacion[]>([]);
  const [pilotos, setPilotos] = useState<Piloto[]>([]);
  const [aeronaves, setAeronaves] = useState<Aeronave[]>([]);
  const [tiposOp, setTiposOp] = useState<TipoOperacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [view, setView] = useState<'tabla' | 'calendario'>('tabla');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Planificacion | null>(null);

  // Filters
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [aeronaveFilter, setAeronaveFilter] = useState('all');

  // Form
  const [createForm, setCreateForm] = useState<CreatePlanificacionDTO>(emptyCreate);
  const [editForm, setEditForm] = useState<UpdatePlanificacionDTO>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [planRes, pilRes, aeroRes, tipoRes] = await Promise.all([
        planificacionService.getAll(),
        pilotoService.getAll(),
        aeronaveService.getAll(),
        tipoOperacionService.getAll(true),
      ]);
      setItems(planRes);
      setPilotos(pilRes);
      setAeronaves(aeroRes);
      setTiposOp(tipoRes);
    } catch {
      showError('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = () => {
    setEditing(null);
    setCreateForm({ ...emptyCreate });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEdit = (item: Planificacion) => {
    setEditing(item);
    setEditForm({
      fecha: item.fecha,
      hora_inicio: item.hora_inicio,
      hora_fin: item.hora_fin ?? '',
      notas: item.notas ?? '',
      status: item.status,
      piloto_id: item.piloto_id,
      aeronave_id: item.aeronave_id,
      tipo_operacion_id: item.tipo_operacion_id,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCancelar = async (item: Planificacion) => {
    const confirmed = await confirm({
      title: 'Cancelar Planificación',
      message: `¿Está seguro de cancelar la planificación del ${item.fecha}?`,
      confirmText: 'Cancelar vuelo',
      cancelText: 'Volver',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      await planificacionService.cancelar(item.id);
      success('Planificación cancelada');
      await loadData();
    } catch {
      showError('Error al cancelar');
    }
  };

  const handleDelete = async (item: Planificacion) => {
    const confirmed = await confirm({
      title: 'Eliminar Planificación',
      message: `¿Está seguro de eliminar la planificación del ${item.fecha}?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await planificacionService.delete(item.id);
      success('Planificación eliminada');
      await loadData();
    } catch {
      showError('Error al eliminar');
    }
  };

  const handleSubmit = async () => {
    setFormError('');
    setIsSubmitting(true);
    try {
      if (editing) {
        await planificacionService.update(editing.id, editForm);
        success('Planificación actualizada');
      } else {
        if (!createForm.fecha || !createForm.hora_inicio || !createForm.piloto_id || !createForm.aeronave_id || !createForm.tipo_operacion_id) {
          setFormError('Fecha, hora inicio, piloto, aeronave y tipo de operación son requeridos');
          setIsSubmitting(false);
          return;
        }
        await planificacionService.create(createForm);
        success('Planificación creada');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filters
  const filtered = useMemo(() => {
    return items.filter((p) => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesAeronave = aeronaveFilter === 'all' || p.aeronave_id === Number(aeronaveFilter);
      const matchesFechaDesde = !fechaDesde || p.fecha >= fechaDesde;
      const matchesFechaHasta = !fechaHasta || p.fecha <= fechaHasta;
      return matchesStatus && matchesAeronave && matchesFechaDesde && matchesFechaHasta;
    });
  }, [items, statusFilter, aeronaveFilter, fechaDesde, fechaHasta]);

  const {
    currentPage, totalPages, currentData: paginated,
    itemsPerPage, startIndex, endIndex,
    goToPage, nextPage, previousPage, goToFirstPage, goToLastPage, setItemsPerPage,
  } = usePagination({ data: filtered, itemsPerPage: 10 });

  const aeronaveOptions = useMemo(() => [
    { value: 'all', label: 'Todas las aeronaves' },
    ...aeronaves.map((a) => ({ value: String(a.id), label: a.matricula })),
  ], [aeronaves]);

  const columns: TableColumn<Planificacion>[] = [
    {
      key: 'fecha',
      label: 'Fecha',
      render: (p) => <span className="font-medium">{p.fecha}</span>,
    },
    {
      key: 'hora_inicio',
      label: 'Horario',
      render: (p) => <span>{p.hora_inicio}{p.hora_fin ? ` – ${p.hora_fin}` : ''}</span>,
    },
    {
      key: 'piloto_id',
      label: 'Piloto',
      render: (p) => <span>{p.piloto?.nombre_completo ?? p.piloto?.numero_licencia ?? `#${p.piloto_id}`}</span>,
    },
    {
      key: 'aeronave_id',
      label: 'Aeronave',
      render: (p) => <span>{p.aeronave?.matricula ?? `#${p.aeronave_id}`}</span>,
    },
    {
      key: 'tipo_operacion_id',
      label: 'Tipo Operación',
      render: (p) => <span>{p.tipo_operacion?.nombre ?? `#${p.tipo_operacion_id}`}</span>,
    },
    {
      key: 'status',
      label: 'Estado',
      render: (p) => (
        <span className={`px-2 py-1 text-xs font-medium rounded ${STATUS_BADGE[p.status]}`}>
          {STATUS_LABEL[p.status]}
        </span>
      ),
    },
    {
      key: 'registro_vuelo',
      label: 'Registro',
      render: (p) => p.registro_vuelo ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : (
        <span className="text-stone-300 dark:text-stone-600">—</span>
      ),
    },
  ];

  const actions: TableAction<Planificacion>[] = [
    {
      label: 'Editar',
      onClick: handleEdit,
      variant: 'secondary',
      permission: 'planificaciones:update',
      icon: <Pencil className="w-3 h-3" />,
    },
    {
      label: 'Cancelar',
      onClick: (p) => { if (p.status === 'programado') handleCancelar(p); },
      variant: 'secondary',
      permission: 'planificaciones:update',
      icon: <XIcon className="w-3 h-3 text-red-500" />,
    },
    {
      label: 'Registrar vuelo',
      onClick: () => router.push('/registros-vuelo'),
      variant: 'primary',
      permission: 'registros_vuelo:create',
      icon: <CheckCircle className="w-3 h-3" />,
    },
    {
      label: 'Eliminar',
      onClick: handleDelete,
      variant: 'danger',
      permission: 'planificaciones:delete',
      icon: <Trash2 className="w-3 h-3" />,
    },
  ];

  const setCreate = (field: keyof CreatePlanificacionDTO, value: unknown) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  const setEdit = (field: keyof UpdatePlanificacionDTO, value: unknown) =>
    setEditForm((prev) => ({ ...prev, [field]: value }));

  return (
    <DashboardLayout title="Planificaciones">
      <Card
        title="Planificaciones de Vuelo"
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border border-stone-200 dark:border-stone-700 rounded-md overflow-hidden">
              <button
                onClick={() => setView('tabla')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${view === 'tabla' ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800/50'}`}
              >
                <LayoutList className="w-3.5 h-3.5" /> Tabla
              </button>
              <button
                onClick={() => setView('calendario')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${view === 'calendario' ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800/50'}`}
              >
                <CalendarDays className="w-3.5 h-3.5" /> Calendario
              </button>
            </div>
            <ProtectedComponent permissions={['planificaciones:create']}>
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nueva
              </Button>
            </ProtectedComponent>
          </div>
        }
      >
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400 whitespace-nowrap">Desde:</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400 whitespace-nowrap">Hasta:</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
          </div>
          <FilterSelect label="Estado" value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTER_OPTIONS} />
          <FilterSelect label="Aeronave" value={aeronaveFilter} onChange={setAeronaveFilter} options={aeronaveOptions} />
        </div>

        {view === 'tabla' ? (
          <>
            <Table
              data={paginated}
              columns={columns}
              actions={actions}
              isLoading={isLoading}
              emptyMessage="No se encontraron planificaciones"
            />
            {filtered.length > 0 && (
              <Pagination
                currentPage={currentPage} totalPages={totalPages}
                onPageChange={goToPage} onFirstPage={goToFirstPage} onLastPage={goToLastPage}
                onPreviousPage={previousPage} onNextPage={nextPage}
                startIndex={startIndex} endIndex={endIndex}
                totalItems={filtered.length} itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </>
        ) : (
          <CalendarView
            planificaciones={filtered}
            onCellClick={() => {}}
          />
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Editar Planificación' : 'Nueva Planificación'}
        size="lg"
        footer={
          <ModalFooter
            onCancel={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isEditing={!!editing}
          />
        }
      >
        <div className="space-y-4">
          <ErrorAlert message={formError} />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Fecha *"
              type="date"
              value={editing ? (editForm.fecha ?? '') : createForm.fecha}
              onChange={(e) => editing ? setEdit('fecha', e.target.value) : setCreate('fecha', e.target.value)}
              required
            />
            <Input
              label="Hora Inicio *"
              type="time"
              value={editing ? (editForm.hora_inicio ?? '') : createForm.hora_inicio}
              onChange={(e) => editing ? setEdit('hora_inicio', e.target.value) : setCreate('hora_inicio', e.target.value)}
              required
            />
            <Input
              label="Hora Fin"
              type="time"
              value={editing ? (editForm.hora_fin ?? '') : (createForm.hora_fin ?? '')}
              onChange={(e) => editing ? setEdit('hora_fin', e.target.value) : setCreate('hora_fin', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Piloto *</label>
              <select
                value={editing ? (editForm.piloto_id ?? '') : (createForm.piloto_id || '')}
                onChange={(e) => editing ? setEdit('piloto_id', Number(e.target.value)) : setCreate('piloto_id', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              >
                <option value="">Seleccionar piloto...</option>
                {pilotos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre_completo ?? p.numero_licencia}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Aeronave *</label>
              <select
                value={editing ? (editForm.aeronave_id ?? '') : (createForm.aeronave_id || '')}
                onChange={(e) => editing ? setEdit('aeronave_id', Number(e.target.value)) : setCreate('aeronave_id', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              >
                <option value="">Seleccionar aeronave...</option>
                {aeronaves.map((a) => (
                  <option key={a.id} value={a.id}>{a.matricula} — {a.modelo}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Tipo de Operación *</label>
            <select
              value={editing ? (editForm.tipo_operacion_id ?? '') : (createForm.tipo_operacion_id || '')}
              onChange={(e) => editing ? setEdit('tipo_operacion_id', Number(e.target.value)) : setCreate('tipo_operacion_id', Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            >
              <option value="">Seleccionar tipo de operación...</option>
              {tiposOp.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          {editing && (
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Estado</label>
              <select
                value={editForm.status ?? ''}
                onChange={(e) => setEdit('status', e.target.value as PlanificacionStatus)}
                className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              >
                <option value="programado">Programado</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Notas</label>
            <textarea
              value={editing ? (editForm.notas ?? '') : (createForm.notas ?? '')}
              onChange={(e) => editing ? setEdit('notas', e.target.value) : setCreate('notas', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      <ConfirmationDialog />
    </DashboardLayout>
  );
}
