import { Injectable } from "@angular/core";
import { apiFetch } from "../../../core/lib/http";

export interface UserLink {
  id: string;
  status: string;
  owner_user_id?: string;
  invite_email?: string;
  linked?: { full_name?: string; email?: string } | null;
  owner?: { email?: string };
  [key: string]: unknown;
}

export interface LinksResponse {
  links?: UserLink[];
}

export interface LinkCodeResponse {
  code: string;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(url, init);
  if (!res.ok) {
    let data: any = {};
    try {
      data = await res.json();
    } catch {}
    throw new Error(data.message || data.detail || "Error en la solicitud");
  }
  return res.json() as Promise<T>;
}

@Injectable({
  providedIn: "root",
})
export class UserLinksService {
  fetchMyLinks(): Promise<LinksResponse> {
    return apiJson<LinksResponse>("/api/users/me/links");
  }

  fetchAllLinks(): Promise<LinksResponse> {
    return apiJson<LinksResponse>("/api/users/links/admin");
  }

  createLinkCode(): Promise<LinkCodeResponse> {
    return apiJson<LinkCodeResponse>("/api/users/me/links/code", {
      method: "POST",
    });
  }

  inviteLink(email: string): Promise<LinkCodeResponse> {
    return apiJson<LinkCodeResponse>("/api/users/me/links/invite", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  acceptLink(code: string): Promise<unknown> {
    return apiJson("/api/users/me/links/accept", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  deleteMyLink(linkId: string | number): Promise<unknown> {
    return apiJson(`/api/users/me/links/${linkId}`, { method: "DELETE" });
  }

  deleteAnyLink(linkId: string | number): Promise<unknown> {
    return apiJson(`/api/users/links/admin/${linkId}`, { method: "DELETE" });
  }

  resendLink(linkId: string | number): Promise<LinkCodeResponse> {
    return apiJson<LinkCodeResponse>(`/api/users/me/links/${linkId}/resend`, {
      method: "POST",
    });
  }
}
