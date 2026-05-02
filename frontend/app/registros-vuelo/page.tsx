'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useToast } from '@/context/ToastContext';
import { usePagination } from '@/lib/hooks/usePagination';
import { registroVueloService, aeronaveService, planificacionService } from '@/lib/api/services';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/common/Card';
import Table from '@/components/common/Table';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import ProtectedComponent from '@/components/common/ProtectedComponent';
import SearchBar from '@/components/common/SearchBar';
import FilterSelect from '@/components/common/FilterSelect';
import Pagination from '@/components/common/Pagination';
import ErrorAlert from '@/components/common/ErrorAlert';
import ModalFooter from '@/components/common/ModalFooter';
import { RegistroVuelo, Aeronave, Planificacion, CreateRegistroVueloDTO, UpdateRegistroVueloDTO, TableColumn, TableAction } from '@/types';
import { Plus, Pencil } from 'lucide-react';

export default function RegistrosVueloPage() {
  const { success, error: showError } = useToast();
  const [items, setItems] = useState<RegistroVuelo[]>([]);
  const [aeronaves, setAeronaves] = useState<Aeronave[]>([]);
  const [planificaciones, setPlanificaciones] = useState<Planificacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<RegistroVuelo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [aeronaveFilter, setAeronaveFilter] = useState('all');
  const [createForm, setCreateForm] = useState<CreateRegistroVueloDTO>({
    horas_vuelo: 0, combustible_litros: undefined, aceite_litros: undefined, novedades: '', planificacion_id: 0,
  });
  const [editForm, setEditForm] = useState<UpdateRegistroVueloDTO>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [regRes, aeroRes, planRes] = await Promise.all([
        registroVueloService.getAll(),
        aeronaveService.getAll(),
        planificacionService.getAll({ status: 'programado' }),
      ]);
      setItems(regRes);
      setAeronaves(aeroRes);
      setPlanificaciones(planRes);
    } catch {
      showError('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = () => {
    setEditing(null);
    setCreateForm({ horas_vuelo: 0, combustible_litros: undefined, aceite_litros: undefined, novedades: '', planificacion_id: 0 });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEdit = (item: RegistroVuelo) => {
    setEditing(item);
    setEditForm({
      horas_vuelo: item.horas_vuelo,
      combustible_litros: item.combustible_litros,
      aceite_litros: item.aceite_litros,
      novedades: item.novedades ?? '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError('');
    setIsSubmitting(true);
    try {
      if (editing) {
        await registroVueloService.update(editing.id, editForm);
        success('Registro actualizado');
      } else {
        if (!createForm.planificacion_id || !createForm.horas_vuelo) {
          setFormError('Planificación y horas de vuelo son requeridas');
          setIsSubmitting(false);
          return;
        }
        await registroVueloService.create(createForm);
        success('Registro de vuelo creado');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlanLabel = (reg: RegistroVuelo) => {
    const plan = reg.planificacion;
    if (!plan) return `Planif. #${reg.planificacion_id}`;
    const aeronave = plan.aeronave?.matricula ?? `Aeronave #${plan.aeronave_id}`;
    return `${plan.fecha} — ${aeronave}`;
  };

  const aeronaveOptions = useMemo(() => [
    { value: 'all', label: 'Todas las aeronaves' },
    ...aeronaves.map((a) => ({ value: String(a.id), label: a.matricula })),
  ], [aeronaves]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter((r) => {
      const matchesSearch = !q || getPlanLabel(r).toLowerCase().includes(q) ||
        (r.novedades ?? '').toLowerCase().includes(q);
      const matchesAeronave = aeronaveFilter === 'all' || r.aeronave_id === Number(aeronaveFilter);
      return matchesSearch && matchesAeronave;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, searchQuery, aeronaveFilter]);

  const {
    currentPage, totalPages, currentData: paginated,
    itemsPerPage, startIndex, endIndex,
    goToPage, nextPage, previousPage, goToFirstPage, goToLastPage, setItemsPerPage,
  } = usePagination({ data: filtered, itemsPerPage: 10 });

  const columns: TableColumn<RegistroVuelo>[] = [
    {
      key: 'planificacion_id',
      label: 'Planificación',
      render: (r) => <span className="font-medium text-sm">{getPlanLabel(r)}</span>,
    },
    {
      key: 'piloto_id',
      label: 'Piloto',
      render: (r) => <span>{r.planificacion?.piloto?.numero_licencia ?? `#${r.piloto_id}`}</span>,
    },
    { key: 'horas_vuelo', label: 'Horas Vuelo', render: (r) => <span>{r.horas_vuelo} hs</span> },
    { key: 'combustible_litros', label: 'Combustible', render: (r) => <span>{r.combustible_litros != null ? `${r.combustible_litros} L` : '—'}</span> },
    { key: 'aceite_litros', label: 'Aceite', render: (r) => <span>{r.aceite_litros != null ? `${r.aceite_litros} L` : '—'}</span> },
    {
      key: 'novedades',
      label: 'Novedades',
      render: (r) => {
        const text = r.novedades ?? '';
        return <span className="text-stone-500">{text.length > 60 ? `${text.slice(0, 60)}…` : text || '—'}</span>;
      },
    },
  ];

  const actions: TableAction<RegistroVuelo>[] = [
    { label: 'Editar', onClick: handleEdit, variant: 'secondary', permission: 'registros_vuelo:update', icon: <Pencil className="w-3 h-3" /> },
  ];

  const planOptions = planificaciones.map((p) => ({
    value: String(p.id),
    label: `${p.fecha} ${p.hora_inicio} — ${p.aeronave?.matricula ?? p.aeronave_id} / ${p.piloto?.numero_licencia ?? p.piloto_id}`,
  }));

  const setCreate = (field: keyof CreateRegistroVueloDTO, value: unknown) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  const setEdit = (field: keyof UpdateRegistroVueloDTO, value: unknown) =>
    setEditForm((prev) => ({ ...prev, [field]: value }));

  return (
    <DashboardLayout title="Registros de Vuelo">
      <Card
        title="Registros de Vuelo"
        actions={
          <ProtectedComponent permissions={['registros_vuelo:create']}>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Registro
            </Button>
          </ProtectedComponent>
        }
      >
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar placeholder="Buscar por fecha, matrícula o novedades..." onSearch={setSearchQuery} />
          </div>
          <FilterSelect label="Aeronave" value={aeronaveFilter} onChange={setAeronaveFilter} options={aeronaveOptions} />
        </div>

        <Table data={paginated} columns={columns} actions={actions} isLoading={isLoading} emptyMessage="No se encontraron registros de vuelo" />

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
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Editar Registro de Vuelo' : 'Nuevo Registro de Vuelo'}
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

          {editing ? (
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Planificación</label>
              <p className="text-sm text-stone-700 dark:text-stone-300 px-3 py-2 bg-stone-50 dark:bg-stone-800 rounded-md">
                {getPlanLabel(editing)}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Planificación *</label>
              <select
                value={createForm.planificacion_id || ''}
                onChange={(e) => setCreate('planificacion_id', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              >
                <option value="">Seleccionar planificación...</option>
                {planOptions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Horas de Vuelo *"
              type="number"
              step="0.1"
              value={editing ? (editForm.horas_vuelo ?? '') : createForm.horas_vuelo}
              onChange={(e) => editing
                ? setEdit('horas_vuelo', Number(e.target.value))
                : setCreate('horas_vuelo', Number(e.target.value))
              }
              required
            />
            <Input
              label="Combustible (L)"
              type="number"
              step="0.1"
              value={editing ? (editForm.combustible_litros ?? '') : (createForm.combustible_litros ?? '')}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : Number(e.target.value);
                editing ? setEdit('combustible_litros', v) : setCreate('combustible_litros', v);
              }}
            />
            <Input
              label="Aceite (L)"
              type="number"
              step="0.1"
              value={editing ? (editForm.aceite_litros ?? '') : (createForm.aceite_litros ?? '')}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : Number(e.target.value);
                editing ? setEdit('aceite_litros', v) : setCreate('aceite_litros', v);
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Novedades</label>
            <textarea
              value={editing ? (editForm.novedades ?? '') : (createForm.novedades ?? '')}
              onChange={(e) => editing
                ? setEdit('novedades', e.target.value)
                : setCreate('novedades', e.target.value)
              }
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
