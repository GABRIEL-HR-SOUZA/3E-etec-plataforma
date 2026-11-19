import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../components/page-hero.component';
import { ApiService } from '../../core/api.service';
import { CONTATO, formatarData } from '../../core/institucional-data';

@Component({
  selector: 'app-noticias',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeroComponent],
  template: `
    <app-page-hero
      trilha="Notícias"
      eyebrow="COMUNICAÇÃO"
      titulo="Notícias"
      subtitulo="Acontecimentos da ETEC Cuiabá e da rede de Escolas Técnicas Estaduais da SECITECI."
    />

    <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="flex flex-col md:flex-row gap-3 mb-8">
        <label class="sr-only" for="busca-noticia">Buscar notícia</label>
        <input id="busca-noticia" type="search" class="field md:max-w-sm" placeholder="Buscar notícia…" [ngModel]="busca()" (ngModelChange)="busca.set($event)" />
        <div class="flex flex-wrap gap-2" role="group" aria-label="Categorias">
          <button type="button" (click)="categoria.set('')" class="px-3 py-1.5 rounded-full border text-sm font-medium"
            [class]="categoria() === '' ? 'bg-[#1C4587] text-white border-[#1C4587]' : 'bg-white border-border hover:border-[#1C4587]'">Todas</button>
          @for (c of categorias(); track c) {
            <button type="button" (click)="categoria.set(c)" class="px-3 py-1.5 rounded-full border text-sm font-medium"
              [class]="categoria() === c ? 'bg-[#1C4587] text-white border-[#1C4587]' : 'bg-white border-border hover:border-[#1C4587]'">{{ c }}</button>
          }
        </div>
      </div>

      @if (carregando()) {
        <p class="text-muted-foreground">Carregando notícias…</p>
      } @else if (erro()) {
        <p class="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">Não foi possível carregar as notícias. Tente novamente em instantes.</p>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          @for (n of filtradas(); track n.id) {
            <article class="bg-white border border-border rounded-xl p-5 flex flex-col hover:border-[#1C4587] hover:shadow-md transition-all">
              <div class="flex items-center justify-between gap-2 text-xs mb-2">
                <span class="badge bg-[#1C4587]/10 text-[#1C4587]">{{ n.categoria }}</span>
                @if (n.dataPublicacao) { <time [attr.datetime]="n.dataPublicacao" class="text-muted-foreground">{{ data(n.dataPublicacao) }}</time> }
              </div>
              <h2 class="font-heading font-bold text-lg leading-snug">
                <a [routerLink]="['/noticias', n.slug]" class="hover:text-[#1C4587] hover:underline">{{ n.titulo }}</a>
              </h2>
              <p class="text-sm text-muted-foreground mt-2 leading-relaxed">{{ n.resumo }}</p>
              <a [routerLink]="['/noticias', n.slug]" class="mt-auto pt-4 text-sm font-semibold text-[#1C4587] hover:underline">Ler notícia →</a>
            </article>
          } @empty {
            <p class="text-muted-foreground">Nenhuma notícia encontrada.</p>
          }
        </div>
      }

      <p class="text-sm text-muted-foreground mt-8">
        Acompanhe também o Instagram
        <a [href]="contato.instagramLink" target="_blank" rel="noopener noreferrer" class="text-[#1C4587] font-semibold hover:underline">{{ contato.instagram }}</a>.
      </p>
    </section>
  `
})
export class NoticiasComponent implements OnInit {
  private api = inject(ApiService);
  contato = CONTATO;
  noticias = signal<any[]>([]);
  carregando = signal(true);
  erro = signal(false);
  busca = signal('');
  categoria = signal('');

  categorias = computed(() => [...new Set(this.noticias().map((n) => n.categoria))].sort());
  filtradas = computed(() => {
    const b = this.busca().toLowerCase().trim();
    return this.noticias().filter(
      (n) => (!this.categoria() || n.categoria === this.categoria()) && (!b || `${n.titulo} ${n.resumo}`.toLowerCase().includes(b))
    );
  });

  ngOnInit() {
    this.api.listarNoticias().subscribe({
      next: (l) => { this.noticias.set(l); this.carregando.set(false); },
      error: () => { this.erro.set(true); this.carregando.set(false); }
    });
  }

  data(d: string) { return formatarData(d); }
}
