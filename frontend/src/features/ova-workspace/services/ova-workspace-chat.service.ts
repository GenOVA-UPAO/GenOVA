import { inject, Injectable, signal } from "@angular/core";

import { apiJson } from "@/core/lib/http";

import {
  fromApiMessage,
  patchChatMessage,
  type RegenChatMessage,
  selectionAllMessage,
  selectionToggleMessage,
  systemChatMessage,
  userChatMessage,
} from "../lib/regen-chat";

@Injectable({ providedIn: "root" })
export class OvaWorkspaceChatService {
  private readonly messagesState = signal<RegenChatMessage[]>([]);
  private ovaId: string | null = null;

  readonly messages = this.messagesState.asReadonly();

  reset(ovaId: string | null) {
    this.ovaId = ovaId;
    this.messagesState.set([]);
  }

  async load(ovaId: string): Promise<void> {
    this.ovaId = ovaId;
    try {
      const data = (await apiJson(`/api/ovas/${ovaId}/chat`)) as {
        messages?: Array<Parameters<typeof fromApiMessage>[0]>;
      };
      this.messagesState.set((data.messages ?? []).map(fromApiMessage));
    } catch {
      this.messagesState.set([]);
    }
  }

  async append(msg: RegenChatMessage): Promise<void> {
    this.messagesState.update((msgs) => [...msgs, msg]);
    await this.persistCreate(msg);
  }

  async appendMany(msgs: RegenChatMessage[]): Promise<void> {
    this.messagesState.update((prev) => [...prev, ...msgs]);
    for (const msg of msgs) {
      await this.persistCreate(msg);
    }
  }

  async patch(id: string, patch: Partial<RegenChatMessage>): Promise<void> {
    this.messagesState.update((msgs) => patchChatMessage(msgs, id, patch));
    const next = this.messagesState().find((m) => m.id === id);
    if (!next || !this.ovaId) return;
    try {
      await apiJson(`/api/ovas/${this.ovaId}/chat/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          text: next.text,
          status: next.status ?? null,
          percentage: next.percentage ?? null,
          resource_labels: next.resourceLabels ?? [],
        }),
      });
    } catch {
      /* historial local ya actualizado */
    }
  }

  async logSelectionToggle(label: string, selected: boolean): Promise<void> {
    await this.append(selectionToggleMessage(label, selected));
  }

  async logSelectionAll(labels: string[], allSelected: boolean): Promise<void> {
    await this.append(selectionAllMessage(labels, allSelected));
  }

  async logSelectionMode(enabled: boolean): Promise<void> {
    await this.append(
      systemChatMessage(
        enabled
          ? "Modo selección de recursos activado."
          : "Modo selección de recursos desactivado.",
        { kind: "selection" },
      ),
    );
  }

  async logRegenAllIntent(): Promise<RegenChatMessage> {
    const msg = userChatMessage("Regenerar OVA completo", { kind: "regen_all" });
    await this.append(msg);
    return msg;
  }

  private async persistCreate(msg: RegenChatMessage): Promise<void> {
    if (!this.ovaId) return;
    try {
      await apiJson(`/api/ovas/${this.ovaId}/chat`, {
        method: "POST",
        body: JSON.stringify({
          id: msg.id,
          role: msg.role,
          kind: msg.kind,
          text: msg.text,
          status: msg.status ?? null,
          percentage: msg.percentage ?? null,
          resource_labels: msg.resourceLabels ?? [],
        }),
      });
    } catch {
      /* no bloquear la UI si falla el guardado */
    }
  }
}
