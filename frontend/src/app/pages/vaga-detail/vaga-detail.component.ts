import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-vaga-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="bg-muted/40 min-h-screen py-10">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <a routerLink="/vagas" class="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1C4587] hover:underline mb-6">
          ← Voltar para a listagem de vagas
        </a>

        @if (carregando()) {
          <div class="bg-white border border-border rounded-xl p-12 text-center text-muted-foreground">
            Carregando detalhes da vaga...
          </div>
        } @else if (!vaga()) {
          <div class="bg-white border border-border rounded-xl p-12 text-center">
            <h1 class="font-heading font-bold text-2xl">Vaga não encontrada ou encerrada</h1>
            <p class="text-sm text-muted-foreground mt-2">O portal nunca exibe vagas expiradas ou fora do prazo.</p>
            <a routerLink="/vagas" class="mt-4 btn-primary">Ver vagas abertas</a>
          </div>
        } @else {
          @if (feedbackMsg()) {
            <div class="mb-6 p-4 rounded-lg border text-sm font-medium"
                 [ngClass]="feedbackErro() ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-900'">
              {{ feedbackMsg() }}
            </div>
          }

          <div class="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <!-- Cabeçalho da Vaga -->
            <div class="bg-[#0f2a52] text-white p-6 sm:p-8">
              <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="badge bg-white/15 text-white">{{ vaga().tipo }}</span>
                  <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    ✓ Homologada pela Coordenação ETEC
                  </span>
                  @if (vaga().nova) {
                    <span class="badge bg-emerald-400 text-[#0f2a52] font-bold">Nova</span>
                  }
                </div>
                <span class="badge bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  Encerra em {{ vaga().diasRestantes }} {{ vaga().diasRestantes === 1 ? 'dia' : 'dias' }} (Prazo: {{ vaga().prazo }})
                </span>
              </div>

              <h1 class="font-heading font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight">
                {{ vaga().titulo }}
              </h1>

              <p class="text-white/85 text-base mt-2 flex flex-wrap items-center gap-3">
                <span>🏢 <strong>{{ vaga().empresaNome }}</strong></span>
                <span>·</span>
                <span>📍 {{ vaga().local }} — {{ vaga().cidade }}</span>
                <span>·</span>
                <span>🖥️ {{ vaga().modalidade }}</span>
              </p>

              <!-- Botões Principais de Ação -->
              <div class="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  (click)="iniciarCandidatura()"
                  class="btn bg-[#1E7F4A] text-white hover:bg-[#17643a] shadow-md"
                >
                  Candidatar-se com 1 clique
                </button>

                <button
                  type="button"
                  (click)="salvarVaga()"
                  class="btn bg-white/10 border border-white/30 text-white hover:bg-white/20 text-sm"
                >
                  @if (vagaSalva()) { ★ Vaga Salva } @else { ☆ Salvar Vaga }
                </button>

                <a
                  [href]="gerarLinkWhatsApp()"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn bg-white text-[#1E7F4A] hover:bg-white/90 text-sm"
                >
                  Compartilhar no WhatsApp ↗
                </a>

                <button
                  type="button"
                  (click)="modalDenunciaAberto.set(true)"
                  class="ml-auto text-xs font-semibold text-white/70 hover:text-red-300 underline"
                >
                  🚩 Denunciar vaga
                </button>
              </div>
            </div>

            <!-- Bloco de Candidatura com 1 Clique (quando Aluno/Egresso clica em Candidatar-se) -->
            @if (boxCandidaturaAberto()) {
              <div class="bg-[#1C4587]/5 border-b border-[#1C4587]/20 p-6">
                <h2 class="font-heading font-bold text-xl text-[#0f2a52] mb-2">
                  Confirmar candidatura com seu currículo salvo
                </h2>
                <p class="text-sm text-muted-foreground mb-4">
                  Logado como <strong>{{ auth.usuario()?.nome }}</strong> ({{ auth.usuario()?.cursoNome }} · {{ auth.usuario()?.modulo }}º módulo).
                  Seu currículo estruturado e PDF anexado serão enviados automaticamente.
                </p>

                <div class="space-y-4 max-w-2xl">
                  <div>
                    <label class="block text-sm font-semibold text-foreground mb-1">
                      Carta de apresentação (opcional)
                    </label>
                    <textarea
                      rows="3"
                      [(ngModel)]="cartaApresentacao"
                      placeholder="Conte brevemente por que você tem interesse nesta oportunidade e sua disponibilidade..."
                      class="field text-sm"
                    ></textarea>
                  </div>

                  <!-- Termo de Consentimento LGPD -->
                  <label class="flex items-start gap-2.5 text-sm cursor-pointer">
                    <input type="checkbox" [(ngModel)]="consentimentoLgpd" class="mt-1 rounded border-input text-[#1C4587]" />
                    <span>
                      <strong>Consentimento LGPD (Lei 13.709/2018):</strong> Autorizo o compartilhamento do meu currículo e dados de contato (telefone e e-mail) exclusivamente com a empresa responsável por esta vaga. Meu CPF permanecerá oculto para a empresa.
                    </span>
                  </label>

                  @if (exigirCienciaResponsavel()) {
                    <div class="p-3.5 rounded-lg bg-amber-50 border border-amber-300 space-y-2">
                      <p class="text-xs font-bold text-amber-900">
                        ⚠️ Aluno menor de 18 anos (Regra #5 &amp; LGPD): É obrigatória a ciência do responsável legal.
                      </p>
                      <input
                        type="text"
                        [(ngModel)]="responsavelNome"
                        placeholder="Nome completo do responsável legal (Pai/Mãe/Tutor)"
                        class="field text-sm"
                      />
                      <label class="flex items-center gap-2 text-xs font-semibold text-amber-900">
                        <input type="checkbox" [(ngModel)]="cienciaResponsavel" />
                        Declaro ciência e autorização do meu responsável legal para candidatura a estágio.
                      </label>
                    </div>
                  }

                  <div class="flex items-center gap-3">
                    <button type="button" (click)="confirmarCandidatura()" [disabled]="enviando()" class="btn-verde">
                      @if (enviando()) { Enviando candidatura... } @else { Confirmar e Enviar Candidatura }
                    </button>
                    <button type="button" (click)="boxCandidaturaAberto.set(false)" class="btn-outline text-sm">
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            }

            <!-- Grade com todos os 15 Campos Obrigatórios da Vaga -->
            <div class="p-6 sm:p-8">
              <h2 class="text-xs font-bold uppercase tracking-wider text-[#2E6DA4] mb-4">
                Quadro Oficial da Vaga (15 Campos Obrigatórios verificados pela ETEC)
              </h2>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div class="p-4 rounded-lg bg-muted/60 border border-border">
                  <span class="text-xs text-muted-foreground block">1. Bolsa / Salário</span>
                  <strong class="text-lg text-[#1E7F4A]">{{ vaga().bolsa }}</strong>
                </div>
                <div class="p-4 rounded-lg bg-muted/60 border border-border">
                  <span class="text-xs text-muted-foreground block">2. Carga Horária (Lei 11.788)</span>
                  <strong class="text-base text-foreground">{{ vaga().cargaHoraria }}</strong>
                </div>
                <div class="p-4 rounded-lg bg-muted/60 border border-border">
                  <span class="text-xs text-muted-foreground block">3. Turno e Modalidade</span>
                  <strong class="text-base text-foreground">{{ vaga().turno }} · {{ vaga().modalidade }}</strong>
                </div>
                <div class="p-4 rounded-lg bg-muted/60 border border-border">
                  <span class="text-xs text-muted-foreground block">4. Número de Vagas / Prazo</span>
                  <strong class="text-base text-foreground">{{ vaga().qtdVagas }} {{ vaga().qtdVagas === 1 ? 'vaga' : 'vagas' }} · até {{ vaga().prazo }}</strong>
                </div>
              </div>

              <!-- Cursos Técnicos Vinculados e Módulo Mínimo -->
              <div class="mb-6">
                <h3 class="font-heading font-bold text-lg text-foreground mb-2">
                  Cursos Técnicos Habilitados e Módulo Mínimo
                </h3>
                <div class="flex flex-wrap gap-2">
                  @for (c of vaga().cursos; track c.id) {
                    <div class="px-3.5 py-2 rounded-lg bg-[#1C4587]/5 border border-[#1C4587]/20 text-sm">
                      <strong class="text-[#1C4587]">🎓 {{ c.nome }}</strong>
                      <span class="text-muted-foreground ml-1">
                        ({{ c.eixo }} · Módulo mínimo: <strong>{{ c.moduloMinimo }}º módulo</strong>)
                      </span>
                    </div>
                  }
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="p-5 rounded-lg border border-border bg-white">
                  <h3 class="font-heading font-bold text-lg text-foreground mb-2">Atividades a Desenvolver</h3>
                  <p class="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{{ vaga().atividades }}</p>
                </div>

                <div class="p-5 rounded-lg border border-border bg-white">
                  <h3 class="font-heading font-bold text-lg text-foreground mb-2">Requisitos da Vaga</h3>
                  <p class="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{{ vaga().requisitos }}</p>
                </div>
              </div>

              <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="p-4 rounded-lg border border-border bg-muted/30">
                  <span class="text-xs font-semibold uppercase text-muted-foreground block mb-1">Benefícios Ofertados</span>
                  <p class="text-sm font-medium text-foreground">{{ vaga().beneficios }}</p>
                </div>
                <div class="p-4 rounded-lg border border-border bg-muted/30">
                  <span class="text-xs font-semibold uppercase text-muted-foreground block mb-1">Local de Trabalho</span>
                  <p class="text-sm font-medium text-foreground">{{ vaga().local }} — {{ vaga().cidade }} ({{ vaga().modalidade }})</p>
                </div>
                <div class="p-4 rounded-lg border border-border bg-muted/30">
                  <span class="text-xs font-semibold uppercase text-muted-foreground block mb-1">Forma de Candidatura</span>
                  <p class="text-sm font-medium text-foreground">
                    {{ vaga().formaCandidatura }}
                    @if (vaga().contatoExterno) {
                      <span class="block text-xs text-[#1C4587]">{{ vaga().contatoExterno }}</span>
                    }
                  </p>
                </div>
              </div>

              <!-- Selo de Conformidade com a Lei do Estágio -->
              <div class="mt-8 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-900">
                <span class="text-lg">🛡️</span>
                <div>
                  <p class="font-bold">Garantia ETEC Cuiabá · Conformidade com a Lei Federal nº 11.788/2008 e Regra de Gratuidade</p>
                  <p class="mt-0.5">
                    Nenhuma empresa parceira da ETEC Cuiabá está autorizada a cobrar taxas, cursos, exames ou kits de candidatos. Caso identifique qualquer irregularidade, clique em "Denunciar vaga".
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Modal de Denúncia de Vaga -->
      @if (modalDenunciaAberto()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-border">
            <h3 class="font-heading font-bold text-xl text-foreground">Denunciar vaga à Coordenação ETEC</h3>
            <p class="text-xs text-muted-foreground mt-1">
              Sua denúncia vai direto para a fila da Coordenação de Estágio da ETEC Cuiabá.
            </p>
            <div class="mt-4 space-y-3">
              <div>
                <label class="block text-xs font-semibold uppercase mb-1">Motivo da denúncia *</label>
                <select [(ngModel)]="denunciaMotivo" class="field text-sm">
                  <option value="">Selecione o motivo...</option>
                  <option value="Cobrança indevida de taxa, curso ou kit (Regra #3)">Cobrança indevida de taxa, curso ou kit (Bloqueio imediato)</option>
                  <option value="Carga horária ou atividades incompatíveis com a Lei do Estágio">Carga horária ou atividades fora da Lei do Estágio</option>
                  <option value="Atividades sem relação com o curso técnico">Atividades sem relação com o curso técnico</option>
                  <option value="Informações falsas ou vaga já preenchida">Informações falsas ou vaga já preenchida</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase mb-1">Detalhes do ocorrido</label>
                <textarea rows="3" [(ngModel)]="denunciaDescricao" placeholder="Descreva o que aconteceu..." class="field text-sm"></textarea>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <input type="text" [(ngModel)]="denunciaNome" placeholder="Seu nome (ou Anônimo)" class="field text-sm" />
                <input type="text" [(ngModel)]="denunciaContato" placeholder="E-mail ou telefone (opcional)" class="field text-sm" />
              </div>
              <div class="flex justify-end gap-2 pt-2">
                <button type="button" (click)="modalDenunciaAberto.set(false)" class="btn-outline text-sm">Cancelar</button>
                <button type="button" (click)="enviarDenuncia()" class="btn bg-red-600 text-white hover:bg-red-700 text-sm">
                  Enviar Denúncia
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class VagaDetailComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  route = inject(ActivatedRoute);

  vaga = signal<any | null>(null);
  carregando = signal(true);
  vagaSalva = signal(false);

  boxCandidaturaAberto = signal(false);
  cartaApresentacao = '';
  consentimentoLgpd = true;
  exigirCienciaResponsavel = signal(false);
  cienciaResponsavel = false;
  responsavelNome = '';
  enviando = signal(false);

  feedbackMsg = signal<string | null>(null);
  feedbackErro = signal(false);

  modalDenunciaAberto = signal(false);
  denunciaMotivo = '';
  denunciaDescricao = '';
  denunciaNome = '';
  denunciaContato = '';

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.detalheVaga(id).subscribe({
      next: (v) => {
        this.vaga.set(v);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false)
    });
  }

  iniciarCandidatura() {
    this.feedbackMsg.set(null);
    if (!this.auth.logado()) {
      this.auth.abrirModalLogin(
        'Para se candidatar a esta vaga com 1 clique, entre com seu e-mail ou CPF de aluno/egresso da ETEC Cuiabá.',
        `/vagas/${this.vaga()?.id}`
      );
      return;
    }
    const u = this.auth.usuario();
    if (u?.perfil !== 'ALUNO' && u?.perfil !== 'EGRESSO') {
      this.feedbackErro.set(true);
      this.feedbackMsg.set('Apenas alunos matriculados e egressos da ETEC Cuiabá podem enviar candidatura às vagas.');
      return;
    }
    this.boxCandidaturaAberto.set(true);
  }

  confirmarCandidatura() {
    if (!this.vaga()) return;
    this.enviando.set(true);
    this.feedbackMsg.set(null);

    this.api.candidatarVaga(this.vaga().id, {
      carta: this.cartaApresentacao,
      consentimento_lgpd: this.consentimentoLgpd,
      ciencia_responsavel: this.cienciaResponsavel,
      responsavel_nome: this.responsavelNome
    }).subscribe({
      next: (res) => {
        this.enviando.set(false);
        this.boxCandidaturaAberto.set(false);
        this.feedbackErro.set(false);
        this.feedbackMsg.set(res.mensagem);
      },
      error: (err) => {
        this.enviando.set(false);
        this.feedbackErro.set(true);
        if (err?.error?.menorSemResponsavel) {
          this.exigirCienciaResponsavel.set(true);
        }
        this.feedbackMsg.set(err?.error?.mensagem || 'Não foi possível concluir a candidatura.');
      }
    });
  }

  salvarVaga() {
    if (!this.auth.logado()) {
      this.auth.abrirModalLogin('Entre como aluno para salvar vagas nos seus favoritos.', `/vagas/${this.vaga()?.id}`);
      return;
    }
    this.api.alternarVagaSalva(this.vaga().id).subscribe({
      next: (res) => {
        this.vagaSalva.set(res.salva);
        this.feedbackErro.set(false);
        this.feedbackMsg.set(res.mensagem);
      },
      error: () => {}
    });
  }

  enviarDenuncia() {
    if (!this.denunciaMotivo) return;
    this.api.denunciarVaga(this.vaga().id, {
      motivo: this.denunciaMotivo,
      descricao: this.denunciaDescricao,
      nome: this.denunciaNome,
      contato: this.denunciaContato
    }).subscribe({
      next: (res) => {
        this.modalDenunciaAberto.set(false);
        this.feedbackErro.set(false);
        this.feedbackMsg.set(res.mensagem);
      }
    });
  }

  gerarLinkWhatsApp(): string {
    const v = this.vaga();
    if (!v) return 'https://wa.me/';
    const texto = `🎓 *Vaga na ETEC Cuiabá*: ${v.titulo} (${v.tipo})\n🏢 Empresa: ${v.empresaNome}\n💰 Bolsa/Salário: ${v.bolsa}\n📅 Prazo: ${v.prazo}\n🔗 Candidate-se no Portal da ETEC: http://localhost:4200/vagas/${v.id}`;
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }
}
