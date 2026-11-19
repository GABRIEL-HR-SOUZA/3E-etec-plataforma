import { Component, OnInit, inject, signal } from '@angular/core';
import { PageHeroComponent } from '../../components/page-hero.component';
import { ApiService } from '../../core/api.service';
import { formatarData } from '../../core/institucional-data';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [PageHeroComponent],
  template: `
    <app-page-hero
      trilha="Agenda"
      eyebrow="CALENDÁRIO"
      titulo="Agenda da ETEC Cuiabá"
      subtitulo="Prazos de inscrição, sorteios, matrículas, início das aulas e eventos da escola."
    />

    <section class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="inline-flex rounded-lg border border-border bg-white p-1 mb-8" role="tablist">
        @for (p of periodos; track p.id) {
          <button type="button" role="tab" [attr.aria-selected]="periodo() === p.id" (click)="trocar(p.id)"
            class="px-4 py-2 rounded-md text-sm font-semibold transition-colors"
            [class]="periodo() === p.id ? 'bg-[#1C4587] text-white' : 'text-muted-foreground hover:text-foreground'">
            {{ p.label }}
          </button>
        }
      </div>

      @if (carregando()) {
        <p class="text-muted-foreground">Carregando agenda…</p>
      } @else if (erro()) {
        <p class="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">Não foi possível carregar a agenda. Tente novamente em instantes.</p>
      } @else {
        <ol class="relative border-l-2 border-border ml-3 space-y-6">
          @for (e of eventos(); track e.id) {
            <li class="pl-6 relative">
              <span class="absolute -left-[9px] top-2 w-4 h-4 rounded-full border-2 border-white"
                [class]="periodo() === 'passados' ? 'bg-muted-foreground/40' : 'bg-[#1E7F4A]'"></span>
              <div class="bg-white border border-border rounded-xl p-5">
                <p class="text-sm font-bold text-[#1C4587]">
                  {{ data(e.dataInicio) }}@if (e.dataFim) { — {{ data(e.dataFim) }} }@if (e.horario) { · {{ e.horario }} }
                </p>
                <h2 class="font-heading font-bold text-lg mt-1 leading-snug">{{ e.titulo }}</h2>
                @if (e.descricao) { <p class="text-sm text-muted-foreground mt-1">{{ e.descricao }}</p> }
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm">
                  @if (e.local) { <span>📍 {{ e.local }}</span> }
                  @if (e.linkUrl) {
                    <a [href]="e.linkUrl" target="_blank" rel="noopener noreferrer" class="font-semibold text-[#1C4587] hover:underline">Mais informações ↗</a>
                  }
                </div>
              </div>
            </li>
          } @empty {
            <li class="pl-6 text-muted-foreground">
              {{ periodo() === 'proximos' ? 'Nenhum evento programado no momento. Acompanhe os editais e o Instagram da escola.' : 'Nenhum evento registrado.' }}
            </li>
          }
        </ol>
      }
    </section>
  `
})
export class AgendaComponent implements OnInit {
  private api = inject(ApiService);
  periodos = [
    { id: 'proximos' as const, label: 'Próximos' },
    { id: 'passados' as const, label: 'Realizados' }
  ];
  periodo = signal<'proximos' | 'passados'>('proximos');
  eventos = signal<any[]>([]);
  carregando = signal(true);
  erro = signal(false);

  ngOnInit() { this.carregar(); }

  trocar(p: 'proximos' | 'passados') {
    this.periodo.set(p);
    this.carregar();
  }

  carregar() {
    this.carregando.set(true);
    this.erro.set(false);
    this.api.listarAgenda(this.periodo()).subscribe({
      next: (l) => { this.eventos.set(l); this.carregando.set(false); },
      error: () => { this.erro.set(true); this.carregando.set(false); }
    });
  }

  data(d: string) { return formatarData(d, { day: '2-digit', month: 'long', year: 'numeric' }); }
}
