import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-vagas-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="bg-muted/40 min-h-screen pb-16">
      <!-- Cabeçalho institucional da página /vagas -->
      <section class="bg-[#0f2a52] text-white py-10 border-b border-white/10">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span class="text-xs font-semibold uppercase tracking-widest text-emerald-400 block mb-1.5">
              PORTAL DE VAGAS E ESTÁGIOS · ETEC CUIABÁ
            </span>
            <h1 class="font-heading font-bold text-3xl sm:text-4xl">
              Mural de Vagas Homologadas
            </h1>
            <p class="text-white/80 text-sm sm:text-base mt-2 max-w-2xl">
              Todas as empresas e vagas publicadas aqui passaram pela aprovação da Coordenação de Estágio da ETEC Cuiabá e têm relação direta com os cursos técnicos.
            </p>
          </div>
          <div class="flex flex-wrap gap-2.5 shrink-0">
            <a routerLink="/vagas/empresas" class="btn bg-white/10 border border-white/30 text-white hover:bg-white/20 text-sm">
              Sou empresa: como anunciar
            </a>
            @if (!auth.logado()) {
              <button type="button" (click)="auth.abrirModalLogin()" class="btn bg-[#1E7F4A] text-white hover:bg-[#17643a] text-sm">
                Acessar meu painel
              </button>
            } @else {
              <a [routerLink]="auth.rotaDoPainelAtual()" class="btn bg-[#1E7F4A] text-white hover:bg-[#17643a] text-sm">
                Ir para meu painel →
              </a>
            }
          </div>
        </div>
      </section>

      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <!-- Contador de vagas por curso técnico (clicável) -->
        <div class="bg-white border border-border rounded-lg p-4 mb-6 shadow-sm">
          <div class="flex items-center justify-between mb-2.5">
            <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Contador de vagas abertas por curso técnico
            </span>
            @if (PossuiFiltrosAtivos()) {
              <button type="button" (click)="limparFiltros()" class="text-xs font-semibold text-[#1C4587] hover:underline">
                Limpar todos os filtros
              </button>
            }
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              (click)="selecionarCurso(0)"
              class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
              [ngClass]="filtroCursoId === 0 ? 'bg-[#1C4587] text-white border-[#1C4587]' : 'bg-muted/60 text-foreground border-border hover:border-[#1C4587]'"
            >
              Todos os cursos
            </button>
            @for (c of cursos(); track c.id) {
              <button
                type="button"
                (click)="selecionarCurso(c.id)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                [ngClass]="filtroCursoId === c.id ? 'bg-[#1C4587] text-white border-[#1C4587]' : 'bg-white text-foreground border-border hover:border-[#1C4587]'"
              >
                <span>{{ c.nome }}</span>
                <span class="px-1.5 py-0.2 rounded-full text-[11px] font-bold"
                      [ngClass]="filtroCursoId === c.id ? 'bg-white/20 text-white' : 'bg-emerald-50 text-[#1E7F4A]'">
                  {{ c.vagasAbertas }}
                </span>
              </button>
            }
          </div>
        </div>

        <!-- Barra de Busca e Filtros Combináveis (curso/eixo, tipo, turno, modalidade, cidade) -->
        <div class="bg-white border border-border rounded-lg p-5 mb-8 shadow-sm">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-muted-foreground mb-1">Busca por palavra-chave</label>
              <input
                type="text"
                [(ngModel)]="filtroBusca"
                (ngModelChange)="carregarVagas()"
                placeholder="Cargo, habilidade, área ou curso..."
                class="field text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-muted-foreground mb-1">Eixo Tecnológico</label>
              <select [(ngModel)]="filtroEixo" (ngModelChange)="carregarVagas()" class="field text-sm">
                <option value="">Todos os eixos</option>
                <option value="Informação e Comunicação">Informação e Comunicação (TI)</option>
                <option value="Ambiente e Saúde">Ambiente e Saúde</option>
                <option value="Segurança">Segurança do Trabalho</option>
                <option value="Recursos Naturais">Recursos Naturais / Agro</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-muted-foreground mb-1">Tipo de Vaga</label>
              <select [(ngModel)]="filtroTipo" (ngModelChange)="carregarVagas()" class="field text-sm">
                <option value="">Todos os tipos</option>
                <option value="Estágio não obrigatório">Estágio não obrigatório</option>
                <option value="Estágio obrigatório">Estágio obrigatório</option>
                <option value="CLT">Emprego (CLT)</option>
                <option value="Jovem aprendiz">Jovem aprendiz</option>
                <option value="Temporário">Temporário</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-muted-foreground mb-1">Turno</label>
              <select [(ngModel)]="filtroTurno" (ngModelChange)="carregarVagas()" class="field text-sm">
                <option value="">Qualquer turno</option>
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
                <option value="Integral">Integral</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-muted-foreground mb-1">Modalidade / Cidade</label>
              <select [(ngModel)]="filtroModalidade" (ngModelChange)="carregarVagas()" class="field text-sm">
                <option value="">Todas modalidades</option>
                <option value="Presencial">Presencial</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Remoto">Remoto</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Resultado da Listagem de Cards de Vaga -->
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-medium text-muted-foreground">
            Mostrando <strong>{{ vagas().length }}</strong> {{ vagas().length === 1 ? 'oportunidade ativa e moderada' : 'oportunidades ativas e moderadas' }}
          </p>
        </div>

        @if (carregando()) {
          <div class="bg-white border border-border rounded-lg p-12 text-center text-muted-foreground">
            Carregando vagas homologadas pela ETEC Cuiabá...
          </div>
        } @else if (vagas().length === 0) {
          <div class="bg-white border border-border rounded-lg p-12 text-center">
            <p class="font-heading font-bold text-xl text-foreground">Nenhuma vaga encontrada com esses filtros</p>
            <p class="text-sm text-muted-foreground mt-1">Tente limpar os filtros ou selecionar outro curso técnico.</p>
            <button type="button" (click)="limparFiltros()" class="mt-4 btn-primary text-sm">
              Ver todas as vagas abertas
            </button>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            @for (v of vagas(); track v.id) {
              <article class="bg-white border border-border rounded-lg p-6 hover:border-[#1C4587] hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <!-- Topo do Card: Tipo + Selos "Nova" e "Encerra em X dias" -->
                  <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div class="flex items-center gap-2">
                      <span class="badge bg-[#1C4587]/10 text-[#1C4587]">{{ v.tipo }}</span>
                      <span class="badge bg-muted text-muted-foreground">{{ v.modalidade }} · {{ v.turno }}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      @if (v.nova) {
                        <span class="badge bg-emerald-100 text-emerald-800">★ Nova</span>
                      }
                      <span
                        class="badge"
                        [ngClass]="v.diasRestantes <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-[#1C4587]'"
                      >
                        Encerra em {{ v.diasRestantes }} {{ v.diasRestantes === 1 ? 'dia' : 'dias' }}
                      </span>
                    </div>
                  </div>

                  <h2 class="font-heading font-bold text-xl text-foreground hover:text-[#1C4587] leading-snug">
                    <a [routerLink]="['/vagas', v.id]">{{ v.titulo }}</a>
                  </h2>

                  <p class="text-sm font-semibold text-foreground/80 mt-1 flex items-center gap-2">
                    <span>🏢 {{ v.empresaNome }}</span>
                    <span class="text-muted-foreground">·</span>
                    <span class="text-muted-foreground font-normal">📍 {{ v.local }} ({{ v.cidade }})</span>
                  </p>

                  <p class="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {{ v.atividades }}
                  </p>

                  <!-- Cursos vinculados e módulo mínimo -->
                  <div class="mt-4 flex flex-wrap gap-1.5">
                    @for (c of v.cursos; track c.id) {
                      <span class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-[#1C4587]/5 border border-[#1C4587]/20 text-[#1C4587] font-semibold">
                        🎓 {{ c.nome }}
                        @if (v.tipo.toLowerCase().includes('estágio')) {
                          <span class="text-[11px] font-normal opacity-80">(a partir do {{ c.moduloMinimo }}º mód.)</span>
                        }
                      </span>
                    }
                  </div>
                </div>

                <!-- Rodapé do Card -->
                <div class="mt-5 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span class="text-xs text-muted-foreground block">Bolsa / Salário ({{ v.cargaHoraria }})</span>
                    <span class="text-lg font-bold text-[#1E7F4A]">{{ v.bolsa }}</span>
                    <span class="text-xs text-muted-foreground ml-2">· {{ v.qtdVagas }} {{ v.qtdVagas === 1 ? 'vaga' : 'vagas' }} · Prazo: {{ v.prazo }}</span>
                  </div>

                  <div class="flex items-center gap-2">
                    <a
                      [href]="gerarLinkWhatsApp(v)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="px-3 py-2 rounded-md border border-border text-xs font-semibold text-[#1E7F4A] hover:bg-emerald-50 transition-colors"
                      title="Compartilhar vaga no WhatsApp"
                    >
                      WhatsApp ↗
                    </a>
                    <a [routerLink]="['/vagas', v.id]" class="btn-primary py-2 px-4 text-sm">
                      Ver vaga e candidatar-se
                    </a>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class VagasListComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  route = inject(ActivatedRoute);

  cursos = signal<any[]>([]);
  vagas = signal<any[]>([]);
  carregando = signal<boolean>(true);

  filtroBusca = '';
  filtroCursoId = 0;
  filtroEixo = '';
  filtroTipo = '';
  filtroTurno = '';
  filtroModalidade = '';
  filtroCidade = '';

  ngOnInit() {
    this.api.listarCursos().subscribe({
      next: (c) => this.cursos.set(c),
      error: () => {}
    });

    this.route.queryParams.subscribe((params) => {
      if (params['cursoId']) {
        this.filtroCursoId = Number(params['cursoId']);
      }
      this.carregarVagas();
    });
  }

  selecionarCurso(id: number) {
    this.filtroCursoId = id;
    this.carregarVagas();
  }

  PossuiFiltrosAtivos(): boolean {
    return !!(this.filtroBusca || this.filtroCursoId || this.filtroEixo || this.filtroTipo || this.filtroTurno || this.filtroModalidade);
  }

  limparFiltros() {
    this.filtroBusca = '';
    this.filtroCursoId = 0;
    this.filtroEixo = '';
    this.filtroTipo = '';
    this.filtroTurno = '';
    this.filtroModalidade = '';
    this.filtroCidade = '';
    this.carregarVagas();
  }

  carregarVagas() {
    this.carregando.set(true);
    this.api.listarVagas({
      busca: this.filtroBusca,
      cursoId: this.filtroCursoId > 0 ? this.filtroCursoId : '',
      eixo: this.filtroEixo,
      tipo: this.filtroTipo,
      turno: this.filtroTurno,
      modalidade: this.filtroModalidade,
      cidade: this.filtroCidade
    }).subscribe({
      next: (lista) => {
        this.vagas.set(lista);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false)
    });
  }

  gerarLinkWhatsApp(v: any): string {
    const cursosNomes = (v.cursos || []).map((c: any) => c.nome).join(', ');
    const texto = `🎓 *Vaga Homologada ETEC Cuiabá*: ${v.titulo}\n🏢 Empresa: ${v.empresaNome}\n📚 Curso(s): ${cursosNomes}\n💰 Bolsa/Salário: ${v.bolsa} (${v.tipo})\n📅 Prazo: ${v.prazo}\n🔗 Confira no Portal de Vagas ETEC: http://localhost:4200/vagas/${v.id}`;
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }
}
