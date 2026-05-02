import { apiClient } from './client';
import {
  User,
  Role,
  Permission,
  AuditLog,
  PaginatedResponse,
  CreateUserDTO,
  UpdateUserDTO,
  UpdateProfileDTO,
  ChangePasswordDTO,
  CreateRoleDTO,
  UpdateRoleDTO,
  CreatePermissionDTO,
  UpdatePermissionDTO,
  GetUsersParams,
  GetRolesParams,
  GetPermissionsParams,
  GetAuditLogsParams,
  PasswordResetRequestDTO,
  PasswordResetConfirmDTO,
  HabilitacionTipo,
  Aeronave,
  Piloto,
  TipoOperacion,
  Planificacion,
  RegistroVuelo,
  CreateHabilitacionDTO,
  UpdateHabilitacionDTO,
  CreateAeronaveDTO,
  UpdateAeronaveDTO,
  CreatePilotoDTO,
  UpdatePilotoDTO,
  CreateTipoOperacionDTO,
  UpdateTipoOperacionDTO,
  CreatePlanificacionDTO,
  UpdatePlanificacionDTO,
  CreateRegistroVueloDTO,
  UpdateRegistroVueloDTO,
} from '@/types';

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== null) {
      query.set(key, String(value));
    }
  }
  const str = query.toString();
  return str ? `?${str}` : '';
}

// User Service
export const userService = {
  getAll: (params: GetUsersParams = {}) =>
    apiClient.get<PaginatedResponse<User>>(`/users/${buildQuery(params as Record<string, string | number | boolean | undefined>)}`),

  getById: (id: number) =>
    apiClient.get<User>(`/users/${id}`),

  getMe: () =>
    apiClient.get<User>('/users/me'),

  create: (data: CreateUserDTO) =>
    apiClient.post<User>('/users/', data),

  update: (id: number, data: UpdateUserDTO) =>
    apiClient.put<User>(`/users/${id}`, data),

  updateMe: (data: UpdateProfileDTO) =>
    apiClient.put<User>('/users/me', data),

  changePassword: (data: ChangePasswordDTO) =>
    apiClient.put<{ message: string }>('/users/me/password', data),

  delete: (id: number) =>
    apiClient.delete<void>(`/users/${id}`),

  assignRoles: (id: number, roleIds: number[]) =>
    apiClient.post<User>(`/users/${id}/roles`, { user_id: id, role_ids: roleIds }),
};

