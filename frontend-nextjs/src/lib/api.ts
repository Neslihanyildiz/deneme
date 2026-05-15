// src/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// ── Response types ─────────────────────────────────────────────────────────

interface RegisterResponse {
  message: string;
  userId: number;
  error?: string;
}

interface LoginResponse {
  message: string;
  // token artık body'de gelmiyor — httpOnly cookie olarak geliyor
  encrypted_private_key?: string | null;
  key_salt?: string | null;
  user: {
    id: number;
    username: string;
    public_key: string;
    role: import("@/lib/types").UserRole;
  };
  error?: string;
}

interface UploadResponse {
  message: string;
  fileId?: number;
  error?: string;
}

interface ShareResponse {
  message: string;
  error?: string;
}

interface DownloadResponse {
  url: string;
  filename: string;
  error?: string;
}

import type { User, FileData, SharedFile, AuditLog } from "@/lib/types";
export type { User, FileData, SharedFile, AuditLog };

// ── API calls ──────────────────────────────────────────────────────────────
// Tüm isteklerde credentials: "include" var — tarayıcı httpOnly cookie'yi
// otomatik ekler, localStorage.getItem("token") artık kullanılmıyor.

export const api = {
  // POST /api/auth/register
  register: async (
    username: string,
    password: string,
    publicKey: string,
    encryptedPrivateKey: string,
    keySalt: string,
  ): Promise<RegisterResponse> => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password, publicKey, encryptedPrivateKey, keySalt }),
    });
    return res.json();
  },

  // POST /api/auth/login
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // cookie buradan gelir
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Login failed");
    }
    return res.json();
  },

  // POST /api/auth/logout
  logout: async (): Promise<void> => {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  },

  // POST /api/files/upload
  uploadFile: async (formData: FormData): Promise<UploadResponse> => {
    const res = await fetch(`${API_URL}/files/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Upload failed");
    }
    return res.json();
  },

  // GET /api/files/list
  getFiles: async (): Promise<FileData[]> => {
    const res = await fetch(`${API_URL}/files/list`, {
      credentials: "include",
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // GET /api/files/download/:fileId
  getDownloadUrl: async (fileId: number): Promise<DownloadResponse> => {
    const res = await fetch(`${API_URL}/files/download/${fileId}`, {
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Download failed");
    }
    return res.json();
  },

  // GET /api/files/logs
  getLogs: async (): Promise<AuditLog[]> => {
    const res = await fetch(`${API_URL}/files/logs`, {
      credentials: "include",
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // GET /api/files/users
  getUsersList: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/files/users`, {
      credentials: "include",
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // POST /api/files/share
  shareFile: async (
    fileId: number,
    toUserId: number,
    encryptedKey: string,
  ): Promise<ShareResponse> => {
    const res = await fetch(`${API_URL}/files/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fileId, toUserId, encryptedKey }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Share failed");
    }
    return res.json();
  },

  // GET /api/files/shared
  getSharedFiles: async (): Promise<SharedFile[]> => {
    const res = await fetch(`${API_URL}/files/shared`, {
      credentials: "include",
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },
};