'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { usePagination } from '@/lib/hooks/usePagination';
import { useFilteredData } from '@/lib/hooks/useFilteredData';
import { tipoOperacionService, habilitacionService } from '@/lib/api/services';
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
import { TipoOperacion, HabilitacionTipo, CreateTipoOperacionDTO, TableColumn, TableAction } from '@/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const SEARCH_FIELDS = ['nombre', 'descripcion'];

const emptyForm: CreateTipoOperacionDTO = { nombre: '', descripcion: '', is_active: true, habilitacion_ids: [] };

export default function TiposOperacionPage() {
  const { success, error: showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();
  const [items, setItems] = useState<TipoOperacion[]>([]);
  const [habilitaciones, setHabilitaciones] = useState<HabilitacionTipo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<TipoOperacion | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState<CreateTipoOperacionDTO>(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [tiposRes, habRes] = await Promise.all([
        tipoOperacionService.getAll(),
        habilitacionService.getAll(),
      ]);
      setItems(tiposRes);
      setHabilitaciones(habRes);
    } catch {
      showError('Error al cargar datos');
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

  const handleEdit = (item: TipoOperacion) => {
    setEditing(item);
    setFormData({
      nombre: item.nombre,
      descripcion: item.descripcion ?? '',
      is_active: item.is_active,
      habilitacion_ids: item.habilitaciones_requeridas.map((h) => h.id),
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (item: TipoOperacion) => {
    const confirmed = await confirm({
      title: 'Eliminar Tipo de Operación',
      message: `¿Está seguro de eliminar "${item.nombre}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await tipoOperacionService.delete(item.id);
      success(`"${item.nombre}" eliminado`);
      await loadData();
    } catch {
      showError('Error al eliminar');
    }
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!formData.nombre.trim()) {
      setFormError('El nombre es requerido');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editing) {
        await tipoOperacionService.update(editing.id, formData);
        success('Tipo de operación actualizado');
      } else {
        await tipoOperacionService.create(formData);
        success('Tipo de operación creado');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useFilteredData({
    data: items,
    searchQuery,
    searchFields: SEARCH_FIELDS,
    statusFilter,
  });

  const {
    currentPage, totalPages, currentData: paginated,
    itemsPerPage, startIndex, endIndex,
    goToPage, nextPage, previousPage, goToFirstPage, goToLastPage, setItemsPerPage,
  } = usePagination({ data: filtered, itemsPerPage: 10 });

  const columns: TableColumn<TipoOperacion>[] = [
    { key: 'nombre', label: 'Nombre', render: (t) => <span className="font-medium">{t.nombre}</span> },
    { key: 'descripcion', label: 'Descripción', render: (t) => <span className="text-stone-500">{t.descripcion ?? '—'}</span> },
    {
      key: 'habilitaciones_requeridas',
      label: 'Habilitaciones Requeridas',
      render: (t) =>
        t.habilitaciones_requeridas.length === 0 ? (
          <span className="text-stone-400 text-xs">Ninguna</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {t.habilitaciones_requeridas.map((h) => (
              <span key={h.id} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded">
                {h.nombre}
              </span>
            ))}
          </div>
        ),
    },
    {
      key: 'is_active',
      label: 'Estado',
      render: (t) => (
        <span className={`px-2 py-1 text-xs font-medium rounded ${t.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {t.is_active ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
  ];

  const actions: TableAction<TipoOperacion>[] = [
    { label: 'Editar', onClick: handleEdit, variant: 'secondary', permission: 'tipos_operacion:update', icon: <Pencil className="w-3 h-3" /> },
    { label: 'Eliminar', onClick: handleDelete, variant: 'danger', permission: 'tipos_operacion:delete', icon: <Trash2 className="w-3 h-3" /> },
  ];

  const toggleHab = (id: number) => {
    const ids = formData.habilitacion_ids ?? [];
    setFormData({
      ...formData,
      habilitacion_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    });
  };

  return (
    <DashboardLayout title="Tipos de Operación">
      <Card
        title="Tipos de Operación"
        actions={
          <ProtectedComponent permissions={['tipos_operacion:create']}>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Tipo
            </Button>
          </ProtectedComponent>
        }
      >
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar placeholder="Buscar por nombre o descripción..." onSearch={setSearchQuery} />
          </div>
          <FilterSelect label="Estado" value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTER_OPTIONS as unknown as { value: string; label: string }[]} />
        </div>

        <Table data={paginated} columns={columns} actions={actions} isLoading={isLoading} emptyMessage="No se encontraron tipos de operación" />

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
        title={editing ? 'Editar Tipo de Operación' : 'Nuevo Tipo de Operación'}
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
          <Input
            label="Nombre *"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
          />
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Descripción</label>
            <textarea
              value={formData.descripcion ?? ''}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none"
            />
          </div>
          {habilitaciones.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Habilitaciones Requeridas</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-stone-200 dark:border-stone-700 rounded-md p-3 bg-white dark:bg-stone-900">
                {habilitaciones.map((h) => (
                  <label key={h.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData.habilitacion_ids ?? []).includes(h.id)}
                      onChange={() => toggleHab(h.id)}
                      className="rounded accent-blue-600"
                    />
                    <span className="text-sm text-stone-700 dark:text-stone-300">{h.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active ?? true}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded accent-blue-600"
            />
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Tipo Activo</span>
          </label>
        </div>
      </Modal>

      <ConfirmationDialog />
    </DashboardLayout>
  );
}
