export interface User {
  id: number;
  uuid: string | null;
  name: string | null;
  email: string;
  avatar: string | null;
  last_ip: string | null;
  last_login_date: string | null;
  email_verified_at: string | null;
  is_account_verified: boolean;
  created_at: string;
  status?: string;
  isOnboarded?: boolean;
  type?: string;
}

export interface CreateUserResponse {
  status: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
    role: string;
    permissions: string[];
  };
  errors?: string[];
}

export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  referral_code?: string;
  country: string;
  acceptTerms: boolean;
  domain?: string;
  userType?: string;
  parentDomain?: string;
  account_type?: string;
  domain_name?: string;
}

export interface ResetPasswordPayload {
  email?: string;
}

export interface UpdatePasswordPayload {
  email?: string;
  token?: string;
  password?: string;
  password_confirmation?: string;
}

export interface ResetPasswordResponse {
  status: boolean;
  message: string;
  errors?: string[];
  data?: [] | unknown;
}

export interface EmailVerificationRequest {
  email: string;
  domain?: string;
  userType?: string;
  parentDomain?: string;
}

export type VerifyEmailPayload = EmailVerificationRequest;
