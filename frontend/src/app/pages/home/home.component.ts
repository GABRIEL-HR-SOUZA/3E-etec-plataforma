import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { STATUS_EDITAL, formatarData } from '../../core/institucional-data';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div>
      <!-- ─── HERO INSTITUCIONAL (Idêntico à imagem enviada, usando hero-etec.jpg) ─── -->
      <section class="relative text-white overflow-hidden" aria-label="Apresentação da ETEC Cuiabá">
        <img
          src="/hero-etec.jpg"
          alt="Fachada da Escola Técnica Estadual de Cuiabá"
          class="absolute inset-0 w-full h-full object-cover"
        />
        <div
          class="absolute inset-0 bg-[#0f2a52]/85 md:bg-transparent md:bg-[linear-gradient(90deg,rgba(15,42,82,.94)_0%,rgba(15,42,82,.86)_48%,rgba(15,42,82,.38)_100%)]"
          aria-hidden="true"
        ></div>

        <div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
          <p class="text-[15px] font-semibold text-white/80 mb-4">
            Escola Técnica Estadual · Cuiabá/MT
          </p>
          <h1 class="font-heading font-bold text-[2.25rem] sm:text-5xl lg:text-[3.5rem] leading-[1.1] max-w-2xl">
            Educação profissional pública e gratuita
          </h1>
          <p class="mt-5 text-lg text-white/85 max-w-xl leading-relaxed">
            Cursos técnicos gratuitos em Tecnologia da Informação, Enfermagem, Segurança do Trabalho,
            Agronegócio e Agricultura, com formação voltada para o mundo do trabalho.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <a
              routerLink="/cursos"
              class="btn bg-white text-[#1C4587] hover:bg-white/90 shadow-sm"
            >
              Conheça os cursos
            </a>
            <a
              routerLink="/editais"
              class="btn border border-white/60 text-white hover:bg-white/10"
            >
              Editais e processos seletivos
            </a>
            <a
              routerLink="/vagas/empresas"
              class="btn bg-[#1E7F4A] text-white hover:bg-[#17643a]"
            >
              Sou empresa: anunciar vaga
            </a>
          </div>
        </div>
      </section>

      <!-- ─── FAIXA DE ATALHOS (5 cards conforme arquitetura: quinto card "Vagas e Estágios") ─── -->
      <nav aria-label="Acesso rápido" class="bg-white border-b border-border shadow-sm">
        <ul class="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border lg:border-x border-border">
          <li>
            <a routerLink="/cursos" class="group flex items-start gap-3 h-full px-5 py-5 hover:bg-muted transition-colors">
              <svg class="w-5 h-5 text-[#1C4587] shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
              <span>
                <span class="block font-semibold text-foreground group-hover:text-[#1C4587] group-hover:underline">
                  Cursos técnicos
                </span>
                <span class="block text-sm text-muted-foreground mt-0.5">Eixos, duração e forma de ingresso</span>
              </span>
            </a>
          </li>

          <li>
            <a routerLink="/editais" class="group flex items-start gap-3 h-full px-5 py-5 hover:bg-muted transition-colors">
              <svg class="w-5 h-5 text-[#1C4587] shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path>
              </svg>
              <span>
                <span class="block font-semibold text-foreground group-hover:text-[#1C4587] group-hover:underline">
                  Editais
                </span>
                <span class="block text-sm text-muted-foreground mt-0.5">Processos seletivos e resultados</span>
              </span>
            </a>
          </li>

          <!-- 5º CARD DA FAIXA DE ATALHOS: Vagas e Estágios -->
          <li class="bg-[#1C4587]/[0.03]">
            <a routerLink="/vagas" class="group flex items-start gap-3 h-full px-5 py-5 hover:bg-[#1C4587]/10 transition-colors">
              <svg class="w-5 h-5 text-[#1E7F4A] shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <rect width="20" height="14" x="2" y="7" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              <span>
                <span class="flex items-center gap-1.5 font-semibold text-[#1C4587] group-hover:underline">
                  Vagas e Estágios
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-[#1E7F4A] text-white font-bold">NOVO</span>
                </span>
                <span class="block text-sm text-muted-foreground mt-0.5">Estágio, emprego e jovem aprendiz</span>
              </span>
            </a>
          </li>

          <li>
            <a href="https://governo.neead.secitec.mt.gov.br" target="_blank" rel="noopener noreferrer" class="group flex items-start gap-3 h-full px-5 py-5 hover:bg-muted transition-colors">
              <svg class="w-5 h-5 text-[#1C4587] shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
              </svg>
              <span>
                <span class="block font-semibold text-foreground group-hover:text-[#1C4587] group-hover:underline">
                  Moodle EAD
                </span>
                <span class="block text-sm text-muted-foreground mt-0.5">Ambiente virtual de aprendizagem</span>
              </span>
            </a>
          </li>

          <li>
            <a routerLink="/contato" class="group flex items-start gap-3 h-full px-5 py-5 hover:bg-muted transition-colors">
              <svg class="w-5 h-5 text-[#1C4587] shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>
                <span class="block font-semibold text-foreground group-hover:text-[#1C4587] group-hover:underline">
                  Fale conosco
                </span>
                <span class="block text-sm text-muted-foreground mt-0.5">Endereço, WhatsApp e e-mail</span>
              </span>
            </a>
          </li>
        </ul>
      </nav>

      <!-- ─── BLOCO "VAGAS RECENTES" NA HOME (Especificado na Arquitetura) ─── -->
      <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14" aria-labelledby="vagas-recentes-titulo">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span class="eyebrow">MURAL MODERADO PELA COORDENAÇÃO DE ESTÁGIO</span>
            <h2 id="vagas-recentes-titulo" class="section-title">
              Vagas e estágios recentes
            </h2>
            <p class="text-sm text-muted-foreground mt-1">
              Oportunidades homologadas pela ETEC Cuiabá e vinculadas aos cursos técnicos para alunos e egressos.
            </p>
          </div>
          <div class="flex items-center gap-4">
            <a routerLink="/vagas/empresas" class="text-sm font-semibold text-muted-foreground hover:text-[#1C4587]">
              Para empresas →
            </a>
            <a routerLink="/vagas" class="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1C4587] hover:underline">
              Ver todas as vagas ({{ resumo()?.vagasAbertas ?? vagasRecentes().length }}) →
            </a>
          </div>
        </div>

        <!-- Filtros rápidos por curso com contador -->
        <div class="flex flex-wrap gap-2 mb-6">
          @for (c of cursos(); track c.id) {
            <a
              [routerLink]="['/vagas']"
              [queryParams]="{ cursoId: c.id }"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-white hover:border-[#1C4587] hover:bg-[#1C4587]/5 text-xs font-medium transition-colors"
            >
              <span>{{ c.nome }}</span>
              <span class="px-1.5 py-0.5 rounded-full bg-muted text-foreground font-bold">{{ c.vagasAbertas }}</span>
            </a>
          }
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          @for (v of vagasRecentes().slice(0, 6); track v.id) {
            <article class="bg-white border border-border rounded-lg p-5 hover:border-[#1C4587] hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span class="badge bg-[#1C4587]/10 text-[#1C4587]">
                    {{ v.tipo }}
                  </span>
                  <div class="flex items-center gap-1.5">
                    @if (v.nova) {
                      <span class="badge bg-emerald-100 text-emerald-800">Nova</span>
                    }
                    @if (v.diasRestantes <= 7) {
                      <span class="badge bg-amber-100 text-amber-800">Encerra em {{ v.diasRestantes }} dias</span>
                    }
                  </div>
                </div>

                <h3 class="font-heading font-bold text-lg text-foreground leading-snug hover:text-[#1C4587]">
                  <a [routerLink]="['/vagas', v.id]">{{ v.titulo }}</a>
                </h3>

                <p class="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-[#2E6DA4] shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span class="truncate">{{ v.empresaNome }}</span>
                </p>

                <!-- Cursos vinculados -->
                <div class="mt-3 flex flex-wrap gap-1.5">
                  @for (c of v.cursos; track c.id) {
                    <span class="text-xs px-2 py-0.5 rounded bg-muted text-foreground font-medium">
                      {{ c.nome }} (Mód. mín. {{ c.moduloMinimo }}º)
                    </span>
                  }
                </div>
              </div>

              <div class="mt-5 pt-3.5 border-t border-border flex items-center justify-between text-sm">
                <div>
                  <span class="text-xs text-muted-foreground block">Bolsa / Salário</span>
                  <span class="font-bold text-[#1E7F4A]">{{ v.bolsa }}</span>
                </div>
                <div class="text-right">
                  <span class="text-xs text-muted-foreground block">{{ v.turno }} · {{ v.modalidade }}</span>
                  <a [routerLink]="['/vagas', v.id]" class="text-xs font-semibold text-[#1C4587] hover:underline">
                    Ver detalhes →
                  </a>
                </div>
              </div>
            </article>
          }
        </div>
      </section>

      <!-- ─── EDITAIS (dados ao vivo da API institucional) ─── -->
      <section id="editais" class="bg-muted/60 border-t border-border py-14">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span class="eyebrow">PROCESSOS SELETIVOS</span>
              <h2 class="section-title">Editais</h2>
              <p class="text-sm text-muted-foreground mt-1">
                Seleção de alunos, professores e técnicos. As vagas de trabalho ficam em Vagas e Estágios.
              </p>
            </div>
            <a routerLink="/editais" class="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1C4587] hover:underline">
              Ver todos os editais →
            </a>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            @for (e of editais(); track e.id) {
              <div class="bg-white border border-border rounded-lg p-5 flex flex-col">
                <span class="mb-2" [class]="'badge self-start mb-2 ' + statusEdital(e.status).classe">{{ statusEdital(e.status).label }}</span>
                <h3 class="font-heading font-bold text-base text-foreground">
                  Edital nº {{ e.numero }} — {{ e.titulo }}
                </h3>
                <p class="text-sm text-muted-foreground mt-2 line-clamp-3">{{ e.descricao }}</p>
                <div class="mt-auto pt-4 flex items-center justify-between gap-2 text-xs">
                  <span class="font-semibold text-[#1C4587]">
                    @if (e.inscricaoFim) { Inscrições até {{ data(e.inscricaoFim) }} } @else { {{ e.orgao }} }
                  </span>
                  @if (e.documentoUrl) {
                    <a [href]="e.documentoUrl" target="_blank" rel="noopener noreferrer" class="font-semibold text-[#1E7F4A] hover:underline">Abrir ↗</a>
                  }
                </div>
              </div>
            } @empty {
              <p class="text-sm text-muted-foreground md:col-span-3">Nenhum edital publicado no momento.</p>
            }
          </div>
        </div>
      </section>

      <!-- ─── NOTÍCIAS + AGENDA ─── -->
      <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div class="lg:col-span-2">
          <div class="flex items-end justify-between gap-4 mb-6">
            <div>
              <span class="eyebrow">COMUNICAÇÃO</span>
              <h2 class="section-title">Notícias</h2>
            </div>
            <a routerLink="/noticias" class="text-[15px] font-semibold text-[#1C4587] hover:underline">Todas as notícias →</a>
          </div>
          <div class="space-y-4">
            @for (n of noticias(); track n.id) {
              <article class="bg-white border border-border rounded-lg p-5 hover:border-[#1C4587] transition-colors">
                <p class="text-xs text-muted-foreground">
                  <span class="font-semibold text-[#2E6DA4]">{{ n.categoria }}</span>
                  @if (n.dataPublicacao) { · {{ data(n.dataPublicacao) }} }
                </p>
                <h3 class="font-heading font-bold text-lg leading-snug mt-1">
                  <a [routerLink]="['/noticias', n.slug]" class="hover:text-[#1C4587] hover:underline">{{ n.titulo }}</a>
                </h3>
                <p class="text-sm text-muted-foreground mt-1">{{ n.resumo }}</p>
              </article>
            } @empty {
              <p class="text-sm text-muted-foreground">Nenhuma notícia publicada.</p>
            }
          </div>
        </div>

        <aside>
          <div class="flex items-end justify-between gap-4 mb-6">
            <div>
              <span class="eyebrow">CALENDÁRIO</span>
              <h2 class="section-title">Agenda</h2>
            </div>
            <a routerLink="/agenda" class="text-[15px] font-semibold text-[#1C4587] hover:underline">Ver agenda →</a>
          </div>
          <ul class="space-y-3">
            @for (ev of agenda(); track ev.id) {
              <li class="flex gap-3 bg-white border border-border rounded-lg p-4">
                <div class="w-14 shrink-0 text-center rounded-md bg-[#1C4587] text-white py-1.5">
                  <span class="block text-xl font-bold leading-none">{{ dia(ev.dataInicio) }}</span>
                  <span class="block text-[11px] uppercase mt-0.5">{{ mes(ev.dataInicio) }}</span>
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-sm leading-snug">{{ ev.titulo }}</p>
                  @if (ev.dataFim) { <p class="text-xs text-muted-foreground mt-0.5">até {{ data(ev.dataFim) }}</p> }
                  @if (ev.local) { <p class="text-xs text-muted-foreground">{{ ev.local }}</p> }
                </div>
              </li>
            } @empty {
              <li class="text-sm text-muted-foreground">Nenhum evento programado.</li>
            }
          </ul>
          <a routerLink="/mulheres-mil" class="mt-6 block rounded-lg p-5 bg-purple-50 border border-purple-200 hover:border-[#5C2D91] transition-colors">
            <span class="text-xs font-bold uppercase tracking-wider text-[#5C2D91]">Programa Mulheres Mil</span>
            <span class="block font-heading font-bold text-lg mt-1">Cuidadora de Idosos — 160 h, gratuito e com auxílio financeiro</span>
            <span class="block text-sm font-semibold text-[#5C2D91] mt-2">Saiba como participar →</span>
          </a>
        </aside>
      </section>
    </div>
  `
})
export class HomeComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);

  vagasRecentes = signal<any[]>([]);
  cursos = signal<any[]>([]);
  editais = signal<any[]>([]);
  noticias = signal<any[]>([]);
  agenda = signal<any[]>([]);
  resumo = signal<any>(null);

  statusEdital(s: string) { return STATUS_EDITAL[s] ?? STATUS_EDITAL['encerrado']; }
  data(d: string) { return formatarData(d); }
  dia(d: string) { return d.slice(8, 10); }
  mes(d: string) { return formatarData(d, { month: 'short' }).replace('.', ''); }

  ngOnInit() {
    this.api.listarVagas().subscribe({
      next: (v) => this.vagasRecentes.set(v),
      error: () => {}
    });
    this.api.listarCursos().subscribe({
      next: (c) => this.cursos.set(c),
      error: () => {}
    });
    this.api.listarEditais({ limite: 3 }).subscribe({ next: (l) => this.editais.set(l), error: () => {} });
    this.api.listarNoticias({ limite: 3 }).subscribe({ next: (l) => this.noticias.set(l), error: () => {} });
    this.api.listarAgenda('proximos').subscribe({ next: (l) => this.agenda.set(l.slice(0, 4)), error: () => {} });
    this.api.resumoInstitucional().subscribe({ next: (r) => this.resumo.set(r), error: () => {} });
  }
}
