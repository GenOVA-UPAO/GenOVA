import { CommonModule } from "@angular/common";
import {
  Component,
  type ElementRef,
  Input,
  inject,
  type OnChanges,
  type OnDestroy,
  type SimpleChanges,
  ViewChild,
} from "@angular/core";
import { DomSanitizer, type SafeResourceUrl } from "@angular/platform-browser";

@Component({
  selector: "gn-html-preview-frame",
  standalone: true,
  imports: [CommonModule],
  template: `
    <iframe
      #iframe
      [title]="title"
      [class]="className"
      [style.height]="height ? height : null"
      sandbox="allow-scripts allow-same-origin"
      [src]="safeUrl"
    ></iframe>
  `,
})
export class HtmlPreviewFrameComponent implements OnChanges, OnDestroy {
  @Input() html = "";
  @Input() height = "60vh";
  @Input() className = "w-full border-0 block";
  @Input() title = "Vista previa del recurso";

  @ViewChild("iframe") iframeRef!: ElementRef<HTMLIFrameElement>;

  private sanitizer = inject(DomSanitizer);

  safeUrl: SafeResourceUrl | null = null;
  private currentBlobUrl: string | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes.html) {
      this.updateUrl();
    }
  }

  ngOnDestroy() {
    this.revokeCurrentUrl();
  }

  private updateUrl() {
    this.revokeCurrentUrl();
    if (!this.html) {
      this.safeUrl = null;
      return;
    }

    const blob = new Blob([this.html], { type: "text/html" });
    this.currentBlobUrl = URL.createObjectURL(blob);

    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.currentBlobUrl);
  }

  private revokeCurrentUrl() {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }
}
