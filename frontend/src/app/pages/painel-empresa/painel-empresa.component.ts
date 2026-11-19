import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

type AbaEmpresa = 'inicio' | 'vagas' | 'nova-vaga' | 'candidatos' | 'dados' | 'usuarios';

@Component({
  selector: 'app-painel-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-muted/40 min-h-screen pb-16">
      <!-- Topo do Painel da Empresa -->
      <div class="bg-[#0f2a52] text-white py-8 border-b border-white/10">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="badge"
                    [ngClass]="empresa()?.status === 'aprovada' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'">
                Status da Empresa: {{ (empresa()?.status || 'pendente').toUpperCase() }}
              </span>
              <span class="text-xs text-white/70">CNPJ {{ empresa()?.cnpj }}</span>
            </div>
            <h1 class="font-heading font-bold text-2xl sm:text-3xl">
              {{ empresa()?.nomeFantasia || auth.usuario()?.empresaNome }}
            </h1>
            <p class="text-sm text-white/80 mt-0.5">
              {{ empresa()?.razaoSocial }} · {{ empresa()?.setor }} · Responsável: {{ empresa()?.responsavel }}
            </p>
          </div>
          <button type="button" (click)="abrirFormularioNovaVaga()" class="btn bg-[#1E7F4A] text-white hover:bg-[#17643a] text-sm self-start sm:self-auto">
            + Cadastrar Nova Vaga
          </button>
        </div>
      </div>

      <!-- Menu das 6 Telas do Painel da Empresa -->
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
            </button>
          }
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        @if (feedbackMsg()) {
          <div class="mb-6 p-4 rounded-lg border text-sm font-medium"
               [ngClass]="feedbackErro() ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-900'">
            {{ feedbackMsg() }}
          </div>
        }

        <!-- 1. TELA: INÍCIO -->
        @if (abaAtiva() === 'inicio') {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-white border border-border rounded-xl p-5">
              <span class="text-xs text-muted-foreground uppercase font-semibold">Vagas Publicadas</span>
              <p class="text-3xl font-bold text-[#1E7F4A] mt-1">{{ contarVagasPorStatus('publicada') }}</p>
            </div>
            <div class="bg-white border border-border rounded-xl p-5">
              <span class="text-xs text-muted-foreground uppercase font-semibold">Aguardando Aprovação ETEC</span>
              <p class="text-3xl font-bold text-amber-600 mt-1">{{ contarVagasPorStatus('aguardando_aprovacao') }}</p>
            </div>
            <div class="bg-white border border-border rounded-xl p-5">
              <span class="text-xs text-muted-foreground uppercase font-semibold">Total de Candidaturas</span>
              <p class="text-3xl font-bold text-[#1C4587] mt-1">{{ totalCandidatos() }}</p>
            </div>
            <div class="bg-white border border-border rounded-xl p-5">
              <span class="text-xs text-muted-foreground uppercase font-semibold">Alunos Contratados</span>
              <p class="text-3xl font-bold text-[#5C2D91] mt-1">{{ totalContratados() }}</p>
            </div>
          </div>

          <!-- Vagas com Ajuste Solicitado pela Coordenação -->
          @for (v of vagas(); track v.id) {
            @if (v.status === 'ajuste_solicitado') {
              <div class="mb-6 p-5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span class="badge bg-amber-200 text-amber-900 mb-1">Ajuste Solicitado pela Coordenação ETEC</span>
                  <h3 class="font-heading font-bold text-lg text-amber-950">{{ v.titulo }}</h3>
                  <p class="text-sm text-amber-900 mt-0.5">
                    <strong>Motivo escrito pela Coordenação:</strong> {{ v.motivoAjuste }}
                  </p>
                </div>
                <button type="button" (click)="carregarVagaParaEdicao(v)" class="btn bg-amber-700 text-white hover:bg-amber-800 text-sm shrink-0">
                  Corrigir e Reenviar Vaga
                </button>
              </div>
            }
          }

          <div class="bg-white border border-border rounded-xl p-6">
            <h2 class="font-heading font-bold text-xl mb-4">Avisos Recentes da Coordenação ETEC</h2>
            <div class="divide-y divide-border">
              @for (n of notificacoes(); track n.id) {
                <div class="py-3">
                  <div class="flex items-center justify-between">
                    <strong class="text-sm text-foreground">{{ n.titulo }}</strong>
                    <span class="text-xs text-muted-foreground">{{ n.data }}</span>
                  </div>
                  <p class="text-sm text-muted-foreground mt-0.5">{{ n.mensagem }}</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- 2. TELA: MINHAS VAGAS (rascunho, aguardando aprovação, publicada, ajuste solicitado, encerrada + duplicar + encerrar) -->
        @if (abaAtiva() === 'vagas') {
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap gap-2">
                @for (st of filtrosStatusVaga; track st.id) {
                  <button
                    type="button"
                    (click)="filtroStatus = st.id"
                    class="px-3 py-1.5 rounded-full text-xs font-semibold border"
                    [ngClass]="filtroStatus === st.id ? 'bg-[#1C4587] text-white border-[#1C4587]' : 'bg-white text-foreground border-border'"
                  >
                    {{ st.label }}
                  </button>
                }
              </div>
              <button type="button" (click)="abrirFormularioNovaVaga()" class="btn-verde text-sm">
                + Nova Vaga
              </button>
            </div>

            @for (v of vagasFiltradas(); track v.id) {
              <div class="bg-white border border-border rounded-xl p-6 shadow-sm">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div class="flex flex-wrap items-center gap-2 mb-1.5">
                      <span class="badge" [ngClass]="corStatusVaga(v.status)">
                        {{ v.status.replace('_', ' ').toUpperCase() }}
                      </span>
                      <span class="badge bg-muted text-foreground">{{ v.tipo }}</span>
                      @if (v.confidencial) {
                        <span class="badge bg-purple-100 text-[#5C2D91]">🔒 Nome Confidencial ao Público</span>
                      }
                    </div>
                    <h3 class="font-heading font-bold text-xl">{{ v.titulo }}</h3>
                    <p class="text-sm text-muted-foreground mt-0.5">
                      💰 {{ v.bolsa }} · ⏱️ {{ v.cargaHoraria }} ({{ v.turno }}) · 📍 {{ v.local }} · Prazo: {{ v.prazo }}
                    </p>
                    <div class="mt-2 flex flex-wrap gap-1.5">
                      @for (c of v.cursos; track c.id) {
                        <span class="text-xs px-2 py-0.5 rounded bg-[#1C4587]/10 text-[#1C4587] font-semibold">
                          🎓 {{ c.nome }} (Mód. mín. {{ c.moduloMinimo }}º)
                        </span>
                      }
                    </div>
                    @if (v.motivoAjuste) {
                      <div class="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900">
                        <strong>Motivo do ajuste / parecer da ETEC:</strong> {{ v.motivoAjuste }}
                      </div>
                    }
                  </div>

                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      (click)="verCandidatosDaVaga(v)"
                      class="btn-primary text-xs py-2 px-3"
                    >
                      👥 Candidatos ({{ v.totalCandidatos }})
                    </button>
                    <button
                      type="button"
                      (click)="carregarVagaParaEdicao(v)"
                      class="btn-outline text-xs py-2 px-3"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      (click)="duplicarVaga(v.id)"
                      class="btn-outline text-xs py-2 px-3"
                      title="Criar nova vaga copiando os dados desta"
                    >
                      📋 Duplicar
                    </button>
                    @if (v.status === 'publicada') {
                      <button
                        type="button"
                        (click)="iniciarEncerramentoVaga(v)"
                        class="px-3 py-2 rounded-md border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Encerrar e informar contratado
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- 3. TELA: NOVA VAGA (15 Campos Obrigatórios + Validação da Lei do Estágio 11.788/2008) -->
        @if (abaAtiva() === 'nova-vaga') {
          <div class="bg-white border border-border rounded-xl p-6 sm:p-8 space-y-6">
            <div class="border-b border-border pb-4 flex items-center justify-between">
              <div>
                <span class="eyebrow">15 CAMPOS OBRIGATÓRIOS &amp; VALIDAÇÃO LEI Nº 11.788/2008</span>
                <h2 class="font-heading font-bold text-2xl">
                  {{ vagaEditandoId() ? 'Editar Vaga #' + vagaEditandoId() + ' (Voltará para aprovação ETEC)' : 'Cadastrar Nova Vaga' }}
                </h2>
              </div>
              @if (vagaEditandoId()) {
                <button type="button" (click)="abrirFormularioNovaVaga()" class="text-xs font-semibold text-[#1C4587] hover:underline">
                  Limpar / Criar nova
                </button>
              }
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-sm font-semibold mb-1">1. Título da Vaga *</label>
                <input type="text" [(ngModel)]="formVaga.titulo" placeholder="Ex: Estagiário(a) de Enfermagem / Desenvolvedor Jr" class="field" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">2. Tipo de Vaga *</label>
                <select [(ngModel)]="formVaga.tipo" (ngModelChange)="aoMudarTipoVaga($event)" class="field">
                  <option value="Estágio não obrigatório">Estágio não obrigatório</option>
                  <option value="Estágio obrigatório">Estágio obrigatório</option>
                  <option value="CLT">Emprego (CLT)</option>
                  <option value="Jovem aprendiz">Jovem aprendiz</option>
                  <option value="Temporário">Temporário</option>
                </select>
              </div>
            </div>

            <!-- 3. Cursos Técnicos da ETEC e 4. Módulo Mínimo -->
            <div class="p-4 rounded-xl bg-muted/60 border border-border space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <label class="text-sm font-semibold">3. Curso(s) Técnico(s) da ETEC Cuiabá Vinculados *</label>
                <div class="flex items-center gap-2 text-sm">
                  <label class="font-semibold">4. Módulo mínimo exigido:</label>
                  <select [(ngModel)]="formVaga.modulo_minimo" class="field py-1 px-2 w-32 text-sm">
                    <option [ngValue]="1">1º módulo</option>
                    <option [ngValue]="2">2º módulo</option>
                    <option [ngValue]="3">3º módulo</option>
                    <option [ngValue]="4">4º módulo</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                @for (c of cursos(); track c.id) {
                  <label class="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-border text-xs font-medium cursor-pointer hover:border-[#1C4587]">
                    <input
                      type="checkbox"
                      [checked]="cursoSelecionado(c.id)"
                      (change)="alternarCursoVaga(c.id)"
                    />
                    <span>{{ c.nome }}</span>
                  </label>
                }
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1">5. Atividades a serem desenvolvidas *</label>
                <textarea rows="3" [(ngModel)]="formVaga.atividades" placeholder="Descreva as atividades práticas..." class="field"></textarea>
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">6. Requisitos *</label>
                <textarea rows="3" [(ngModel)]="formVaga.requisitos" placeholder="Conhecimentos, postura e disponibilidade..." class="field"></textarea>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1">
                  7. Bolsa / Salário *
                  <span class="text-xs font-normal text-muted-foreground">("A combinar" só é permitido em CLT)</span>
                </label>
                <input type="text" [(ngModel)]="formVaga.bolsa" placeholder="Ex: R$ 1.100,00" class="field" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">
                  8. Benefícios *
                  <span class="text-xs font-normal text-muted-foreground">(Auxílio-transporte obrigatório no estágio não obrigatório)</span>
                </label>
                <input type="text" [(ngModel)]="formVaga.beneficios" placeholder="Auxílio-transporte, Seguro de Vida..." class="field" />
              </div>
            </div>

            <!-- Validação da Jornada pela Lei do Estágio (máx 6h/dia e 30h/semana) -->
            <div class="p-4 rounded-xl bg-[#1C4587]/5 border border-[#1C4587]/20 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label class="block text-xs font-semibold uppercase mb-1">9. Horas por Dia *</label>
                <input type="number" min="1" max="8" [(ngModel)]="formVaga.horas_dia" (ngModelChange)="atualizarTextoCargaHoraria()" class="field" />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase mb-1">Horas por Semana *</label>
                <input type="number" min="4" max="44" [(ngModel)]="formVaga.horas_semana" (ngModelChange)="atualizarTextoCargaHoraria()" class="field" />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase mb-1">Resumo Carga Horária *</label>
                <input type="text" [(ngModel)]="formVaga.carga_horaria" class="field" />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase mb-1">10. Turno *</label>
                <select [(ngModel)]="formVaga.turno" class="field">
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noite">Noite</option>
                  <option value="Integral">Integral</option>
                </select>
              </div>
              @if (ehEstagio() && (formVaga.horas_dia > 6 || formVaga.horas_semana > 30)) {
                <p class="sm:col-span-4 text-xs font-bold text-red-700">
                  ⚠️ Bloqueio Lei do Estágio (Lei 11.788/2008): Para estágio de nível técnico, a jornada máxima permitida é de 6h/dia e 30h/semana!
                </p>
              }
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1">11. Modalidade *</label>
                <select [(ngModel)]="formVaga.modalidade" class="field">
                  <option value="Presencial">Presencial</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Remoto">Remoto</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label class="block text-sm font-semibold mb-1">12. Local / Bairro *</label>
                <input type="text" [(ngModel)]="formVaga.local" placeholder="Ex: Bairro Porto, Cuiabá" class="field" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">13. Nº de Vagas *</label>
                <input type="number" min="1" [(ngModel)]="formVaga.qtd_vagas" class="field" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1">14. Prazo de Inscrição * (máx 60 dias)</label>
                <input type="date" [(ngModel)]="formVaga.prazo" class="field" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">15. Forma de Candidatura *</label>
                <select [(ngModel)]="formVaga.forma_candidatura" class="field">
                  <option value="Pelo sistema">Pelo sistema (1 clique com currículo ETEC)</option>
                  <option value="Link ou e-mail externo">Link ou e-mail externo</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">Visibilidade da Empresa</label>
                <label class="flex items-center gap-2 mt-2.5 text-sm cursor-pointer">
                  <input type="checkbox" [(ngModel)]="formVaga.confidencial" />
                  <span>Exibir como "Confidencial" ao público (a ETEC sempre vê)</span>
                </label>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-border">
              <button type="button" (click)="submeterVaga(true)" class="btn-outline">
                Salvar como Rascunho
              </button>
              <button type="button" (click)="submeterVaga(false)" class="btn-verde">
                Enviar para Aprovação da Coordenação ETEC
              </button>
            </div>
          </div>
        }

        <!-- 4. TELA: CANDIDATOS (lista por vaga, currículo, PDF, mudança de status em lote e observação interna) -->
        @if (abaAtiva() === 'candidatos') {
          <div class="space-y-6">
            <div class="bg-white border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label class="block text-xs font-bold uppercase text-muted-foreground mb-1">Selecione a vaga para ver os candidatos</label>
                <select [(ngModel)]="vagaSelecionadaCandidatosId" (ngModelChange)="carregarCandidatosDaVaga($event)" class="field sm:w-96">
                  @for (v of vagas(); track v.id) {
                    <option [ngValue]="v.id">{{ v.titulo }} ({{ v.totalCandidatos }} candidatos)</option>
                  }
                </select>
              </div>

              <!-- Mudança de status em lote -->
              @if (candidatos().length > 0) {
                <div class="flex flex-wrap items-center gap-2">
                  <select [(ngModel)]="novoStatusLote" class="field py-2 text-sm w-44">
                    <option value="em_analise">Mover para: Em análise</option>
                    <option value="entrevista">Mover para: Entrevista</option>
                    <option value="aprovado">Mover para: Aprovado</option>
                    <option value="nao_selecionado">Mover para: Não selecionado</option>
                  </select>
                  <button type="button" (click)="aplicarMudancaEmLote()" class="btn-primary text-xs py-2.5 px-4">
                    Aplicar aos selecionados ({{ selecionadosLote().length }})
                  </button>
                </div>
              }
            </div>

            <!-- Modal/Caixa de Encerramento de Vaga e Contratação -->
            @if (vagaEncerrando()) {
              <div class="p-5 rounded-xl bg-emerald-50 border-2 border-[#1E7F4A] space-y-3">
                <h3 class="font-heading font-bold text-xl text-emerald-950">
                  Encerrar vaga "{{ vagaEncerrando()?.titulo }}" e informar quem foi contratado
                </h3>
                <p class="text-sm text-emerald-900">
                  Selecione abaixo na coluna de seleção quem foi contratado. Esse dado alimenta diretamente o indicador oficial de empregabilidade da ETEC Cuiabá / SECITECI.
                </p>
                <div class="flex gap-3">
                  <button type="button" (click)="confirmarEncerramentoComContratados()" class="btn-verde text-sm">
                    ✓ Confirmar Encerramento ({{ selecionadosLote().length }} contratado(s))
                  </button>
                  <button type="button" (click)="vagaEncerrando.set(null)" class="btn-outline text-sm">
                    Cancelar
                  </button>
                </div>
              </div>
            }

            @if (candidatos().length === 0) {
              <div class="bg-white border border-border rounded-xl p-10 text-center text-muted-foreground">
                Nenhum candidato inscrito nesta vaga até o momento.
              </div>
            } @else {
              @for (c of candidatos(); track c.candidaturaId) {
                <div class="bg-white border border-border rounded-xl p-6 shadow-sm space-y-4">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div class="flex items-start gap-3">
                      <input
                        type="checkbox"
                        [checked]="estaSelecionadoNoLote(c.candidaturaId)"
                        (change)="alternarSelecaoLote(c.candidaturaId)"
                        class="mt-1.5 w-4 h-4"
                      />
                      <div>
                        <div class="flex flex-wrap items-center gap-2">
                          <h3 class="font-heading font-bold text-xl">{{ c.alunoNome }}</h3>
                          <span class="badge bg-[#1C4587]/10 text-[#1C4587]">{{ c.status.toUpperCase().replace('_', ' ') }}</span>
                          @if (c.contratado) {
                            <span class="badge bg-emerald-100 text-emerald-800">★ Contratado</span>
                          }
                          @if (c.menorDeIdade) {
                            <span class="badge bg-amber-100 text-amber-800">{{ c.idade }} anos (Menor &lt;18)</span>
                          }
                        </div>
                        <p class="text-sm text-muted-foreground mt-0.5">
                          🎓 {{ c.cursoNome }} · {{ c.modulo }}º módulo ({{ c.turno }}) · Matrícula {{ c.matricula }}
                        </p>
                        <p class="text-xs text-foreground mt-1">
                          📧 {{ c.alunoEmail }} · 📱 {{ c.alunoTelefone }} · 🔒 CPF: <span class="text-muted-foreground">{{ c.cpfOcultoLgpd }}</span>
                        </p>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                      @if (c.temPdf) {
                        <button type="button" (click)="baixarPdfCandidato(c.alunoId, c.pdfNome)" class="btn-outline text-xs py-1.5 px-3">
                          📄 Baixar PDF do Aluno
                        </button>
                      }
                      <button type="button" (click)="mudarStatusIndividual(c, 'em_analise')" class="px-2.5 py-1.5 rounded border text-xs font-semibold hover:bg-muted">
                        Em análise
                      </button>
                      <button type="button" (click)="mudarStatusIndividual(c, 'entrevista')" class="px-2.5 py-1.5 rounded border text-xs font-semibold text-[#5C2D91] hover:bg-purple-50">
                        Entrevista
                      </button>
                      <button type="button" (click)="mudarStatusIndividual(c, 'aprovado')" class="px-2.5 py-1.5 rounded bg-[#1E7F4A] text-white text-xs font-semibold hover:bg-[#17643a]">
                        ✓ Aprovar
                      </button>
                      <button type="button" (click)="mudarStatusIndividual(c, 'nao_selecionado')" class="px-2.5 py-1.5 rounded border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50">
                        Não selecionado
                      </button>
                    </div>
                  </div>

                  <!-- Currículo do Candidato -->
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50 border border-border text-xs">
                    <div>
                      <strong class="block text-foreground mb-1">Resumo e Carta de Apresentação</strong>
                      <p class="text-muted-foreground">{{ c.carta || c.resumo }}</p>
                    </div>
                    <div>
                      <strong class="block text-foreground mb-1">Experiências e Formação</strong>
                      <p class="text-muted-foreground">{{ c.experiencias }} | {{ c.formacao }}</p>
                    </div>
                    <div>
                      <strong class="block text-foreground mb-1">Habilidades e Cursos Livres</strong>
                      <p class="text-muted-foreground">{{ c.habilidades }} | {{ c.cursosLivres }}</p>
                    </div>
                  </div>

                  <!-- Campo de Observação Interna da Empresa -->
                  <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      [(ngModel)]="c.observacaoEmpresa"
                      placeholder="Observação interna do RH sobre este candidato (visível apenas para a empresa)..."
                      class="field text-xs py-2"
                    />
                    <button
                      type="button"
                      (click)="mudarStatusIndividual(c, c.status)"
                      class="btn-outline text-xs py-2 px-3 shrink-0"
                    >
                      Salvar observação interna
                    </button>
                  </div>
                </div>
              }
            }
          </div>
        }

        <!-- 5. TELA: DADOS DA EMPRESA -->
        @if (abaAtiva() === 'dados') {
          <div class="bg-white border border-border rounded-xl p-6 sm:p-8 space-y-4 max-w-3xl">
            <h2 class="font-heading font-bold text-2xl">Dados Cadastrais da Empresa</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1">Nome Fantasia</label>
                <input type="text" [(ngModel)]="formEmpresa.nome_fantasia" class="field" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">Setor</label>
                <input type="text" [(ngModel)]="formEmpresa.setor" class="field" />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-sm font-semibold mb-1">Endereço</label>
                <input type="text" [(ngModel)]="formEmpresa.endereco" class="field" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">Responsável</label>
                <input type="text" [(ngModel)]="formEmpresa.responsavel" class="field" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">Telefone</label>
                <input type="text" [(ngModel)]="formEmpresa.telefone" class="field" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">E-mail de Contato</label>
                <input type="email" [(ngModel)]="formEmpresa.email_contato" class="field" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">Cidade</label>
                <input type="text" [(ngModel)]="formEmpresa.cidade" class="field" />
              </div>
            </div>
            <button type="button" (click)="salvarDadosEmpresa()" class="btn-primary">
              Atualizar Dados da Empresa
            </button>
          </div>
        }

        <!-- 6. TELA: USUÁRIOS DA EMPRESA (Mais de um recrutador na mesma empresa) -->
        @if (abaAtiva() === 'usuarios') {
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div class="lg:col-span-7 bg-white border border-border rounded-xl p-6">
              <h2 class="font-heading font-bold text-xl mb-4">Recrutadores Autorizados na Empresa</h2>
              <div class="divide-y divide-border">
                @for (u of usuariosEmpresa(); track u.id) {
                  <div class="py-3.5 flex items-center justify-between">
                    <div>
                      <p class="font-bold text-foreground">{{ u.nome }}</p>
                      <p class="text-xs text-muted-foreground">Login: <code>{{ u.login }}</code> · {{ u.email }} · {{ u.cargo }}</p>
                    </div>
                    <span class="badge bg-emerald-100 text-emerald-800">Ativo</span>
                  </div>
                }
              </div>
            </div>

            <div class="lg:col-span-5 bg-white border border-border rounded-xl p-6 space-y-4">
              <h3 class="font-heading font-bold text-lg">Adicionar Novo Recrutador</h3>
              <div>
                <label class="block text-xs font-semibold uppercase mb-1">Nome Completo</label>
                <input type="text" [(ngModel)]="novoRecrutador.nome" placeholder="Nome do recrutador" class="field text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase mb-1">Cargo no RH</label>
                <input type="text" [(ngModel)]="novoRecrutador.cargo" placeholder="Ex: Analista de Seleção" class="field text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase mb-1">Login (com letras)</label>
                <input type="text" [(ngModel)]="novoRecrutador.login" placeholder="Ex: rh.maria" class="field text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase mb-1">E-mail Corporativo</label>
                <input type="email" [(ngModel)]="novoRecrutador.email" placeholder="maria@empresa.com.br" class="field text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase mb-1">Senha Inicial</label>
                <input type="password" [(ngModel)]="novoRecrutador.senha" placeholder="Mínimo 6 caracteres" class="field text-sm" />
              </div>
              <button type="button" (click)="adicionarRecrutador()" class="w-full btn-verde text-sm">
                Adicionar Recrutador à Empresa
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class PainelEmpresaComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);

  abaAtiva = signal<AbaEmpresa>('inicio');
  abas: { id: AbaEmpresa; label: string }[] = [
    { id: 'inicio', label: 'Início' },
    { id: 'vagas', label: 'Minhas vagas' },
    { id: 'nova-vaga', label: 'Nova vaga' },
    { id: 'candidatos', label: 'Candidatos' },
    { id: 'dados', label: 'Dados da empresa' },
    { id: 'usuarios', label: 'Usuários da empresa' }
  ];

  filtrosStatusVaga = [
    { id: 'todas', label: 'Todas' },
    { id: 'publicada', label: 'Publicadas' },
    { id: 'aguardando_aprovacao', label: 'Aguardando aprovação' },
    { id: 'ajuste_solicitado', label: 'Ajuste solicitado' },
    { id: 'rascunho', label: 'Rascunhos' },
    { id: 'encerrada', label: 'Encerradas' }
  ];
  filtroStatus = 'todas';

  empresa = signal<any>(null);
  vagas = signal<any[]>([]);
  cursos = signal<any[]>([]);
  usuariosEmpresa = signal<any[]>([]);
  notificacoes = signal<any[]>([]);
  totalCandidatos = signal(0);
  totalContratados = signal(0);

  vagaEditandoId = signal<number | null>(null);
  formVaga: any = this.criarFormVagaPadrao();

  vagaSelecionadaCandidatosId = 0;
  candidatos = signal<any[]>([]);
  selecionadosLote = signal<number[]>([]);
  novoStatusLote = 'entrevista';
  vagaEncerrando = signal<any | null>(null);

  formEmpresa: any = {};
  novoRecrutador = { nome: '', cargo: 'Recrutador(a)', login: '', email: '', senha: '' };

  feedbackMsg = signal<string | null>(null);
  feedbackErro = signal(false);

  ngOnInit() {
    this.api.listarCursos().subscribe((c) => this.cursos.set(c));
    this.carregarDashboard();
  }

  criarFormVagaPadrao() {
    const prazo30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    return {
      titulo: '',
      tipo: 'Estágio não obrigatório',
      cursos: [1],
      modulo_minimo: 2,
      atividades: '',
      requisitos: '',
      bolsa: 'R$ 1.150,00',
      beneficios: 'Auxílio-transporte e Seguro de Vida obrigatório (Lei 11.788/2008)',
      horas_dia: 6,
      horas_semana: 30,
      carga_horaria: '6h/dia, 30h/semana',
      turno: 'Tarde',
      modalidade: 'Presencial',
      local: 'Centro / CPA, Cuiabá',
      cidade: 'Cuiabá/MT',
      qtd_vagas: 1,
      prazo: prazo30,
      forma_candidatura: 'Pelo sistema',
      contato_externo: '',
      confidencial: false
    };
  }

  carregarDashboard() {
    this.api.getEmpresaDashboard().subscribe({
      next: (res) => {
        this.empresa.set(res.empresa);
        this.vagas.set(res.vagas || []);
        this.usuariosEmpresa.set(res.usuarios || []);
        this.notificacoes.set(res.notificacoes || []);
        this.totalCandidatos.set(res.totalCandidatos || 0);
        this.totalContratados.set(res.totalContratados || 0);

        this.formEmpresa = {
          nome_fantasia: res.empresa?.nomeFantasia || '',
          setor: res.empresa?.setor || '',
          endereco: res.empresa?.endereco || '',
          cidade: res.empresa?.cidade || 'Cuiabá/MT',
          responsavel: res.empresa?.responsavel || '',
          telefone: res.empresa?.telefone || '',
          email_contato: res.empresa?.emailContato || ''
        };

        if (res.vagas?.length > 0 && !this.vagaSelecionadaCandidatosId) {
          this.vagaSelecionadaCandidatosId = res.vagas[0].id;
          this.carregarCandidatosDaVaga(this.vagaSelecionadaCandidatosId);
        }
      }
    });
  }

  contarVagasPorStatus(st: string): number {
    return this.vagas().filter((v) => v.status === st).length;
  }

  vagasFiltradas(): any[] {
    if (this.filtroStatus === 'todas') return this.vagas();
    return this.vagas().filter((v) => v.status === this.filtroStatus);
  }

  abrirFormularioNovaVaga() {
    this.vagaEditandoId.set(null);
    this.formVaga = this.criarFormVagaPadrao();
    this.abaAtiva.set('nova-vaga');
  }

  carregarVagaParaEdicao(v: any) {
    this.vagaEditandoId.set(v.id);
    this.formVaga = {
      titulo: v.titulo,
      tipo: v.tipo,
      cursos: (v.cursos || []).map((c: any) => c.id),
      modulo_minimo: v.cursos?.[0]?.moduloMinimo || 1,
      atividades: v.atividades,
      requisitos: v.requisitos,
      bolsa: v.bolsa,
      beneficios: v.beneficios,
      horas_dia: v.horasDia || 6,
      horas_semana: v.horasSemana || 30,
      carga_horaria: v.cargaHoraria,
      turno: v.turno,
      modalidade: v.modalidade,
      local: v.local,
      cidade: v.cidade || 'Cuiabá/MT',
      qtd_vagas: v.qtdVagas || 1,
      prazo: v.prazo,
      forma_candidatura: v.formaCandidatura || 'Pelo sistema',
      contato_externo: v.contatoExterno || '',
      confidencial: !!v.confidencial
    };
    this.abaAtiva.set('nova-vaga');
  }

  ehEstagio(): boolean {
    return (this.formVaga.tipo || '').toLowerCase().includes('estágio');
  }

  aoMudarTipoVaga(tipo: string) {
    if (tipo.toLowerCase().includes('estágio')) {
      if (this.formVaga.horas_dia > 6) this.formVaga.horas_dia = 6;
      if (this.formVaga.horas_semana > 30) this.formVaga.horas_semana = 30;
      this.atualizarTextoCargaHoraria();
    }
  }

  atualizarTextoCargaHoraria() {
    this.formVaga.carga_horaria = `${this.formVaga.horas_dia}h/dia, ${this.formVaga.horas_semana}h/semana`;
  }

  cursoSelecionado(id: number): boolean {
    return (this.formVaga.cursos || []).includes(id);
  }

  alternarCursoVaga(id: number) {
    const arr: number[] = this.formVaga.cursos || [];
    if (arr.includes(id)) {
      this.formVaga.cursos = arr.filter((x) => x !== id);
    } else {
      this.formVaga.cursos = [...arr, id];
    }
  }

  submeterVaga(rascunho: boolean) {
    const payload = { ...this.formVaga, rascunho };
    const obs = this.vagaEditandoId()
      ? this.api.editarVagaEmpresa(this.vagaEditandoId()!, payload)
      : this.api.criarVagaEmpresa(payload);

    obs.subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem, false);
        this.carregarDashboard();
        this.abaAtiva.set('vagas');
      },
      error: (err) => {
        this.mostrarFeedback(err?.error?.mensagem || 'Verifique os campos obrigatórios e a Lei do Estágio.', true);
      }
    });
  }

  duplicarVaga(vagaId: number) {
    this.api.duplicarVagaEmpresa(vagaId).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem, false);
        this.carregarDashboard();
      }
    });
  }

  verCandidatosDaVaga(v: any) {
    this.vagaSelecionadaCandidatosId = v.id;
    this.carregarCandidatosDaVaga(v.id);
    this.abaAtiva.set('candidatos');
  }

  iniciarEncerramentoVaga(v: any) {
    this.vagaEncerrando.set(v);
    this.vagaSelecionadaCandidatosId = v.id;
    this.carregarCandidatosDaVaga(v.id);
    this.abaAtiva.set('candidatos');
  }

  confirmarEncerramentoComContratados() {
    const v = this.vagaEncerrando();
    if (!v) return;
    this.api.encerrarVagaEmpresa(v.id, this.selecionadosLote()).subscribe({
      next: (res) => {
        this.vagaEncerrando.set(null);
        this.mostrarFeedback(res.mensagem, false);
        this.carregarDashboard();
        this.abaAtiva.set('vagas');
      }
    });
  }

  carregarCandidatosDaVaga(vagaId: number) {
    if (!vagaId) return;
    this.selecionadosLote.set([]);
    this.api.listarCandidatosDaVaga(vagaId).subscribe({
      next: (lista) => this.candidatos.set(lista),
      error: () => this.candidatos.set([])
    });
  }

  estaSelecionadoNoLote(candId: number): boolean {
    return this.selecionadosLote().includes(candId);
  }

  alternarSelecaoLote(candId: number) {
    const atual = this.selecionadosLote();
    if (atual.includes(candId)) {
      this.selecionadosLote.set(atual.filter((x) => x !== candId));
    } else {
      this.selecionadosLote.set([...atual, candId]);
    }
  }

  aplicarMudancaEmLote() {
    if (this.selecionadosLote().length === 0) {
      this.mostrarFeedback('Selecione pelo menos um candidato na lista para alterar o status em lote.', true);
      return;
    }
    this.api.atualizarStatusCandidatosLote({
      candidaturaIds: this.selecionadosLote(),
      status: this.novoStatusLote,
      contratado: this.novoStatusLote === 'aprovado'
    }).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem, false);
        this.carregarCandidatosDaVaga(this.vagaSelecionadaCandidatosId);
        this.carregarDashboard();
      }
    });
  }

  mudarStatusIndividual(c: any, status: string) {
    this.api.atualizarStatusCandidatosLote({
      candidaturaIds: [c.candidaturaId],
      status,
      observacaoEmpresa: c.observacaoEmpresa || '',
      contratado: status === 'aprovado'
    }).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem, false);
        this.carregarCandidatosDaVaga(this.vagaSelecionadaCandidatosId);
        this.carregarDashboard();
      }
    });
  }

  baixarPdfCandidato(alunoId: number, pdfNome: string) {
    this.api.baixarCurriculoPdf(alunoId).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfNome || `curriculo_aluno_${alunoId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  salvarDadosEmpresa() {
    this.api.atualizarDadosEmpresa(this.formEmpresa).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem, false);
        this.carregarDashboard();
      }
    });
  }

  adicionarRecrutador() {
    this.api.adicionarUsuarioEmpresa(this.novoRecrutador).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem, false);
        this.novoRecrutador = { nome: '', cargo: 'Recrutador(a)', login: '', email: '', senha: '' };
        this.carregarDashboard();
      },
      error: (err) => this.mostrarFeedback(err?.error?.mensagem || 'Erro ao adicionar recrutador.', true)
    });
  }

  corStatusVaga(st: string): string {
    switch (st) {
      case 'publicada': return 'bg-emerald-100 text-emerald-800';
      case 'aguardando_aprovacao': return 'bg-amber-100 text-amber-800';
      case 'ajuste_solicitado': return 'bg-orange-100 text-orange-800';
      case 'rascunho': return 'bg-blue-50 text-[#1C4587]';
      default: return 'bg-gray-200 text-gray-700';
    }
  }

  private mostrarFeedback(msg: string, erro: boolean) {
    this.feedbackMsg.set(msg);
    this.feedbackErro.set(erro);
    setTimeout(() => this.feedbackMsg.set(null), 6000);
  }
}
