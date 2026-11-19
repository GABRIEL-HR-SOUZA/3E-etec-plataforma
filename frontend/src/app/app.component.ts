import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ApiService } from './core/api.service';
import { UnifiedLoginModalComponent } from './components/unified-login-modal.component';
import { CURSOS_TECNICOS } from './core/institucional-data';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, UnifiedLoginModalComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-background">
      <!-- ─── Barra Superior do Governo de Mato Grosso / SECITECI ─── -->
      <div class="bg-[#0f2a52] text-white/80 text-[13px]">
        <div class="max-w-[76rem] mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 h-8">
          <span class="truncate">
            Governo de Mato Grosso <span class="text-white/40 mx-1.5">|</span>
            <span class="hidden sm:inline">Secretaria de Ciência, Tecnologia e Inovação — </span>
            SECITECI
          </span>
          <div class="hidden md:flex items-center gap-5">
            <a href="https://wa.me/5565999711176" target="_blank" rel="noopener noreferrer" class="hover:text-white">
              (65) 9 9971-1176
            </a>
            <a href="mailto:etecuiaba@secitec.mt.gov.br" class="hidden lg:inline hover:text-white">
              etecuiaba&#64;secitec.mt.gov.br
            </a>
            <a
              href="https://instagram.com/eteccuiaba"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-white"
              aria-label="Instagram da ETEC Cuiabá"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
              </svg>
            </a>
          </div>
        </div>
      </div>

      <!-- ─── Barra de Identidade ETEC Cuiabá + Botão Unificado "Acessar" ─── -->
      <div class="bg-white border-b border-border">
        <div class="max-w-[76rem] mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-3 lg:py-4">
          <a
            routerLink="/"
            class="flex items-center gap-4 shrink-0 rounded-sm"
            aria-label="ETEC Cuiabá — Página inicial"
          >
            <img
              src="/etec-logo-h.png"
              alt="ETEC — Escola Técnica Estadual de MT — Cuiabá"
              class="h-11 sm:h-14 w-auto block"
            />
            <span class="hidden xl:block border-l border-border pl-4 text-[13px] leading-snug text-muted-foreground max-w-[260px]">
              Escola Técnica Estadual de Educação Profissional e Tecnológica de Cuiabá
            </span>
          </a>

          <div class="flex items-center gap-2 sm:gap-3">
            <a
              href="https://governo.neead.secitec.mt.gov.br"
              target="_blank"
              rel="noopener noreferrer"
              class="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-[14px] font-medium text-foreground/80 hover:text-[#1C4587]"
            >
              Moodle EAD
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
              </svg>
            </a>

            @if (!auth.logado()) {
              <!-- Botão Unificado "Acessar" (abre o login em todas as páginas) -->
              <button
                type="button"
                (click)="auth.abrirModalLogin()"
                class="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-md text-[14px] font-semibold text-foreground hover:bg-muted hover:border-[#1C4587] transition-colors"
              >
                <svg class="w-4 h-4 text-[#1C4587]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Acessar
              </button>
            } @else {
              <div class="flex items-center gap-2">
                <a
                  [routerLink]="auth.rotaDoPainelAtual()"
                  class="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#1C4587] text-white text-[13.5px] font-semibold hover:bg-[#163a73] transition-colors"
                >
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span class="max-w-[160px] truncate">{{ auth.usuario()?.nome }}</span>
                  <span class="hidden sm:inline text-[11px] px-1.5 py-0.5 rounded bg-white/15 uppercase">
                    {{ auth.usuario()?.perfil }}
                  </span>
                </a>
                <button
                  type="button"
                  (click)="auth.logout()"
                  class="px-3 py-2 border border-input rounded-md text-xs font-semibold text-muted-foreground hover:text-red-700 hover:bg-red-50 transition-colors"
                  title="Encerrar sessão"
                >
                  Sair
                </button>
              </div>
            }

            <!-- Botão Menu Mobile -->
            <button
              type="button"
              (click)="mobileOpen.set(!mobileOpen())"
              class="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 border border-input rounded-md text-sm font-medium text-foreground hover:bg-muted"
              [attr.aria-expanded]="mobileOpen()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                @if (!mobileOpen()) {
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                }
              </svg>
              Menu
            </button>
          </div>
        </div>
      </div>

      <!-- ─── Navegação Principal (Desktop) — idêntica à imagem com "Vagas e Estágios" entre Agenda e Notícias ─── -->
      <header class="hidden lg:block sticky top-0 z-40 bg-[#1C4587] text-white shadow-sm">
        <nav class="max-w-[76rem] mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Navegação principal">
          <div class="flex items-center">
            <a
              routerLink="/"
              routerLinkActive="bg-white/10 after:absolute after:left-3.5 after:right-3.5 after:bottom-0 after:h-[3px] after:bg-white text-white"
              [routerLinkActiveOptions]="{ exact: true }"
              class="relative inline-flex items-center gap-1 h-12 px-3.5 text-[15px] font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors"
            >
              Início
            </a>

            <!-- Dropdown Institucional -->
            <div class="relative" (mouseleave)="dropdownAberto.set(null)">
              <button
                type="button"
                (click)="alternarDropdown('institucional')"
                class="relative inline-flex items-center gap-1 h-12 px-3.5 text-[15px] font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors"
              >
                Institucional
                <svg class="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </button>
              @if (dropdownAberto() === 'institucional') {
                <div class="absolute top-full left-0 min-w-[240px] bg-white text-foreground border border-border shadow-lg rounded-b-md py-1.5 z-50">
                  <a routerLink="/institucional" (click)="dropdownAberto.set(null)" class="block px-4 py-2 text-[14.5px] hover:bg-muted hover:text-[#1C4587]">
                    Sobre a ETEC Cuiabá
                  </a>
                  <a routerLink="/institucional" fragment="equipe" (click)="dropdownAberto.set(null)" class="block px-4 py-2 text-[14.5px] hover:bg-muted hover:text-[#1C4587]">
                    Equipe e gestão
                  </a>
                  <a routerLink="/vagas/empresas" (click)="dropdownAberto.set(null)" class="block px-4 py-2 text-[14.5px] hover:bg-muted hover:text-[#1C4587]">
                    Coordenação de Estágio e parcerias
                  </a>
                  <a routerLink="/contato" (click)="dropdownAberto.set(null)" class="block px-4 py-2 text-[14.5px] hover:bg-muted hover:text-[#1C4587]">
                    Fale conosco
                  </a>
                </div>
              }
            </div>

            <!-- Dropdown Cursos -->
            <div class="relative" (mouseleave)="dropdownAberto.set(null)">
              <button
                type="button"
                (click)="alternarDropdown('cursos')"
                class="relative inline-flex items-center gap-1 h-12 px-3.5 text-[15px] font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cursos
                <svg class="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </button>
              @if (dropdownAberto() === 'cursos') {
                <div class="absolute top-full left-0 w-[340px] bg-white text-foreground border border-border shadow-lg rounded-b-md py-1.5 z-50">
                  @for (c of cursosOficiais; track c.slug) {
                    <a
                      routerLink="/cursos"
                      [fragment]="c.slug"
                      (click)="dropdownAberto.set(null)"
                      class="flex items-center justify-between gap-2 px-4 py-2 text-[14px] hover:bg-muted hover:text-[#1C4587]"
                    >
                      <span>{{ c.nome }}</span>
                      @if (vagasPorSlug()[c.slug]; as n) {
                        <span class="shrink-0 text-xs font-semibold text-[#1E7F4A] bg-emerald-50 px-2 py-0.5 rounded-full">
                          {{ n }} {{ n === 1 ? 'vaga' : 'vagas' }}
                        </span>
                      }
                    </a>
                  }
                  <a
                    routerLink="/cursos"
                    (click)="dropdownAberto.set(null)"
                    class="block px-4 py-2.5 border-t border-border text-sm font-semibold text-[#1C4587] hover:bg-muted"
                  >
                    Todos os cursos e formas de ingresso →
                  </a>
                </div>
              }
            </div>

            @for (l of linksSimples.slice(0, 3); track l.rota) {
              <a
                [routerLink]="l.rota"
                [routerLinkActive]="ativoClasse"
                class="relative inline-flex items-center gap-1 h-12 px-3.5 text-[15px] font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors"
              >
                {{ l.label }}
              </a>
            }

            <!-- Item oficial especificado na arquitetura: "Vagas e Estágios" entre Agenda e Notícias -->
            <a
              routerLink="/vagas"
              routerLinkActive="bg-white/10 after:absolute after:left-3.5 after:right-3.5 after:bottom-0 after:h-[3px] after:bg-white text-white font-semibold"
              class="relative inline-flex items-center gap-1.5 h-12 px-3.5 text-[15px] font-medium text-white/95 hover:text-white hover:bg-white/10 transition-colors"
            >
              Vagas e Estágios
              <span class="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#1E7F4A] text-white rounded">
                Portal
              </span>
            </a>

            <a
              routerLink="/noticias"
              [routerLinkActive]="ativoClasse"
              class="relative inline-flex items-center gap-1 h-12 px-3.5 text-[15px] font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors"
            >
              Notícias
            </a>
          </div>

          <!-- Atalhos rápidos do Portal de Vagas na direita da barra azul -->
          <div class="flex items-center gap-2">
            <a
              routerLink="/vagas/empresas"
              routerLinkActive="bg-white/15"
              class="text-xs font-semibold text-white/90 hover:text-white px-3 py-1.5 rounded hover:bg-white/10 transition-colors"
            >
              Para Empresas
            </a>
            @if (auth.logado()) {
              <a
                [routerLink]="auth.rotaDoPainelAtual()"
                class="text-xs font-semibold bg-white text-[#1C4587] px-3 py-1.5 rounded hover:bg-white/90 transition-colors"
              >
                Meu Painel →
              </a>
            }
          </div>
        </nav>
      </header>

      <!-- ─── Menu Mobile Responsivo ─── -->
      @if (mobileOpen()) {
        <div class="lg:hidden fixed inset-0 z-50 bg-white overflow-y-auto p-4">
          <div class="flex items-center justify-between pb-3 border-b border-border">
            <img src="/etec-logo-h.png" alt="ETEC Cuiabá" class="h-10 w-auto" />
            <button
              type="button"
              (click)="mobileOpen.set(false)"
              class="px-3 py-1.5 border border-input rounded-md text-sm font-medium"
            >
              Fechar ✕
            </button>
          </div>
          <nav class="mt-4 space-y-1">
            <a routerLink="/" (click)="mobileOpen.set(false)" class="block px-3 py-2.5 rounded-md font-medium hover:bg-muted">
              Início
            </a>
            @for (l of linksSimples; track l.rota) {
              <a [routerLink]="l.rota" (click)="mobileOpen.set(false)" class="block px-3 py-2.5 rounded-md font-medium hover:bg-muted">
                {{ l.label }}
              </a>
            }
            <a routerLink="/vagas" (click)="mobileOpen.set(false)" class="block px-3 py-2.5 rounded-md font-semibold text-[#1C4587] bg-[#1C4587]/5">
              Vagas e Estágios (Mural Moderado)
            </a>
            <a routerLink="/vagas/empresas" (click)="mobileOpen.set(false)" class="block px-3 py-2.5 rounded-md font-medium hover:bg-muted">
              Para Empresas — Como anunciar
            </a>
            <a routerLink="/vagas/cadastro-empresa" (click)="mobileOpen.set(false)" class="block px-3 py-2.5 rounded-md font-medium hover:bg-muted">
              Cadastrar minha empresa
            </a>
            <a routerLink="/painel/aluno" (click)="mobileOpen.set(false)" class="block px-3 py-2.5 rounded-md font-medium hover:bg-muted">
              Painel do Aluno / Egresso
            </a>
            <a routerLink="/painel/empresa" (click)="mobileOpen.set(false)" class="block px-3 py-2.5 rounded-md font-medium hover:bg-muted">
              Painel da Empresa
            </a>
            <a routerLink="/painel/etec" (click)="mobileOpen.set(false)" class="block px-3 py-2.5 rounded-md font-medium hover:bg-muted">
              Painel da ETEC (Coordenação / TI)
            </a>
          </nav>
          <div class="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-3">
            <a href="https://governo.neead.secitec.mt.gov.br" target="_blank" class="btn-outline text-sm">
              Moodle EAD
            </a>
            <button type="button" (click)="mobileOpen.set(false); auth.abrirModalLogin()" class="btn-primary text-sm">
              Acessar Painel
            </button>
          </div>
        </div>
      }

      <!-- ─── Conteúdo Principal das Rotas ─── -->
      <main id="conteudo-principal" class="flex-1">
        <router-outlet></router-outlet>
      </main>

      <!-- ─── Modal Unificado "Acessar o painel" ─── -->
      <app-unified-login-modal></app-unified-login-modal>

      <!-- ─── Rodapé Institucional ETEC Cuiabá / SECITECI-MT ─── -->
      <footer class="bg-[#0f2a52] text-white/75 text-[15px]">
        <div class="max-w-[76rem] mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] gap-10">
          <div>
            <p class="font-heading font-bold text-xl text-white leading-snug">ETEC Cuiabá</p>
            <p class="mt-2 leading-relaxed max-w-xs text-sm">
              Escola Técnica Estadual de Educação Profissional e Tecnológica de Cuiabá, vinculada à
              SECITECI — Governo de Mato Grosso.
            </p>
            <div class="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 space-y-1">
              <p class="font-semibold text-white">Conformidade LGPD &amp; Lei do Estágio</p>
              <p>Lei Federal nº 11.788/2008 e Lei nº 13.709/2018.</p>
              <p>Encarregado (DPO) SECITECI/ETEC: <span class="text-white">dpo&#64;secitec.mt.gov.br</span></p>
            </div>
          </div>

          <div>
            <h2 class="text-white font-sans font-semibold text-[15px] mb-3">Portal de Vagas e Estágios</h2>
            <ul class="space-y-2 text-sm">
              <li><a routerLink="/vagas" class="hover:text-white hover:underline">Mural de Vagas Abertas</a></li>
              <li><a routerLink="/vagas/empresas" class="hover:text-white hover:underline">Para Empresas Parceiras</a></li>
              <li><a routerLink="/vagas/cadastro-empresa" class="hover:text-white hover:underline">Cadastrar Empresa</a></li>
              <li><button type="button" (click)="auth.abrirModalLogin()" class="hover:text-white hover:underline">Acessar Painel (Aluno / Empresa)</button></li>
              <li><a href="http://localhost:8080/q/swagger-ui" target="_blank" class="hover:text-white hover:underline">Contrato OpenAPI (Swagger UI) ↗</a></li>
            </ul>
          </div>

          <div>
            <h2 class="text-white font-sans font-semibold text-[15px] mb-3">A Escola</h2>
            <ul class="space-y-2 text-sm">
              <li><a routerLink="/institucional" class="hover:text-white hover:underline">Sobre a ETEC Cuiabá</a></li>
              <li><a routerLink="/cursos" class="hover:text-white hover:underline">Cursos técnicos</a></li>
              <li><a routerLink="/editais" class="hover:text-white hover:underline">Editais</a></li>
              <li><a routerLink="/agenda" class="hover:text-white hover:underline">Agenda</a></li>
              <li><a routerLink="/noticias" class="hover:text-white hover:underline">Notícias</a></li>
              <li><a routerLink="/mulheres-mil" class="hover:text-white hover:underline">Programa Mulheres Mil</a></li>
              <li>
                <a href="https://governo.neead.secitec.mt.gov.br" target="_blank" rel="noopener noreferrer" class="hover:text-white hover:underline">
                  Moodle EAD ↗
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 class="text-white font-sans font-semibold text-[15px] mb-3">Atendimento ETEC Cuiabá</h2>
            <ul class="space-y-2.5 text-sm">
              <li>
                Av. Gonçalo Antunes de Barros, S/N<br />
                Novo Mato Grosso — Cuiabá/MT · CEP 78058-743
              </li>
              <li>
                <a href="tel:+556536133900" class="hover:text-white">(65) 3613-3900</a>
              </li>
              <li>
                <a href="https://wa.me/5565999711176" target="_blank" rel="noopener noreferrer" class="hover:text-white">
                  (65) 9 9971-1176 (WhatsApp)
                </a>
              </li>
              <li>
                <a href="mailto:etecuiaba@secitec.mt.gov.br" class="hover:text-white break-all">
                  etecuiaba&#64;secitec.mt.gov.br
                </a>
              </li>
            </ul>
            <a routerLink="/contato" class="inline-block mt-4 text-sm font-semibold text-white hover:underline">Enviar mensagem →</a>
          </div>
        </div>

        <div class="border-t border-white/10">
          <div class="max-w-[76rem] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px] text-white/50">
            <p>© 2026 ETEC Cuiabá · SECITECI · Governo de Mato Grosso — Portal de Vagas e Estágios Moderado</p>
            <div class="flex gap-5">
              <a routerLink="/vagas/empresas" class="hover:text-white">Lei do Estágio (11.788/2008)</a>
              <a routerLink="/painel/aluno" class="hover:text-white">Política de Privacidade (LGPD)</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `
})
export class AppComponent implements OnInit {
  auth = inject(AuthService);
  api = inject(ApiService);
  router = inject(Router);

  mobileOpen = signal(false);
  dropdownAberto = signal<string | null>(null);
  cursosOficiais = CURSOS_TECNICOS;
  /** slug do curso → nº de vagas abertas no Portal de Vagas */
  vagasPorSlug = signal<Record<string, number>>({});

  readonly ativoClasse = 'bg-white/10 after:absolute after:left-3.5 after:right-3.5 after:bottom-0 after:h-[3px] after:bg-white text-white';
  readonly linksSimples = [
    { rota: '/mulheres-mil', label: 'Mulheres Mil' },
    { rota: '/editais', label: 'Editais' },
    { rota: '/agenda', label: 'Agenda' },
    { rota: '/noticias', label: 'Notícias' },
    { rota: '/cursos', label: 'Cursos técnicos' },
    { rota: '/institucional', label: 'Sobre a ETEC Cuiabá' },
    { rota: '/contato', label: 'Fale conosco' }
  ];

  ngOnInit() {
    this.api.listarCursos().subscribe({
      next: (lista) => {
        const m: Record<string, number> = {};
        lista.forEach((c) => { if (c.vagasAbertas > 0) m[c.slug] = c.vagasAbertas; });
        this.vagasPorSlug.set(m);
      },
      error: () => {}
    });
  }

  alternarDropdown(nome: string) {
    this.dropdownAberto.set(this.dropdownAberto() === nome ? null : nome);
  }
}