// Role Service
export const roleService = {
  getAll: (params: GetRolesParams = {}) =>
    apiClient.get<PaginatedResponse<Role>>(`/roles/${buildQuery(params as Record<string, string | number | boolean | undefined>)}`),

  getById: (id: number) =>
    apiClient.get<Role>(`/roles/${id}`),

  create: (data: CreateRoleDTO) =>
    apiClient.post<Role>('/roles/', data),

  update: (id: number, data: UpdateRoleDTO) =>
    apiClient.put<Role>(`/roles/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<void>(`/roles/${id}`),

  assignPermissions: (id: number, permissionIds: number[]) =>
    apiClient.post<Role>(`/roles/${id}/permissions`, { role_id: id, permission_ids: permissionIds }),
};

// Permission Service
export const permissionService = {
  getAll: (params: GetPermissionsParams = {}) =>
    apiClient.get<PaginatedResponse<Permission>>(`/permissions/${buildQuery(params as Record<string, string | number | boolean | undefined>)}`),

  getById: (id: number) =>
    apiClient.get<Permission>(`/permissions/${id}`),

  create: (data: CreatePermissionDTO) =>
    apiClient.post<Permission>('/permissions/', data),

  update: (id: number, data: UpdatePermissionDTO) =>
    apiClient.put<Permission>(`/permissions/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<void>(`/permissions/${id}`),

  getAvailableResources: () =>
    apiClient.get<{ resources: string[] }>('/permissions/resources/available'),

  getAvailableActions: () =>
    apiClient.get<{ actions: string[] }>('/permissions/actions/available'),
};

// Audit Service
export const auditService = {
  getLogs: (params: GetAuditLogsParams = {}) =>
    apiClient.get<PaginatedResponse<AuditLog>>(`/audit/logs${buildQuery(params as Record<string, string | number | boolean | undefined>)}`),
};

// Auth Service (public endpoints — no requieren token)
export const authService = {
  requestPasswordReset: (data: PasswordResetRequestDTO) =>
    apiClient.post<{ message: string }>('/auth/password-reset/request', data),

  confirmPasswordReset: (data: PasswordResetConfirmDTO) =>
    apiClient.post<{ message: string }>('/auth/password-reset/confirm', data),
};

export const habilitacionService = {
  getAll: (skip = 0, limit = 100) =>
    apiClient.get<HabilitacionTipo[]>(`/habilitaciones/?skip=${skip}&limit=${limit}`),
  getById: (id: number) =>
    apiClient.get<HabilitacionTipo>(`/habilitaciones/${id}`),
  create: (data: CreateHabilitacionDTO) =>
    apiClient.post<HabilitacionTipo>('/habilitaciones/', data),
  update: (id: number, data: UpdateHabilitacionDTO) =>
    apiClient.put<HabilitacionTipo>(`/habilitaciones/${id}`, data),
  delete: (id: number) =>
    apiClient.delete<void>(`/habilitaciones/${id}`),
};

export const aeronaveService = {
  getAll: (params: Record<string, string | number | boolean | undefined> = {}) =>
    apiClient.get<Aeronave[]>(`/aeronaves/${buildQuery(params)}`),
  getAlertas: () =>
    apiClient.get<Aeronave[]>('/aeronaves/alertas'),
  getById: (id: number) =>
    apiClient.get<Aeronave>(`/aeronaves/${id}`),
  create: (data: CreateAeronaveDTO) =>
    apiClient.post<Aeronave>('/aeronaves/', data),
  update: (id: number, data: UpdateAeronaveDTO) =>
    apiClient.put<Aeronave>(`/aeronaves/${id}`, data),
  delete: (id: number) =>
    apiClient.delete<void>(`/aeronaves/${id}`),
};

export const pilotoService = {
  getAll: () =>
    apiClient.get<Piloto[]>('/pilotos/'),
  getMe: () =>
    apiClient.get<Piloto>('/pilotos/me'),
  getById: (id: number) =>
    apiClient.get<Piloto>(`/pilotos/${id}`),
  create: (data: CreatePilotoDTO) =>
    apiClient.post<Piloto>('/pilotos/', data),
  update: (id: number, data: UpdatePilotoDTO) =>
    apiClient.put<Piloto>(`/pilotos/${id}`, data),
  delete: (id: number) =>
    apiClient.delete<void>(`/pilotos/${id}`),
};

export const tipoOperacionService = {
  getAll: (isActive?: boolean) =>
    apiClient.get<TipoOperacion[]>(`/tipos-operacion/${buildQuery(
      isActive !== undefined ? { is_active: isActive } : {}
    )}`),
  getById: (id: number) =>
    apiClient.get<TipoOperacion>(`/tipos-operacion/${id}`),
  create: (data: CreateTipoOperacionDTO) =>
    apiClient.post<TipoOperacion>('/tipos-operacion/', data),
  update: (id: number, data: UpdateTipoOperacionDTO) =>
    apiClient.put<TipoOperacion>(`/tipos-operacion/${id}`, data),
  delete: (id: number) =>
    apiClient.delete<void>(`/tipos-operacion/${id}`),
};

export const planificacionService = {
  getAll: (params: Record<string, string | number | boolean | undefined> = {}) =>
    apiClient.get<Planificacion[]>(`/planificaciones/${buildQuery(params)}`),
  getById: (id: number) =>
    apiClient.get<Planificacion>(`/planificaciones/${id}`),
  create: (data: CreatePlanificacionDTO) =>
    apiClient.post<Planificacion>('/planificaciones/', data),
  update: (id: number, data: UpdatePlanificacionDTO) =>
    apiClient.put<Planificacion>(`/planificaciones/${id}`, data),
  cancelar: (id: number) =>
    apiClient.patch<Planificacion>(`/planificaciones/${id}/cancelar`),
  delete: (id: number) =>
    apiClient.delete<void>(`/planificaciones/${id}`),
};

export const registroVueloService = {
  getAll: (params: Record<string, string | number | boolean | undefined> = {}) =>
    apiClient.get<RegistroVuelo[]>(`/registros-vuelo/${buildQuery(params)}`),
  getById: (id: number) =>
    apiClient.get<RegistroVuelo>(`/registros-vuelo/${id}`),
  create: (data: CreateRegistroVueloDTO) =>
    apiClient.post<RegistroVuelo>('/registros-vuelo/', data),
  update: (id: number, data: UpdateRegistroVueloDTO) =>
    apiClient.put<RegistroVuelo>(`/registros-vuelo/${id}`, data),
};
