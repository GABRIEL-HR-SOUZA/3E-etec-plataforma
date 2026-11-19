import { Component, OnInit, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { formatarData } from '../../core/institucional-data';

@Component({
  selector: 'app-noticia-detalhe',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <nav aria-label="Trilha de navegação" class="text-[13px] text-muted-foreground mb-6">
        <a routerLink="/" class="hover:underline">Início</a> <span class="mx-1">/</span>
        <a routerLink="/noticias" class="hover:underline">Notícias</a>
      </nav>

      @if (carregando()) {
        <p class="text-muted-foreground">Carregando…</p>
      } @else if (!noticia()) {
        <h1 class="section-title">Notícia não encontrada</h1>
        <p class="text-muted-foreground mt-2">Ela pode ter sido removida ou o endereço está incorreto.</p>
        <a routerLink="/noticias" class="btn-primary mt-6">Ver todas as notícias</a>
      } @else {
        @let n = noticia();
        <span class="badge bg-[#1C4587]/10 text-[#1C4587]">{{ n.categoria }}</span>
        <h1 class="font-heading font-bold text-3xl sm:text-4xl leading-tight mt-3">{{ n.titulo }}</h1>
        <p class="text-lg text-muted-foreground mt-3 leading-relaxed">{{ n.resumo }}</p>
        <p class="text-sm text-muted-foreground mt-4 pb-6 border-b border-border">
          @if (n.dataPublicacao) { Publicado em {{ data(n.dataPublicacao) }} }
          @if (n.autor) { · {{ n.autor }} }
        </p>
        <div class="mt-6 space-y-4 text-[17px] leading-relaxed text-foreground/90">
          @for (p of paragrafos(); track $index) { <p>{{ p }}</p> }
        </div>
        @if (n.fonteUrl) {
          <a [href]="n.fonteUrl" target="_blank" rel="noopener noreferrer" class="btn-outline mt-8">Ver matéria original na fonte ↗</a>
        }
        <div class="mt-10 pt-6 border-t border-border">
          <a routerLink="/noticias" class="text-sm font-semibold text-[#1C4587] hover:underline">← Voltar para notícias</a>
        </div>
      }
    </article>
  `
})
export class NoticiaDetalheComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private title = inject(Title);

  noticia = signal<any>(null);
  paragrafos = signal<string[]>([]);
  carregando = signal(true);

  ngOnInit() {
    this.route.paramMap.subscribe((pm) => {
      this.carregando.set(true);
      this.api.detalheNoticia(pm.get('slug') ?? '').subscribe({
        next: (n) => {
          this.noticia.set(n);
          this.paragrafos.set(String(n.conteudo ?? '').split(/\n\s*\n/).map((s: string) => s.trim()).filter(Boolean));
          this.title.setTitle(`${n.titulo} — ETEC Cuiabá`);
          this.carregando.set(false);
        },
        error: () => { this.noticia.set(null); this.carregando.set(false); }
      });
    });
  }

  data(d: string) { return formatarData(d, { day: '2-digit', month: 'long', year: 'numeric' }); }
}
