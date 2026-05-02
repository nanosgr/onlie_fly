'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { usePagination } from '@/lib/hooks/usePagination';
import { pilotoService, habilitacionService, userService } from '@/lib/api/services';
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
import { Piloto, HabilitacionTipo, User, CreatePilotoDTO, UpdatePilotoDTO, LicenciaTipo, TableColumn, TableAction } from '@/types';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';

const LICENCIA_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'privado', label: 'Privado' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'transporte_linea_aerea', label: 'Transporte Línea Aérea' },
];

const LICENCIA_BADGE: Record<string, string> = {
  privado: 'bg-blue-100 text-blue-800',
  comercial: 'bg-amber-100 text-amber-800',
  transporte_linea_aerea: 'bg-green-100 text-green-800',
};

const LICENCIA_LABEL: Record<string, string> = {
  privado: 'Privado',
  comercial: 'Comercial',
  transporte_linea_aerea: 'TLA',
};

const emptyCreateForm: CreatePilotoDTO = {
  user_id: 0,
  licencia_tipo: 'privado',
  numero_licencia: '',
  psicofisico_vence: '',
  habilitacion_ids: [],
};

export default function PilotosPage() {
  const { success, error: showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();
  const [items, setItems] = useState<Piloto[]>([]);
  const [habilitaciones, setHabilitaciones] = useState<HabilitacionTipo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Piloto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [licenciaFilter, setLicenciaFilter] = useState('all');
  const [createForm, setCreateForm] = useState<CreatePilotoDTO>(emptyCreateForm);
  const [editForm, setEditForm] = useState<UpdatePilotoDTO>({});
  const [editHabIds, setEditHabIds] = useState<number[]>([]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [pilotosRes, habRes, usersRes] = await Promise.all([
        pilotoService.getAll(),
        habilitacionService.getAll(),
        userService.getAll({ size: 500 }),
      ]);
      setItems(pilotosRes);
      setHabilitaciones(habRes);
      setUsers(usersRes.items);
    } catch {
      showError('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = () => {
    setEditing(null);
    setCreateForm({ ...emptyCreateForm });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEdit = (item: Piloto) => {
    setEditing(item);
    setEditForm({
      licencia_tipo: item.licencia_tipo,
      numero_licencia: item.numero_licencia,
      psicofisico_vence: item.psicofisico_vence,
    });
    setEditHabIds(item.habilitaciones.map((h) => h.id));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (item: Piloto) => {
    const confirmed = await confirm({
      title: 'Eliminar Piloto',
      message: `¿Está seguro de eliminar el piloto con licencia "${item.numero_licencia}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await pilotoService.delete(item.id);
      success('Piloto eliminado');
      await loadData();
    } catch {
      showError('Error al eliminar el piloto');
    }
  };

  const handleSubmit = async () => {
    setFormError('');
    setIsSubmitting(true);
    try {
      if (editing) {
        await pilotoService.update(editing.id, { ...editForm, habilitacion_ids: editHabIds });
        success('Piloto actualizado');
      } else {
        if (!createForm.user_id || !createForm.numero_licencia || !createForm.psicofisico_vence) {
          setFormError('Usuario, número de licencia y fecha de psicofísico son requeridos');
          setIsSubmitting(false);
          return;
        }
        await pilotoService.create(createForm);
        success('Piloto creado');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserName = (userId: number) => {
    const u = users.find((x) => x.id === userId);
    return u ? (u.full_name || u.username) : `#${userId}`;
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter((p) => {
      const matchesSearch = !q || p.numero_licencia.toLowerCase().includes(q);
      const matchesLicencia = licenciaFilter === 'all' || p.licencia_tipo === licenciaFilter;
      return matchesSearch && matchesLicencia;
    });
  }, [items, searchQuery, licenciaFilter]);

  const {
    currentPage, totalPages, currentData: paginated,
    itemsPerPage, startIndex, endIndex,
    goToPage, nextPage, previousPage, goToFirstPage, goToLastPage, setItemsPerPage,
  } = usePagination({ data: filtered, itemsPerPage: 10 });

  const columns: TableColumn<Piloto>[] = [
    { key: 'numero_licencia', label: 'N° Licencia', render: (p) => <span className="font-medium">{p.numero_licencia}</span> },
    {
      key: 'licencia_tipo',
      label: 'Tipo Licencia',
      render: (p) => (
        <span className={`px-2 py-1 text-xs font-medium rounded ${LICENCIA_BADGE[p.licencia_tipo] ?? 'bg-stone-100 text-stone-700'}`}>
          {LICENCIA_LABEL[p.licencia_tipo] ?? p.licencia_tipo}
        </span>
      ),
    },
    {
      key: 'psicofisico_vence',
      label: 'Psicofísico Vence',
      render: (p) => (
        <span className={`flex items-center gap-1 ${p.psicofisico_vencido ? 'text-red-600 font-medium' : ''}`}>
          {p.psicofisico_vencido && <AlertTriangle className="w-3.5 h-3.5" />}
          {p.psicofisico_vence}
        </span>
      ),
    },
    {
      key: 'habilitaciones',
      label: 'Habilitaciones',
      render: (p) =>
        p.habilitaciones.length === 0 ? (
          <span className="text-stone-400 text-xs">Ninguna</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {p.habilitaciones.map((h) => (
              <span key={h.id} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded">
                {h.nombre}
              </span>
            ))}
          </div>
        ),
    },
    {
      key: 'user_id',
      label: 'Usuario',
      render: (p) => <span className="text-stone-600 dark:text-stone-400">{getUserName(p.user_id)}</span>,
    },
  ];

  const actions: TableAction<Piloto>[] = [
    { label: 'Editar', onClick: handleEdit, variant: 'secondary', permission: 'pilotos:update', icon: <Pencil className="w-3 h-3" /> },
    { label: 'Eliminar', onClick: handleDelete, variant: 'danger', permission: 'pilotos:delete', icon: <Trash2 className="w-3 h-3" /> },
  ];

  const toggleHab = (id: number, isEditing: boolean) => {
    if (isEditing) {
      setEditHabIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    } else {
      const ids = createForm.habilitacion_ids ?? [];
      setCreateForm({ ...createForm, habilitacion_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
    }
  };

  return (
    <DashboardLayout title="Pilotos">
      <Card
        title="Registro de Pilotos"
        actions={
          <ProtectedComponent permissions={['pilotos:create']}>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Piloto
            </Button>
          </ProtectedComponent>
        }
      >
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar placeholder="Buscar por número de licencia..." onSearch={setSearchQuery} />
          </div>
          <FilterSelect label="Licencia" value={licenciaFilter} onChange={setLicenciaFilter} options={LICENCIA_OPTIONS} />
        </div>

        <Table data={paginated} columns={columns} actions={actions} isLoading={isLoading} emptyMessage="No se encontraron pilotos" />

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
        title={editing ? 'Editar Piloto' : 'Nuevo Piloto'}
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
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Usuario</label>
              <p className="text-sm text-stone-700 dark:text-stone-300 px-3 py-2 bg-stone-50 dark:bg-stone-800 rounded-md">
                {getUserName(editing.user_id)}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Usuario *</label>
              <select
                value={createForm.user_id || ''}
                onChange={(e) => setCreateForm({ ...createForm, user_id: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              >
                <option value="">Seleccionar usuario...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Tipo de Licencia *</label>
              <select
                value={editing ? (editForm.licencia_tipo ?? '') : createForm.licencia_tipo}
                onChange={(e) => {
                  const val = e.target.value as LicenciaTipo;
                  editing ? setEditForm({ ...editForm, licencia_tipo: val }) : setCreateForm({ ...createForm, licencia_tipo: val });
                }}
                className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              >
                <option value="privado">Privado</option>
                <option value="comercial">Comercial</option>
                <option value="transporte_linea_aerea">Transporte Línea Aérea</option>
              </select>
            </div>
            <Input
              label="N° Licencia *"
              value={editing ? (editForm.numero_licencia ?? '') : createForm.numero_licencia}
              onChange={(e) => editing
                ? setEditForm({ ...editForm, numero_licencia: e.target.value })
                : setCreateForm({ ...createForm, numero_licencia: e.target.value })
              }
              required
            />
          </div>

          <Input
            label="Psicofísico Vence *"
            type="date"
            value={editing ? (editForm.psicofisico_vence ?? '') : createForm.psicofisico_vence}
            onChange={(e) => editing
              ? setEditForm({ ...editForm, psicofisico_vence: e.target.value })
              : setCreateForm({ ...createForm, psicofisico_vence: e.target.value })
            }
            required
          />

          {habilitaciones.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Habilitaciones</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-stone-200 dark:border-stone-700 rounded-md p-3 bg-white dark:bg-stone-900">
                {habilitaciones.map((h) => {
                  const checked = editing
                    ? editHabIds.includes(h.id)
                    : (createForm.habilitacion_ids ?? []).includes(h.id);
                  return (
                    <label key={h.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleHab(h.id, !!editing)}
                        className="rounded accent-blue-600"
                      />
                      <span className="text-sm text-stone-700 dark:text-stone-300">{h.nombre}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmationDialog />
    </DashboardLayout>
  );
}
