import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

type AbaAluno = 'inicio' | 'curriculo' | 'candidaturas' | 'salvas' | 'notificacoes' | 'privacidade';

@Component({
  selector: 'app-painel-aluno',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="bg-muted/40 min-h-screen pb-16">
      <!-- Topo do Painel do Aluno / Egresso -->
      <div class="bg-[#0f2a52] text-white py-8 border-b border-white/10">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {{ perfil()?.egresso ? 'Perfil: Egresso (Formado ETEC)' : 'Perfil: Aluno Matriculado' }}
              </span>
              @if (perfil()?.menorDeIdade) {
                <span class="badge bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  Menor de 18 anos ({{ perfil()?.idade }} anos) — Proteção LGPD
                </span>
              }
            </div>
            <h1 class="font-heading font-bold text-2xl sm:text-3xl">
              Olá, {{ perfil()?.nome || auth.usuario()?.nome }}
            </h1>
            <p class="text-sm text-white/80 mt-0.5">
              🎓 {{ perfil()?.cursoNome }} · {{ perfil()?.modulo }}º módulo ({{ perfil()?.turno }}) · Matrícula {{ perfil()?.matricula }}
            </p>
          </div>
          <a routerLink="/vagas" class="btn bg-[#1E7F4A] text-white hover:bg-[#17643a] text-sm self-start sm:self-auto">
            Buscar vagas compatíveis →
          </a>
        </div>
      </div>

      <!-- Menu das 6 Telas do Painel do Aluno (Início, Meu currículo, Minhas candidaturas, Vagas salvas, Notificações, Dados e privacidade) -->
      <div class="bg-white border-b border-border sticky top-12 z-30">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto">
          @for (item of abas; track item.id) {
            <button
              type="button"
              (click)="abaAtiva.set(item.id)"
              class="whitespace-nowrap px-4 py-3.5 text-sm font-semibold border-b-[3px] transition-colors"
              [ngClass]="abaAtiva() === item.id ? 'border-[#1C4587] text-[#1C4587]' : 'border-transparent text-muted-foreground hover:text-foreground'"
            >
              {{ item.label }}
              @if (item.id === 'candidaturas' && candidaturas().length > 0) {
                <span class="ml-1 px-1.5 py-0.2 rounded-full bg-[#1C4587]/10 text-[#1C4587] text-xs">{{ candidaturas().length }}</span>
              }
              @if (item.id === 'notificacoes' && naoLidasCount() > 0) {
                <span class="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-xs">{{ naoLidasCount() }}</span>
              }
            </button>
          }
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        @if (msgFeedback()) {
          <div class="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 font-medium">
            {{ msgFeedback() }}
          </div>
        }

        <!-- 1. TELA: INÍCIO -->
        @if (abaAtiva() === 'inicio') {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-white border border-border rounded-xl p-5">
              <span class="text-xs text-muted-foreground uppercase font-semibold">Minhas Candidaturas</span>
              <p class="text-3xl font-bold text-[#1C4587] mt-1">{{ candidaturas().length }}</p>
              <button type="button" (click)="abaAtiva.set('candidaturas')" class="text-xs font-semibold text-[#1C4587] hover:underline mt-2">
                Acompanhar status →
              </button>
            </div>

            <div class="bg-white border border-border rounded-xl p-5">
              <span class="text-xs text-muted-foreground uppercase font-semibold">Vagas Salvas</span>
              <p class="text-3xl font-bold text-[#2E6DA4] mt-1">{{ vagasSalvas().length }}</p>
              <button type="button" (click)="abaAtiva.set('salvas')" class="text-xs font-semibold text-[#1C4587] hover:underline mt-2">
                Ver favoritos →
              </button>
            </div>

            <div class="bg-white border border-border rounded-xl p-5">
              <span class="text-xs text-muted-foreground uppercase font-semibold">Currículo Salvo</span>
              <p class="text-lg font-bold text-[#1E7F4A] mt-2">
                {{ curriculo()?.pdfNome ? '✓ Com PDF anexado' : '✓ Estruturado pronto' }}
              </p>
              <button type="button" (click)="abaAtiva.set('curriculo')" class="text-xs font-semibold text-[#1C4587] hover:underline mt-2">
                Atualizar currículo →
              </button>
            </div>

            <div class="bg-white border border-border rounded-xl p-5">
              <span class="text-xs text-muted-foreground uppercase font-semibold">Regra do seu Perfil</span>
              <p class="text-xs text-foreground mt-2 leading-relaxed">
                @if (perfil()?.egresso) {
                  <strong>Egresso:</strong> Habilitado para vagas de emprego (CLT e temporário). Estágio exige matrícula ativa.
                } @else {
                  <strong>Aluno Ativo:</strong> Habilitado para estágios e vagas do curso <em>{{ perfil()?.cursoNome }}</em> (até {{ perfil()?.modulo }}º mód.).
                }
              </p>
            </div>
          </div>

          <!-- Bloco de Estágio Ativo / Termo de Compromisso em PDF (se houver) -->
          @if (estagios().length > 0) {
            <div class="bg-white border-2 border-[#1E7F4A] rounded-xl p-6 mb-8 shadow-sm">
              <span class="badge bg-emerald-100 text-emerald-800 mb-2">Estágio Supervisionado Homologado (Lei 11.788/2008)</span>
              @for (es of estagios(); track es.id) {
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 class="font-heading font-bold text-xl text-foreground">{{ es.vagaTitulo }} — {{ es.empresaNome }}</h2>
                    <p class="text-sm text-muted-foreground mt-1">
                      Vigência: <strong>{{ es.dataInicio }}</strong> a <strong>{{ es.dataFim }}</strong> · Jornada: {{ es.cargaHoraria }} · Bolsa: {{ es.bolsa }}
                    </p>
                    <p class="text-xs text-emerald-800 font-semibold mt-1">
                      Situação: {{ es.situacao.toUpperCase() }} · Próximo Relatório Semestral: {{ es.relatorioSemestralData }} ({{ es.relatorioSemestralStatus }})
                    </p>
                  </div>
                  <button type="button" (click)="baixarTermoPdf(es.id)" class="btn-verde text-sm shrink-0">
                    📄 Baixar Termo de Compromisso (PDF)
                  </button>
                </div>
              }
            </div>
          }

          <!-- Últimas Candidaturas -->
          <div class="bg-white border border-border rounded-xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-heading font-bold text-xl">Acompanhamento rápido de candidaturas</h2>
              <button type="button" (click)="abaAtiva.set('candidaturas')" class="text-sm font-semibold text-[#1C4587] hover:underline">
                Ver linha do tempo completa →
              </button>
            </div>
            @if (candidaturas().length === 0) {
              <p class="text-sm text-muted-foreground">Você ainda não se candidatou a nenhuma vaga.</p>
            } @else {
              <div class="divide-y divide-border">
                @for (c of candidaturas(); track c.id) {
                  <div class="py-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <a [routerLink]="['/vagas', c.vagaId]" class="font-semibold text-foreground hover:text-[#1C4587]">
                        {{ c.vagaTitulo }}
                      </a>
                      <p class="text-xs text-muted-foreground">{{ c.empresaNome }} · {{ c.vagaTipo }} · {{ c.bolsa }}</p>
                    </div>
                    <span class="badge" [ngClass]="corStatusCandidatura(c.status)">
                      {{ formatarStatus(c.status) }}
                    </span>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- 2. TELA: MEU CURRÍCULO -->
        @if (abaAtiva() === 'curriculo') {
          <div class="bg-white border border-border rounded-xl p-6 sm:p-8 space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 class="font-heading font-bold text-2xl">Meu Currículo Padrão ETEC</h2>
                <p class="text-sm text-muted-foreground">
                  Este currículo é usado na sua <strong>Candidatura com 1 clique</strong>. O curso e módulo atual vêm da Secretaria.
                </p>
              </div>
              <span class="text-xs text-muted-foreground">Última atualização: {{ curriculo()?.atualizadoEm || 'Hoje' }}</span>
            </div>

            <!-- Dados vindos da Secretaria (Somente leitura para integridade acadêmica) -->
            <div class="p-4 rounded-lg bg-muted/70 border border-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span class="text-xs text-muted-foreground block">Curso Técnico (Secretaria ETEC)</span>
                <strong class="text-[#1C4587]">{{ perfil()?.cursoNome }}</strong>
              </div>
              <div>
                <span class="text-xs text-muted-foreground block">Módulo Atual &amp; Turno</span>
                <strong>{{ perfil()?.modulo }}º Módulo · Turno {{ perfil()?.turno }}</strong>
              </div>
              <div>
                <span class="text-xs text-muted-foreground block">Matrícula / Situação</span>
                <strong>{{ perfil()?.matricula }} ({{ perfil()?.egresso ? 'Egresso Formado' : 'Matrícula Ativa' }})</strong>
              </div>
            </div>

            <!-- Upload de Currículo em PDF (máx 5MB, fora da pasta pública) -->
            <div class="p-5 rounded-xl bg-[#1C4587]/5 border border-[#1C4587]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 class="font-heading font-bold text-base text-[#0f2a52]">Anexo de Currículo em PDF (máx. 5 MB)</h3>
                <p class="text-xs text-muted-foreground mt-0.5">
                  Regra de Segurança: aceita exclusivamente arquivos <code>.pdf</code> até 5 MB, armazenados fora da pasta pública.
                </p>
                @if (curriculo()?.pdfNome) {
                  <p class="text-xs font-semibold text-[#1E7F4A] mt-1.5">
                    📄 Arquivo atual salvo: {{ curriculo()?.pdfNome }}
                  </p>
                }
              </div>
              <div class="flex items-center gap-2 shrink-0">
                @if (curriculo()?.pdfNome) {
                  <button type="button" (click)="baixarMeuPdf()" class="btn-outline text-xs py-2 px-3">
                    Baixar meu PDF
                  </button>
                }
                <label class="btn-primary text-xs py-2 px-4 cursor-pointer">
                  <span>Selecionar PDF (máx 5MB)</span>
                  <input type="file" accept="application/pdf,.pdf" (change)="aoSelecionarPdf($event)" class="hidden" />
                </label>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1">Telefone / WhatsApp</label>
                <input type="text" [(ngModel)]="formCurriculo.telefone" class="field" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">Cidade / Bairro</label>
                <input type="text" [(ngModel)]="formCurriculo.cidade" class="field" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold mb-1">Resumo Profissional e Objetivo</label>
              <textarea rows="3" [(ngModel)]="formCurriculo.resumo" class="field"></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1">Formação Acadêmica</label>
                <textarea rows="3" [(ngModel)]="formCurriculo.formacao" class="field"></textarea>
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">Experiências Práticas / Estágios / Monitorias</label>
                <textarea rows="3" [(ngModel)]="formCurriculo.experiencias" class="field"></textarea>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1">Cursos Livres e Certificações</label>
                <textarea rows="2" [(ngModel)]="formCurriculo.cursos_livres" class="field"></textarea>
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">Habilidades Técnicas (separadas por vírgula)</label>
                <textarea rows="2" [(ngModel)]="formCurriculo.habilidades" class="field"></textarea>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold mb-1">Links (LinkedIn, GitHub, Portfólio)</label>
              <input type="text" [(ngModel)]="formCurriculo.links" placeholder="https://linkedin.com/in/..." class="field" />
            </div>

            <div class="flex justify-end">
              <button type="button" (click)="salvarCurriculo()" class="btn-verde">
                Salvar Currículo
              </button>
            </div>
          </div>
        }

        <!-- 3. TELA: MINHAS CANDIDATURAS (com histórico de status e data de cada mudança + botão Desistir) -->
        @if (abaAtiva() === 'candidaturas') {
          <div class="space-y-4">
            <h2 class="font-heading font-bold text-2xl">Minhas Candidaturas e Histórico de Status</h2>
            @if (candidaturas().length === 0) {
              <div class="bg-white border border-border rounded-xl p-10 text-center">
                <p class="text-muted-foreground">Você ainda não possui candidaturas enviadas.</p>
                <a routerLink="/vagas" class="mt-4 btn-primary text-sm">Explorar vagas abertas</a>
              </div>
            } @else {
              @for (c of candidaturas(); track c.id) {
                <div class="bg-white border border-border rounded-xl p-6 shadow-sm">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div class="flex items-center gap-2 mb-1">
                        <span class="badge bg-[#1C4587]/10 text-[#1C4587]">{{ c.vagaTipo }}</span>
                        <span class="badge" [ngClass]="corStatusCandidatura(c.status)">
                          Status atual: {{ formatarStatus(c.status) }}
                        </span>
                      </div>
                      <h3 class="font-heading font-bold text-xl">
                        <a [routerLink]="['/vagas', c.vagaId]" class="hover:text-[#1C4587]">{{ c.vagaTitulo }}</a>
                      </h3>
                      <p class="text-sm text-muted-foreground">
                        🏢 {{ c.empresaNome }} · 💰 {{ c.bolsa }} · Turno {{ c.vagaTurno }} · Enviada em {{ c.data }}
                      </p>
                    </div>

                    @if (c.status !== 'desistiu' && c.status !== 'aprovado' && c.status !== 'nao_selecionado') {
                      <button
                        type="button"
                        (click)="desistir(c.id)"
                        class="px-3 py-1.5 rounded-md border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Desistir da candidatura
                      </button>
                    }
                  </div>

                  <!-- Linha do tempo de cada mudança de status com data -->
                  <div class="mt-5 pt-4 border-t border-border">
                    <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-3">
                      Histórico de Mudanças de Status
                    </span>
                    <div class="flex flex-wrap gap-3">
                      @for (h of c.historico; track $index) {
                        <div class="px-3 py-2 rounded-lg bg-muted/70 border border-border text-xs">
                          <span class="font-bold text-[#1C4587] block">{{ formatarStatus(h.status) }}</span>
                          <span class="text-muted-foreground block">{{ h.data }}</span>
                          @if (h.observacao) {
                            <span class="text-foreground/80 mt-0.5 block">{{ h.observacao }}</span>
                          }
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }
            }
          </div>
        }

        <!-- 4. TELA: VAGAS SALVAS E ALERTAS -->
        @if (abaAtiva() === 'salvas') {
          <div class="space-y-6">
            <div class="bg-white border border-border rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 class="font-heading font-bold text-xl">Alerta automático de vagas do meu curso</h2>
                <p class="text-sm text-muted-foreground">
                  Receba um aviso sempre que a Coordenação da ETEC aprovar uma vaga para <strong>{{ perfil()?.cursoNome }}</strong>.
                </p>
              </div>
              <div class="flex items-center gap-4 text-sm font-semibold">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="formCurriculo.alerta_email" (change)="salvarCurriculo()" />
                  Alerta por E-mail
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="formCurriculo.alerta_whatsapp" (change)="salvarCurriculo()" />
                  Alerta por WhatsApp
                </label>
              </div>
            </div>

            <div class="bg-white border border-border rounded-xl p-6">
              <h3 class="font-heading font-bold text-xl mb-4">Minhas Vagas Salvas ({{ vagasSalvas().length }})</h3>
              @if (vagasSalvas().length === 0) {
                <p class="text-sm text-muted-foreground">Nenhuma vaga salva ainda.</p>
              } @else {
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (v of vagasSalvas(); track v.vagaId) {
                    <div class="p-4 rounded-lg border border-border flex items-center justify-between gap-3">
                      <div>
                        <span class="badge bg-[#1C4587]/10 text-[#1C4587] mb-1">{{ v.tipo }}</span>
                        <h4 class="font-bold text-base">
                          <a [routerLink]="['/vagas', v.vagaId]" class="hover:text-[#1C4587]">{{ v.titulo }}</a>
                        </h4>
                        <p class="text-xs text-muted-foreground">{{ v.empresaNome }} · {{ v.bolsa }} · Prazo {{ v.prazo }}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <a [routerLink]="['/vagas', v.vagaId]" class="btn-primary text-xs py-1.5 px-3">Ver</a>
                        <button type="button" (click)="removerSalva(v.vagaId)" class="text-xs text-red-600 hover:underline">Remover</button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- 5. TELA: NOTIFICAÇÕES -->
        @if (abaAtiva() === 'notificacoes') {
          <div class="bg-white border border-border rounded-xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-heading font-bold text-xl">Central de Avisos e Notificações</h2>
              <button type="button" (click)="marcarLidas()" class="text-xs font-semibold text-[#1C4587] hover:underline">
                Marcar todas como lidas
              </button>
            </div>
            <div class="divide-y divide-border">
              @for (n of notificacoes(); track n.id) {
                <div class="py-4 flex items-start justify-between gap-4" [ngClass]="!n.lida ? 'bg-[#1C4587]/[0.03] -mx-4 px-4 rounded' : ''">
                  <div>
                    <div class="flex items-center gap-2">
                      @if (!n.lida) {
                        <span class="w-2 h-2 rounded-full bg-[#1E7F4A]"></span>
                      }
                      <span class="text-xs font-semibold uppercase text-[#2E6DA4]">{{ n.canal }}</span>
                      <span class="text-xs text-muted-foreground">· {{ n.data }}</span>
                    </div>
                    <h3 class="font-bold text-base text-foreground mt-0.5">{{ n.titulo }}</h3>
                    <p class="text-sm text-muted-foreground mt-0.5">{{ n.mensagem }}</p>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- 6. TELA: DADOS E PRIVACIDADE (LGPD Lei 13.709/2018) -->
        @if (abaAtiva() === 'privacidade') {
          <div class="bg-white border border-border rounded-xl p-6 sm:p-8 space-y-6">
            <div>
              <span class="badge bg-[#1C4587]/10 text-[#1C4587] mb-2">LGPD · Lei Federal nº 13.709/2018</span>
              <h2 class="font-heading font-bold text-2xl">Meus Dados e Direitos do Titular</h2>
              <p class="text-sm text-muted-foreground mt-1">
                A ETEC Cuiabá aplica privacidade desde a concepção: seu CPF nunca é exibido às empresas e seu currículo só é visto pelas empresas das vagas em que você se candidatou.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="p-5 rounded-xl border border-border bg-muted/40">
                <h3 class="font-heading font-bold text-lg mb-2">Portabilidade: Baixar meus dados</h3>
                <p class="text-sm text-muted-foreground mb-4">
                  Baixe um arquivo estruturado contendo todos os seus dados acadêmicos, currículo, consentimentos e histórico de candidaturas registrados no portal.
                </p>
                <button type="button" (click)="baixarMeusDadosLgpd()" class="btn-primary text-sm">
                  ⬇️ Baixar pacote completo dos meus dados (JSON)
                </button>
              </div>

              <div class="p-5 rounded-xl border border-red-200 bg-red-50/40">
                <h3 class="font-heading font-bold text-lg text-red-900 mb-2">Direito de Exclusão de Conta</h3>
                <p class="text-sm text-red-800/80 mb-4">
                  Você pode excluir permanentemente sua conta, currículo e candidaturas do Portal de Vagas ETEC Cuiabá a qualquer momento.
                </p>
                <button type="button" (click)="excluirContaLgpd()" class="btn bg-red-600 text-white hover:bg-red-700 text-sm">
                  🗑️ Excluir minha conta e meus dados
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class PainelAlunoComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);

  abaAtiva = signal<AbaAluno>('inicio');
  abas: { id: AbaAluno; label: string }[] = [
    { id: 'inicio', label: 'Início' },
    { id: 'curriculo', label: 'Meu currículo' },
    { id: 'candidaturas', label: 'Minhas candidaturas' },
    { id: 'salvas', label: 'Vagas salvas' },
    { id: 'notificacoes', label: 'Notificações' },
    { id: 'privacidade', label: 'Dados e privacidade' }
  ];

  perfil = signal<any>(null);
  curriculo = signal<any>(null);
  candidaturas = signal<any[]>([]);
  vagasSalvas = signal<any[]>([]);
  notificacoes = signal<any[]>([]);
  estagios = signal<any[]>([]);
  msgFeedback = signal<string | null>(null);

  formCurriculo: any = {
    telefone: '',
    cidade: 'Cuiabá/MT',
    resumo: '',
    experiencias: '',
    formacao: '',
    cursos_livres: '',
    habilidades: '',
    links: '',
    alerta_email: true,
    alerta_whatsapp: true,
    consentimento_lgpd: true,
    responsavel_nome: '',
    responsavel_cpf: '',
    ciencia_responsavel: false
  };

  ngOnInit() {
    this.carregarDados();
  }

  carregarDados() {
    this.api.getAlunoDashboard().subscribe({
      next: (res) => {
        this.perfil.set(res.perfil);
        this.curriculo.set(res.curriculo);
        this.candidaturas.set(res.candidaturas || []);
        this.vagasSalvas.set(res.vagasSalvas || []);
        this.notificacoes.set(res.notificacoes || []);
        this.estagios.set(res.estagios || []);

        this.formCurriculo = {
          telefone: res.perfil?.telefone || '',
          cidade: res.perfil?.cidade || 'Cuiabá/MT',
          resumo: res.curriculo?.resumo || '',
          experiencias: res.curriculo?.experiencias || '',
          formacao: res.curriculo?.formacao || '',
          cursos_livres: res.curriculo?.cursosLivres || '',
          habilidades: res.curriculo?.habilidades || '',
          links: res.curriculo?.links || '',
          alerta_email: !!res.perfil?.alertaEmail,
          alerta_whatsapp: !!res.perfil?.alertaWhatsapp,
          consentimento_lgpd: !!res.perfil?.consentimentoLgpd,
          responsavel_nome: res.perfil?.responsavelNome || '',
          responsavel_cpf: res.perfil?.responsavelCpf || '',
          ciencia_responsavel: !!res.perfil?.cienciaResponsavel
        };
      }
    });
  }

  naoLidasCount(): number {
    return this.notificacoes().filter((n) => !n.lida).length;
  }

  salvarCurriculo() {
    this.api.salvarCurriculo(this.formCurriculo).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem);
        this.carregarDados();
      }
    });
  }

  aoSelecionarPdf(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      this.mostrarFeedback('Erro: O sistema aceita apenas arquivos em formato PDF (.pdf).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.mostrarFeedback('Erro: O arquivo excede o limite de segurança de 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result || '');
      this.api.uploadCurriculoPdf(file.name, base64).subscribe({
        next: (res) => {
          this.mostrarFeedback(res.mensagem);
          this.carregarDados();
        },
        error: (err) => this.mostrarFeedback(err?.error?.mensagem || 'Falha no upload do PDF.')
      });
    };
    reader.readAsDataURL(file);
  }

  baixarMeuPdf() {
    const id = this.perfil()?.id;
    if (!id) return;
    this.api.baixarCurriculoPdf(id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.curriculo()?.pdfNome || 'curriculo_etec.pdf';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  baixarTermoPdf(estagioId: number) {
    this.api.baixarTermoEstagioPdf(estagioId).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Termo_Compromisso_Estagio_ETEC_${estagioId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  desistir(candidaturaId: number) {
    this.api.desistirCandidatura(candidaturaId).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem);
        this.carregarDados();
      }
    });
  }

  removerSalva(vagaId: number) {
    this.api.alternarVagaSalva(vagaId).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem);
        this.carregarDados();
      }
    });
  }

  marcarLidas() {
    this.api.lerTodasNotificacoes().subscribe({
      next: () => this.carregarDados()
    });
  }

  baixarMeusDadosLgpd() {
    this.api.exportarDadosLgpd().subscribe((dados) => {
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus_dados_lgpd_etec_${this.perfil()?.matricula || 'aluno'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.mostrarFeedback('Relatório de portabilidade LGPD baixado com sucesso!');
    });
  }

  excluirContaLgpd() {
    if (!confirm('Tem certeza que deseja excluir permanentemente sua conta e currículo conforme a LGPD?')) return;
    this.api.excluirContaLgpd().subscribe({
      next: () => this.auth.logout()
    });
  }

  formatarStatus(s: string): string {
    const mapa: Record<string, string> = {
      enviada: 'Enviada',
      em_analise: 'Em análise',
      entrevista: 'Entrevista',
      aprovado: 'Aprovado / Selecionado',
      nao_selecionado: 'Não selecionado',
      desistiu: 'Desistiu'
    };
    return mapa[s] || s;
  }

  corStatusCandidatura(s: string): string {
    switch (s) {
      case 'aprovado': return 'bg-emerald-100 text-emerald-800';
      case 'entrevista': return 'bg-purple-100 text-[#5C2D91]';
      case 'em_analise': return 'bg-blue-100 text-[#1C4587]';
      case 'nao_selecionado':
      case 'desistiu': return 'bg-gray-200 text-gray-700';
      default: return 'bg-amber-100 text-amber-800';
    }
  }

  private mostrarFeedback(msg: string) {
    this.msgFeedback.set(msg);
    setTimeout(() => this.msgFeedback.set(null), 5000);
  }
}
