'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { usePagination } from '@/lib/hooks/usePagination';
import { useFilteredData } from '@/lib/hooks/useFilteredData';
import { aeronaveService } from '@/lib/api/services';
import { STATUS_FILTER_OPTIONS } from '@/lib/constants';
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
import { Aeronave, CreateAeronaveDTO, TableColumn, TableAction } from '@/types';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';

const SEARCH_FIELDS = ['matricula', 'modelo', 'fabricante'];

const TIPO_OPTIONS = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'monomotor', label: 'Monomotor' },
  { value: 'bimotor', label: 'Bimotor' },
  { value: 'otro', label: 'Otro' },
];

const TIPO_BADGE: Record<string, string> = {
  monomotor: 'bg-blue-100 text-blue-800',
  bimotor: 'bg-purple-100 text-purple-800',
  otro: 'bg-stone-100 text-stone-700',
};

const emptyForm: CreateAeronaveDTO = {
  matricula: '', modelo: '', tipo: 'monomotor', fabricante: '', notas: '',
  horas_totales: 0, horas_proximo_mantenimiento: undefined, umbral_alerta_horas: undefined, is_active: true,
};

export default function AeronavesPage() {
  const { success, error: showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();
  const [items, setItems] = useState<Aeronave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Aeronave | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [formData, setFormData] = useState<CreateAeronaveDTO>(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await aeronaveService.getAll();
      setItems(data);
    } catch {
      showError('Error al cargar aeronaves');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = () => {
    setEditing(null);
    setFormData({ ...emptyForm });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEdit = (item: Aeronave) => {
    setEditing(item);
    setFormData({
      matricula: item.matricula,
      modelo: item.modelo,
      tipo: item.tipo,
      fabricante: item.fabricante ?? '',
      notas: item.notas ?? '',
      horas_totales: item.horas_totales,
      horas_proximo_mantenimiento: item.horas_proximo_mantenimiento,
      umbral_alerta_horas: item.umbral_alerta_horas,
      is_active: item.is_active,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (item: Aeronave) => {
    const confirmed = await confirm({
      title: 'Eliminar Aeronave',
      message: `¿Está seguro de eliminar la aeronave "${item.matricula}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await aeronaveService.delete(item.id);
      success(`Aeronave "${item.matricula}" eliminada`);
      await loadData();
    } catch {
      showError('Error al eliminar la aeronave');
    }
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!formData.matricula.trim() || !formData.modelo.trim()) {
      setFormError('Matrícula y modelo son requeridos');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editing) {
        await aeronaveService.update(editing.id, formData);
        success('Aeronave actualizada');
      } else {
        await aeronaveService.create(formData);
        success('Aeronave creada');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredByStatus = useFilteredData({
    data: items,
    searchQuery,
    searchFields: SEARCH_FIELDS,
    statusFilter,
    extraFilter: tipoFilter !== 'all' ? (item: Aeronave) => item.tipo === tipoFilter : undefined,
  });

  const {
    currentPage, totalPages, currentData: paginated,
    itemsPerPage, startIndex, endIndex,
    goToPage, nextPage, previousPage, goToFirstPage, goToLastPage, setItemsPerPage,
  } = usePagination({ data: filteredByStatus, itemsPerPage: 10 });

  const columns: TableColumn<Aeronave>[] = [
    { key: 'matricula', label: 'Matrícula', render: (a) => <span className="font-medium">{a.matricula}</span> },
    { key: 'modelo', label: 'Modelo' },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (a) => (
        <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${TIPO_BADGE[a.tipo] ?? 'bg-stone-100 text-stone-700'}`}>
          {a.tipo}
        </span>
      ),
    },
    { key: 'fabricante', label: 'Fabricante', render: (a) => <span>{a.fabricante ?? '—'}</span> },
    { key: 'horas_totales', label: 'Horas Totales' },
    {
      key: 'alerta_mantenimiento',
      label: 'Alerta',
      render: (a) => a.alerta_mantenimiento ? (
        <span className="flex items-center gap-1 text-orange-600 text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5" /> Mantenimiento
        </span>
      ) : <span className="text-stone-400 text-xs">—</span>,
    },
    {
      key: 'is_active',
      label: 'Estado',
      render: (a) => (
        <span className={`px-2 py-1 text-xs font-medium rounded ${a.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {a.is_active ? 'Activa' : 'Inactiva'}
        </span>
      ),
    },
  ];

  const actions: TableAction<Aeronave>[] = [
    { label: 'Editar', onClick: handleEdit, variant: 'secondary', permission: 'aeronaves:update', icon: <Pencil className="w-3 h-3" /> },
    { label: 'Eliminar', onClick: handleDelete, variant: 'danger', permission: 'aeronaves:delete', icon: <Trash2 className="w-3 h-3" /> },
  ];

  const set = (field: keyof CreateAeronaveDTO, value: unknown) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <DashboardLayout title="Aeronaves">
      <Card
        title="Flota de Aeronaves"
        actions={
          <ProtectedComponent permissions={['aeronaves:create']}>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nueva Aeronave
            </Button>
          </ProtectedComponent>
        }
      >
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar placeholder="Buscar por matrícula, modelo o fabricante..." onSearch={setSearchQuery} />
          </div>
          <FilterSelect label="Tipo" value={tipoFilter} onChange={setTipoFilter} options={TIPO_OPTIONS} />
          <FilterSelect label="Estado" value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTER_OPTIONS as unknown as { value: string; label: string }[]} />
        </div>

        <Table data={paginated} columns={columns} actions={actions} isLoading={isLoading} emptyMessage="No se encontraron aeronaves" />

        {filteredByStatus.length > 0 && (
          <Pagination
            currentPage={currentPage} totalPages={totalPages}
            onPageChange={goToPage} onFirstPage={goToFirstPage} onLastPage={goToLastPage}
            onPreviousPage={previousPage} onNextPage={nextPage}
            startIndex={startIndex} endIndex={endIndex}
            totalItems={filteredByStatus.length} itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Editar Aeronave' : 'Nueva Aeronave'}
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
          <div className="grid grid-cols-2 gap-4">
            <Input label="Matrícula *" value={formData.matricula} onChange={(e) => set('matricula', e.target.value)} required />
            <Input label="Modelo *" value={formData.modelo} onChange={(e) => set('modelo', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Tipo *</label>
              <select
                value={formData.tipo}
                onChange={(e) => set('tipo', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              >
                <option value="monomotor">Monomotor</option>
                <option value="bimotor">Bimotor</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <Input label="Fabricante" value={formData.fabricante ?? ''} onChange={(e) => set('fabricante', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Horas Totales"
              type="number"
              value={formData.horas_totales ?? ''}
              onChange={(e) => set('horas_totales', e.target.value === '' ? 0 : Number(e.target.value))}
            />
            <Input
              label="Próximo Mant. (hs)"
              type="number"
              value={formData.horas_proximo_mantenimiento ?? ''}
              onChange={(e) => set('horas_proximo_mantenimiento', e.target.value === '' ? undefined : Number(e.target.value))}
            />
            <Input
              label="Umbral Alerta (hs)"
              type="number"
              value={formData.umbral_alerta_horas ?? ''}
              onChange={(e) => set('umbral_alerta_horas', e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Notas</label>
            <textarea
              value={formData.notas ?? ''}
              onChange={(e) => set('notas', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active ?? true}
              onChange={(e) => set('is_active', e.target.checked)}
              className="rounded accent-blue-600"
            />
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Aeronave Activa</span>
          </label>
        </div>
      </Modal>

      <ConfirmationDialog />
    </DashboardLayout>
  );
}
