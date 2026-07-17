import { inject, Injectable } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { type RouterStateSnapshot, TitleStrategy } from "@angular/router";

/**
 * Sufija todos los títulos de ruta con la marca (" · GenOVA") en un único
 * lugar: las rutas declaran solo el nombre de página ("Dashboard") y las
 * rutas sin `title` caen al título base "GenOVA".
 */
@Injectable({ providedIn: "root" })
export class GenovaTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} · GenOVA` : "GenOVA");
  }
}
