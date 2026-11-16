import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { LoginResponse, User } from '@/types/api'

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/v1/auth/login', { email, password }),
  me: () => api.get<User>('/v1/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<void>('/v1/auth/change-password', { currentPassword, newPassword }),
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(input.currentPassword, input.newPassword),
  })
}
