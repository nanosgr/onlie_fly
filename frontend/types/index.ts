// User types
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at?: string;
  roles: Role[];
}

// Role types
export interface Role {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  permissions: Permission[];
}

// Permission types
export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// AuditLog types
export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  resource: string;
  resource_id: number | null;
  details: string | null;
  ip_address: string | null;
  request_id: string | null;
  status: string;
  before_data: string | null;
  after_data: string | null;
  subject_id: number | null;
  user_agent: string | null;
  timestamp: string | null;
}

// Auth types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

// API Response types
export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// CRUD DTOs
export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  full_name: string;
  is_active?: boolean;
  role_ids?: number[];
}

export interface UpdateUserDTO {
  email?: string;
  full_name?: string;
  is_active?: boolean;
  password?: string;
}

export interface UpdateProfileDTO {
  email?: string;
  full_name?: string;
}

export interface ChangePasswordDTO {
  current_password: string;
  new_password: string;
}

export interface CreateRoleDTO {
  name: string;
  description: string;
  is_active?: boolean;
  permission_ids?: number[];
}

export interface UpdateRoleDTO {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreatePermissionDTO {
  name: string;
  description: string;
  resource: string;
  action: string;
  is_active?: boolean;
}

export interface UpdatePermissionDTO {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// Query param types
export interface GetUsersParams {
  page?: number;
  size?: number;
  search?: string;
  is_active?: boolean;
}

export interface GetRolesParams {
  page?: number;
  size?: number;
  search?: string;
  is_active?: boolean;
}

export interface GetPermissionsParams {
  page?: number;
  size?: number;
  search?: string;
  resource?: string;
  action?: string;
  is_active?: boolean;
}

export interface GetAuditLogsParams {
  page?: number;
  size?: number;
  user_id?: number;
  action?: string;
  resource?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}

// Component props types
export interface ProtectedComponentProps {
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

export interface TableAction<T> {
  label: string;
  onClick: (item: T) => void;
  icon?: React.ReactNode;
  permission?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

// Password reset DTOs
export interface PasswordResetRequestDTO {
  identifier: string;
}

export interface PasswordResetConfirmDTO {
  token: string;
  new_password: string;
}

// --- Aeronáutica ---

export interface HabilitacionTipo {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface Aeronave {
  id: number;
  matricula: string;
  modelo: string;
  tipo: 'monomotor' | 'bimotor' | 'otro';
  fabricante?: string;
  notas?: string;
  horas_totales: number;
  horas_proximo_mantenimiento?: number;
  umbral_alerta_horas?: number;
  is_active: boolean;
  alerta_mantenimiento: boolean;
  horas_para_mantenimiento?: number;
  created_at?: string;
  updated_at?: string;
}

export type LicenciaTipo = 'privado' | 'comercial' | 'transporte_linea_aerea';

export interface Piloto {
  id: number;
  user_id: number;
  licencia_tipo: LicenciaTipo;
  numero_licencia: string;
  psicofisico_vence: string;
  psicofisico_vencido: boolean;
  nombre_completo?: string;
  habilitaciones: HabilitacionTipo[];
  created_at?: string;
  updated_at?: string;
}

export interface TipoOperacion {
  id: number;
  nombre: string;
  descripcion?: string;
  is_active: boolean;
  habilitaciones_requeridas: HabilitacionTipo[];
  created_at?: string;
  updated_at?: string;
}

export type PlanificacionStatus = 'programado' | 'completado' | 'cancelado';

export interface Planificacion {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string;
  status: PlanificacionStatus;
  notas?: string;
  piloto_id: number;
  aeronave_id: number;
  tipo_operacion_id: number;
  created_by_id?: number;
  piloto?: Piloto;
  aeronave?: Aeronave;
  tipo_operacion?: TipoOperacion;
  registro_vuelo?: RegistroVuelo | null;
  created_at?: string;
  updated_at?: string;
}

export interface RegistroVuelo {
  id: number;
  hora_inicio_real?: string;
  hora_fin_real?: string;
  horas_vuelo: number;
  combustible_litros?: number;
  aceite_litros?: number;
  novedades?: string;
  planificacion_id: number;
  piloto_id: number;
  aeronave_id: number;
  planificacion?: Planificacion;
  created_at?: string;
}

export interface CreateHabilitacionDTO { nombre: string; descripcion?: string; }
export interface UpdateHabilitacionDTO { nombre?: string; descripcion?: string; }

export interface CreateAeronaveDTO {
  matricula: string; modelo: string; tipo: 'monomotor' | 'bimotor' | 'otro';
  fabricante?: string; notas?: string;
  horas_totales?: number; horas_proximo_mantenimiento?: number; umbral_alerta_horas?: number;
  is_active?: boolean;
}
export interface UpdateAeronaveDTO extends Partial<CreateAeronaveDTO> {}

export interface CreatePilotoDTO {
  user_id: number; licencia_tipo: LicenciaTipo; numero_licencia: string;
  psicofisico_vence: string; habilitacion_ids?: number[];
}
export interface UpdatePilotoDTO extends Partial<Omit<CreatePilotoDTO, 'user_id'>> {}

export interface CreateTipoOperacionDTO {
  nombre: string; descripcion?: string; is_active?: boolean; habilitacion_ids?: number[];
}
export interface UpdateTipoOperacionDTO extends Partial<CreateTipoOperacionDTO> {}

export interface CreatePlanificacionDTO {
  fecha: string; hora_inicio: string; hora_fin?: string; notas?: string;
  status?: PlanificacionStatus;
  piloto_id: number; aeronave_id: number; tipo_operacion_id: number;
}
export interface UpdatePlanificacionDTO extends Partial<CreatePlanificacionDTO> {}

export interface CreateRegistroVueloDTO {
  planificacion_id: number;
  hora_inicio_real: string;
  hora_fin_real: string;
  combustible_litros?: number;
  aceite_litros?: number;
  novedades?: string;
}
export interface UpdateRegistroVueloDTO {
  hora_inicio_real?: string;
  hora_fin_real?: string;
  combustible_litros?: number;
  aceite_litros?: number;
  novedades?: string;
}
