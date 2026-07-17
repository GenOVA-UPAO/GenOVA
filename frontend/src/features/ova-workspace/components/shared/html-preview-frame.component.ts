import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  Input,
  input,
  type OnChanges,
  type OnDestroy,
  type SimpleChanges,
  viewChild,
} from "@angular/core";
import { DomSanitizer, type SafeResourceUrl } from "@angular/platform-browser";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-html-preview-frame",
  imports: [],
  template: `
    <iframe
      #iframe
      [title]="title()"
      [class]="className()"
      [style.height]="height ? height : null"
      sandbox="allow-scripts"
      [src]="safeUrl"
    ></iframe>
  `,
})
export class HtmlPreviewFrameComponent implements OnChanges, OnDestroy {
  readonly html = input("");
  @Input() height = "60vh";
  readonly className = input("w-full border-0 block");
  readonly title = input("Vista previa del recurso");

  readonly iframeRef = viewChild.required<ElementRef<HTMLIFrameElement>>("iframe");

  private sanitizer = inject(DomSanitizer);

  safeUrl: SafeResourceUrl | null = null;
  private currentBlobUrl: string | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes["html"]) {
      this.updateUrl();
    }
  }

  ngOnDestroy() {
    this.revokeCurrentUrl();
  }

  private updateUrl() {
    this.revokeCurrentUrl();
    const html = this.html();
    if (!html) {
      this.safeUrl = null;
      return;
    }

    const blob = new Blob([html], { type: "text/html" });
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
