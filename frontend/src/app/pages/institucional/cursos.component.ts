import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../components/page-hero.component';
import { ApiService } from '../../core/api.service';
import { CURSOS_TECNICOS, HISTORIA } from '../../core/institucional-data';

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeroComponent],
  template: `
    <app-page-hero
      trilha="Cursos técnicos"
      eyebrow="ENSINO PÚBLICO E GRATUITO"
      titulo="Cursos técnicos da ETEC Cuiabá"
      subtitulo="Conheça os cursos ofertados pela unidade, o eixo tecnológico de cada um e as vagas de estágio e emprego ligadas a eles."
    />

    <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="flex flex-col md:flex-row md:items-center gap-3 mb-8">
        <label class="sr-only" for="busca-curso">Buscar curso</label>
        <input id="busca-curso" type="search" class="field md:max-w-xs" placeholder="Buscar curso…" [ngModel]="busca()" (ngModelChange)="busca.set($event)" />
        <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar por eixo">
          <button type="button" (click)="eixo.set('')" class="px-3 py-1.5 rounded-full border text-sm font-medium transition-colors"
            [class]="eixo() === '' ? 'bg-[#1C4587] text-white border-[#1C4587]' : 'bg-white border-border hover:border-[#1C4587]'">Todos</button>
          @for (e of eixos; track e) {
            <button type="button" (click)="eixo.set(e)" class="px-3 py-1.5 rounded-full border text-sm font-medium transition-colors"
              [class]="eixo() === e ? 'bg-[#1C4587] text-white border-[#1C4587]' : 'bg-white border-border hover:border-[#1C4587]'">{{ e }}</button>
          }
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        @for (c of filtrados(); track c.slug) {
          <article [id]="c.slug" class="bg-white border border-border rounded-xl p-6 flex flex-col scroll-mt-16">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span class="badge bg-[#1C4587]/10 text-[#1C4587]">{{ c.eixo }}</span>
              <span class="badge bg-muted text-foreground">mín. {{ c.cargaMinima.toLocaleString('pt-BR') }} h</span>
            </div>
            <h2 class="font-heading font-bold text-xl">{{ c.nome }}</h2>
            <p class="text-sm text-muted-foreground mt-1">📍 {{ c.local }}</p>
            <p class="text-[15px] mt-3 leading-relaxed">{{ c.descricao }}</p>
            <p class="text-sm font-semibold mt-4">Onde trabalhar</p>
            <ul class="mt-1 flex flex-wrap gap-1.5">
              @for (a of c.atuacao; track a) {
                <li class="text-xs px-2 py-1 rounded bg-muted">{{ a }}</li>
              }
            </ul>
            <div class="mt-auto pt-5 flex flex-wrap items-center justify-between gap-3">
              @if (comVagas(c.slug); as p) {
                <a [routerLink]="['/vagas']" [queryParams]="{ cursoId: p.id }" class="text-sm font-semibold text-[#1E7F4A] hover:underline">
                  {{ p.vagasAbertas }} {{ p.vagasAbertas === 1 ? 'vaga aberta' : 'vagas abertas' }} no portal →
                </a>
              } @else {
                <span class="text-sm text-muted-foreground">Sem vagas no portal no momento</span>
              }
              <a routerLink="/editais" class="text-sm font-semibold text-[#1C4587] hover:underline">Como ingressar</a>
            </div>
          </article>
        } @empty {
          <p class="text-muted-foreground md:col-span-2">Nenhum curso encontrado para esse filtro.</p>
        }
      </div>
    </section>

    <section class="bg-muted/60 border-t border-border py-12">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div>
          <span class="eyebrow">COMO INGRESSAR</span>
          <h2 class="section-title">Processo seletivo</h2>
          <p class="text-sm text-muted-foreground mt-2">
            As vagas são preenchidas por edital da SECITECI, em geral com inscrição online gratuita e sorteio eletrônico público,
            com reserva de vagas para pessoas negras, oriundas de escola pública, indígenas e pessoas com deficiência.
          </p>
          <a routerLink="/editais" class="btn-primary mt-4">Ver editais</a>
        </div>
        @for (m of historia.modalidades; track m.nome) {
          @if (!$last) {
            <div class="bg-white border border-border rounded-xl p-5">
              <p class="font-semibold text-[#1C4587]">{{ m.nome }}</p>
              <p class="text-sm text-muted-foreground mt-1">{{ m.descricao }}</p>
            </div>
          }
        }
      </div>
      <p class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-xs text-muted-foreground mt-6">
        Carga horária mínima conforme o Catálogo Nacional de Cursos Técnicos (MEC). A carga de cada turma é definida no edital
        e no plano de curso — os cursos da ETEC têm entre 1.200 e 1.600 horas segundo o último processo seletivo.
      </p>
    </section>
  `
})
export class CursosComponent implements OnInit {
  private api = inject(ApiService);

  historia = HISTORIA;
  eixos = [...new Set(CURSOS_TECNICOS.map((c) => c.eixo))];
  busca = signal('');
  eixo = signal('');
  portal = signal<Record<string, { id: number; vagasAbertas: number }>>({});

  filtrados = computed(() => {
    const b = this.busca().toLowerCase().trim();
    return CURSOS_TECNICOS.filter(
      (c) => (!this.eixo() || c.eixo === this.eixo()) && (!b || c.nome.toLowerCase().includes(b) || c.descricao.toLowerCase().includes(b))
    );
  });

  comVagas(slug: string) {
    const p = this.portal()[slug];
    return p && p.vagasAbertas > 0 ? p : null;
  }

  ngOnInit() {
    // Cruza o catálogo oficial com os cursos cadastrados no Portal de Vagas (contador de vagas abertas)
    this.api.listarCursos().subscribe({
      next: (lista) => {
        const mapa: Record<string, { id: number; vagasAbertas: number }> = {};
        lista.forEach((c) => (mapa[c.slug] = { id: c.id, vagasAbertas: c.vagasAbertas }));
        this.portal.set(mapa);
      },
      error: () => {}
    });
  }
}
