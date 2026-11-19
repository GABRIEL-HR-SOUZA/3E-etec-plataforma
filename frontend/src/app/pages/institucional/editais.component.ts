import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeroComponent } from '../../components/page-hero.component';
import { ApiService } from '../../core/api.service';
import { CONTATO, STATUS_EDITAL, formatarData } from '../../core/institucional-data';

@Component({
  selector: 'app-editais',
  standalone: true,
  imports: [FormsModule, PageHeroComponent],
  template: `
    <app-page-hero
      trilha="Editais"
      eyebrow="PROCESSOS SELETIVOS"
      titulo="Editais e processos seletivos"
      subtitulo="Seleção de alunos para cursos técnicos e FIC, processos de contratação de professores e técnicos e regulamentos de eventos da rede ETEC."
    />

    <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="flex flex-col md:flex-row gap-3 mb-6">
        <label class="sr-only" for="busca-edital">Buscar edital</label>
        <input id="busca-edital" type="search" class="field md:max-w-sm" placeholder="Buscar por número ou assunto…" [ngModel]="busca()" (ngModelChange)="busca.set($event)" />
        <select class="field md:max-w-[200px]" aria-label="Status" [ngModel]="status()" (ngModelChange)="status.set($event)">
          <option value="">Todos os status</option>
          <option value="aberto">Inscrições abertas</option>
          <option value="em_andamento">Em andamento</option>
          <option value="encerrado">Encerrados</option>
        </select>
        <select class="field md:max-w-[200px]" aria-label="Categoria" [ngModel]="categoria()" (ngModelChange)="categoria.set($event)">
          <option value="">Todas as categorias</option>
          @for (c of categorias(); track c) { <option [value]="c">{{ c }}</option> }
        </select>
      </div>

      @if (carregando()) {
        <p class="text-muted-foreground">Carregando editais…</p>
      } @else if (erro()) {
        <div class="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          Não foi possível carregar os editais agora. Consulte a
          <a [href]="contato.editaisSecitec" target="_blank" rel="noopener noreferrer" class="underline font-semibold">página oficial de editais da SECITECI</a>.
        </div>
      } @else {
        <p class="text-sm text-muted-foreground mb-4">{{ filtrados().length }} {{ filtrados().length === 1 ? 'edital' : 'editais' }}</p>
        <ul class="space-y-4">
          @for (e of filtrados(); track e.id) {
            <li class="bg-white border border-border rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-start gap-4">
              <div class="md:w-40 shrink-0">
                <p class="font-heading font-bold text-2xl text-[#1C4587] leading-none">{{ e.numero }}</p>
                <p class="text-xs text-muted-foreground mt-1">{{ e.orgao }}</p>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap gap-2 mb-1.5">
                  <span class="badge" [class]="'badge ' + st(e.status).classe">{{ st(e.status).label }}</span>
                  <span class="badge bg-muted text-foreground">{{ e.categoria }}</span>
                </div>
                <h2 class="font-heading font-bold text-lg leading-snug">{{ e.titulo }}</h2>
                <p class="text-sm text-muted-foreground mt-1.5 leading-relaxed">{{ e.descricao }}</p>
                @if (e.inscricaoInicio) {
                  <p class="text-sm font-semibold mt-2">
                    Inscrições: {{ data(e.inscricaoInicio) }}@if (e.inscricaoFim) { a {{ data(e.inscricaoFim) }} }
                  </p>
                }
              </div>
              @if (e.documentoUrl) {
                <a [href]="e.documentoUrl" target="_blank" rel="noopener noreferrer" class="btn-outline text-sm shrink-0">
                  Abrir edital ↗
                </a>
              }
            </li>
          } @empty {
            <li class="text-muted-foreground">Nenhum edital encontrado com esses filtros.</li>
          }
        </ul>
      }

      <p class="text-sm text-muted-foreground mt-8">
        A lista completa da rede estadual, com retificações e resultados, fica na
        <a [href]="contato.editaisSecitec" target="_blank" rel="noopener noreferrer" class="text-[#1C4587] font-semibold hover:underline">página de editais da SECITECI ↗</a>.
      </p>
    </section>
  `
})
export class EditaisComponent implements OnInit {
  private api = inject(ApiService);
  contato = CONTATO;

  editais = signal<any[]>([]);
  carregando = signal(true);
  erro = signal(false);
  busca = signal('');
  status = signal('');
  categoria = signal('');

  categorias = computed(() => [...new Set(this.editais().map((e) => e.categoria))].sort());
  filtrados = computed(() => {
    const b = this.busca().toLowerCase().trim();
    return this.editais().filter(
      (e) =>
        (!this.status() || e.status === this.status()) &&
        (!this.categoria() || e.categoria === this.categoria()) &&
        (!b || `${e.numero} ${e.titulo} ${e.descricao}`.toLowerCase().includes(b))
    );
  });

  ngOnInit() {
    this.api.listarEditais().subscribe({
      next: (l) => { this.editais.set(l); this.carregando.set(false); },
      error: () => { this.erro.set(true); this.carregando.set(false); }
    });
  }

  st(s: string) { return STATUS_EDITAL[s] ?? STATUS_EDITAL['encerrado']; }
  data(d: string) { return formatarData(d); }
}
