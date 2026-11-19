import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../components/page-hero.component';
import { CONTATO, CURSOS_TECNICOS, EQUIPE, HISTORIA } from '../../core/institucional-data';

@Component({
  selector: 'app-sobre',
  standalone: true,
  imports: [RouterLink, PageHeroComponent],
  template: `
    <app-page-hero
      trilha="Institucional"
      eyebrow="QUEM SOMOS"
      titulo="Sobre a ETEC Cuiabá"
      subtitulo="Escola Técnica Estadual de Educação Profissional e Tecnológica de Cuiabá, unidade da rede estadual mantida pela SECITECI — Governo de Mato Grosso."
    />

    <!-- Números e marcos -->
    <section class="bg-white border-b border-border">
      <dl class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <dt class="text-sm text-muted-foreground">Criação</dt>
          <dd class="font-heading font-bold text-2xl text-[#1C4587]">2009</dd>
          <dd class="text-xs text-muted-foreground">LC nº 374/2009</dd>
        </div>
        <div>
          <dt class="text-sm text-muted-foreground">Inauguração</dt>
          <dd class="font-heading font-bold text-2xl text-[#1C4587]">2022</dd>
          <dd class="text-xs text-muted-foreground">29 de março de 2022</dd>
        </div>
        <div>
          <dt class="text-sm text-muted-foreground">Cursos técnicos</dt>
          <dd class="font-heading font-bold text-2xl text-[#1C4587]">{{ totalCursos }}</dd>
          <dd class="text-xs text-muted-foreground">Na sede e fora de sede</dd>
        </div>
        <div>
          <dt class="text-sm text-muted-foreground">Ensino</dt>
          <dd class="font-heading font-bold text-2xl text-[#1E7F4A]">100% gratuito</dd>
          <dd class="text-xs text-muted-foreground">Rede pública estadual</dd>
        </div>
      </dl>
    </section>

    <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div class="lg:col-span-2 space-y-5 text-[16px] leading-relaxed text-foreground/90">
        <span class="eyebrow">HISTÓRIA</span>
        <h2 class="section-title">Educação profissional pública na capital</h2>
        <p>
          A ETEC Cuiabá foi criada pela <strong>{{ historia.leiCriacao }}</strong> e inaugurada em
          <strong>{{ historia.inauguracao }}</strong>. É vocacionada para cursos na área de
          <strong>{{ historia.vocacao }}</strong> e também oferta cursos dos eixos de saúde, segurança e recursos naturais.
        </p>
        <p>
          Além dos cursos técnicos, a unidade oferece cursos de Formação Inicial e Continuada (FIC), aperfeiçoamento,
          atualização e cursos livres, organizados conforme as demandas da comunidade. O corpo docente é formado por
          especialistas, mestres e doutores.
        </p>

        <h3 class="font-heading font-bold text-xl pt-4">Formas de oferta</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          @for (m of historia.modalidades; track m.nome) {
            <div class="bg-white border border-border rounded-lg p-4">
              <p class="font-semibold text-[#1C4587]">{{ m.nome }}</p>
              <p class="text-sm text-muted-foreground mt-1">{{ m.descricao }}</p>
            </div>
          }
        </div>

        <h3 class="font-heading font-bold text-xl pt-4">Eixos tecnológicos</h3>
        <div class="flex flex-wrap gap-2">
          @for (e of historia.eixos; track e) {
            <span class="badge bg-[#1C4587]/10 text-[#1C4587] text-sm py-1">{{ e }}</span>
          }
        </div>
      </div>

      <aside class="space-y-4">
        <div class="bg-white border border-border rounded-xl p-5">
          <h2 class="font-heading font-bold text-lg">Onde estamos</h2>
          <p class="text-sm mt-2">{{ contato.endereco }}<br />{{ contato.cidade }} · CEP {{ contato.cep }}</p>
          <p class="text-xs text-muted-foreground mt-1">{{ contato.referencia }}</p>
          <a [href]="contato.mapaLink" target="_blank" rel="noopener noreferrer" class="inline-block mt-3 text-sm font-semibold text-[#1C4587] hover:underline">
            Abrir no Google Maps ↗
          </a>
        </div>
        <div class="bg-white border border-border rounded-xl p-5">
          <h2 class="font-heading font-bold text-lg">Mantenedora</h2>
          <p class="text-sm mt-2 text-muted-foreground">{{ contato.secretaria }}</p>
        </div>
        <a routerLink="/contato" class="btn-primary w-full">Fale com a escola</a>
      </aside>
    </section>

    <!-- Equipe -->
    <section id="equipe" class="bg-muted/60 border-t border-border py-14 scroll-mt-16">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <span class="eyebrow">EQUIPE DA ESCOLA</span>
        <h2 class="section-title mb-8">Gestão e servidores</h2>

        @for (g of grupos(); track g.nome) {
          <h3 class="font-semibold text-foreground mb-3 mt-6 first:mt-0">{{ g.nome }}</h3>
          <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (p of g.membros; track p.email) {
              <li class="bg-white border border-border rounded-lg p-4 flex gap-3 items-start">
                <span class="w-10 h-10 shrink-0 rounded-full bg-[#1C4587] text-white text-sm font-bold inline-flex items-center justify-center" aria-hidden="true">
                  {{ iniciais(p.nome) }}
                </span>
                <div class="min-w-0">
                  <p class="font-semibold leading-snug">{{ p.nome }}</p>
                  <p class="text-sm text-muted-foreground">{{ p.cargo }}</p>
                  <a [href]="'mailto:' + p.email" class="text-xs text-[#1C4587] hover:underline break-all">{{ p.email }}</a>
                </div>
              </li>
            }
          </ul>
        }
        <p class="text-xs text-muted-foreground mt-6">
          Fonte: página “Equipe da Escola Técnica” do
          <a [href]="contato.siteOficial" target="_blank" rel="noopener noreferrer" class="underline">site oficial da ETEC Cuiabá</a>.
        </p>
      </div>
    </section>
  `
})
export class SobreComponent {
  contato = CONTATO;
  historia = HISTORIA;
  totalCursos = CURSOS_TECNICOS.length;
  grupos = computed(() =>
    (['Gestão', 'Apoio pedagógico e administrativo'] as const).map((nome) => ({ nome, membros: EQUIPE.filter((e) => e.grupo === nome) }))
  );

  iniciais(nome: string): string {
    const p = nome.split(' ').filter((x) => x.length > 2);
    return (p[0][0] + (p[p.length - 1]?.[0] ?? '')).toUpperCase();
  }
}
