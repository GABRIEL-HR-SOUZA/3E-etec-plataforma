import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../components/page-hero.component';
import { CONTATO, MULHERES_MIL } from '../../core/institucional-data';

@Component({
  selector: 'app-mulheres-mil',
  standalone: true,
  imports: [RouterLink, PageHeroComponent],
  template: `
    <app-page-hero
      trilha="Mulheres Mil"
      eyebrow="QUALIFICAÇÃO PROFISSIONAL"
      titulo="Programa Mulheres Mil"
      [subtitulo]="'Formação profissional gratuita, com auxílio financeiro, para ' + mm.publico.toLowerCase()"
    >
      <div class="mt-6 flex flex-wrap gap-3">
        <a [href]="contato.whatsappLink" target="_blank" rel="noopener noreferrer" class="btn bg-[#1E7F4A] text-white hover:bg-[#17643a]">
          Quero participar — WhatsApp
        </a>
        <a routerLink="/editais" class="btn border border-white/60 text-white hover:bg-white/10">Ver editais</a>
      </div>
    </app-page-hero>

    <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2">
        <span class="eyebrow">CURSO OFERTADO</span>
        <h2 class="section-title">{{ mm.curso }}</h2>
        <dl class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          @for (i of itens; track i.label) {
            <div class="bg-white border border-border rounded-lg p-4">
              <dt class="text-sm text-muted-foreground">{{ i.label }}</dt>
              <dd class="font-semibold mt-0.5">{{ i.valor }}</dd>
            </div>
          }
        </dl>
      </div>

      <aside class="space-y-4">
        <div class="bg-purple-50 border border-purple-200 rounded-xl p-5">
          <h2 class="font-heading font-bold text-lg text-[#5C2D91]">Quem pode participar</h2>
          <ul class="mt-2 space-y-1.5 text-sm">
            @for (r of mm.requisitos; track r) { <li>✓ {{ r }}</li> }
          </ul>
          <p class="text-sm text-muted-foreground mt-3">Público prioritário: {{ mm.publico.toLowerCase() }}</p>
        </div>
        <div class="bg-white border border-border rounded-xl p-5 text-sm">
          <h2 class="font-heading font-bold text-lg">Local das aulas</h2>
          <p class="mt-2">ETEC Cuiabá — {{ contato.endereco }}, {{ contato.cidade }}</p>
          <p class="text-muted-foreground mt-1">{{ contato.referencia }}</p>
        </div>
        <p class="text-xs text-muted-foreground">
          Fonte: <a [href]="mm.fonte" target="_blank" rel="noopener noreferrer" class="underline">página do programa no site da ETEC Cuiabá</a>.
          Novas turmas são abertas por edital.
        </p>
      </aside>
    </section>
  `
})
export class MulheresMilComponent {
  contato = CONTATO;
  mm = MULHERES_MIL;
  itens = [
    { label: 'Carga horária', valor: MULHERES_MIL.cargaHoraria },
    { label: 'Duração', valor: MULHERES_MIL.duracao },
    { label: 'Modalidade', valor: MULHERES_MIL.modalidade },
    { label: 'Horário', valor: MULHERES_MIL.horario },
    { label: 'Valor', valor: MULHERES_MIL.valor },
    { label: 'Auxílio financeiro', valor: MULHERES_MIL.auxilio },
    { label: 'Transporte', valor: MULHERES_MIL.transporte }
  ];
}
