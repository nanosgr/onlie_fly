'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { usePagination } from '@/lib/hooks/usePagination';
import { habilitacionService } from '@/lib/api/services';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/common/Card';
import Table from '@/components/common/Table';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import ProtectedComponent from '@/components/common/ProtectedComponent';
import SearchBar from '@/components/common/SearchBar';
import Pagination from '@/components/common/Pagination';
import ErrorAlert from '@/components/common/ErrorAlert';
import ModalFooter from '@/components/common/ModalFooter';
import { HabilitacionTipo, CreateHabilitacionDTO, TableColumn, TableAction } from '@/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const SEARCH_FIELDS = ['nombre', 'descripcion'];

export default function HabilitacionesPage() {
  const { success, error: showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();
  const [items, setItems] = useState<HabilitacionTipo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<HabilitacionTipo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<CreateHabilitacionDTO>({ nombre: '', descripcion: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await habilitacionService.getAll();
      setItems(data);
    } catch {
      showError('Error al cargar habilitaciones');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = () => {
    setEditing(null);
    setFormData({ nombre: '', descripcion: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEdit = (item: HabilitacionTipo) => {
    setEditing(item);
    setFormData({ nombre: item.nombre, descripcion: item.descripcion ?? '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (item: HabilitacionTipo) => {
    const confirmed = await confirm({
      title: 'Eliminar Habilitación',
      message: `¿Está seguro de eliminar la habilitación "${item.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await habilitacionService.delete(item.id);
      success(`Habilitación "${item.nombre}" eliminada`);
      await loadData();
    } catch {
      showError('Error al eliminar la habilitación');
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
        await habilitacionService.update(editing.id, formData);
        success('Habilitación actualizada');
      } else {
        await habilitacionService.create(formData);
        success('Habilitación creada');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      SEARCH_FIELDS.some((f) => String((item as unknown as Record<string, unknown>)[f] ?? '').toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const {
    currentPage, totalPages, currentData: paginated,
    itemsPerPage, startIndex, endIndex,
    goToPage, nextPage, previousPage, goToFirstPage, goToLastPage, setItemsPerPage,
  } = usePagination({ data: filtered, itemsPerPage: 10 });

  const columns: TableColumn<HabilitacionTipo>[] = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción', render: (item) => <span className="text-stone-500">{item.descripcion ?? '—'}</span> },
  ];

  const actions: TableAction<HabilitacionTipo>[] = [
    { label: 'Editar', onClick: handleEdit, variant: 'secondary', permission: 'habilitaciones:update', icon: <Pencil className="w-3 h-3" /> },
    { label: 'Eliminar', onClick: handleDelete, variant: 'danger', permission: 'habilitaciones:delete', icon: <Trash2 className="w-3 h-3" /> },
  ];

  return (
    <DashboardLayout title="Habilitaciones">
      <Card
        title="Tipos de Habilitación"
        actions={
          <ProtectedComponent permissions={['habilitaciones:create']}>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nueva Habilitación
            </Button>
          </ProtectedComponent>
        }
      >
        <div className="mb-6">
          <SearchBar placeholder="Buscar por nombre o descripción..." onSearch={setSearchQuery} />
        </div>

        <Table data={paginated} columns={columns} actions={actions} isLoading={isLoading} emptyMessage="No se encontraron habilitaciones" />

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
        title={editing ? 'Editar Habilitación' : 'Nueva Habilitación'}
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
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      <ConfirmationDialog />
    </DashboardLayout>
  );
}
