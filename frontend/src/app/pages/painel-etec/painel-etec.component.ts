import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

import { GestaoInstitucionalComponent } from '../../components/gestao-institucional.component';

type AbaEtec = 'fila' | 'empresas' | 'vagas' | 'alunos' | 'estagios' | 'relatorios' | 'institucional' | 'configuracoes';

@Component({
  selector: 'app-painel-etec',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, GestaoInstitucionalComponent],
  template: `
    <div class="bg-muted/40 min-h-screen pb-16">
      <!-- Topo Institucional do Painel da ETEC -->
      <div class="bg-[#0f2a52] text-white py-8 border-b border-white/10">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Perfil Institucional: {{ auth.usuario()?.perfil }}
              </span>
              <span class="text-xs text-white/70">Sessão de alta segurança (expira em 30 min sem uso)</span>
            </div>
            <h1 class="font-heading font-bold text-2xl sm:text-3xl">
              Painel da Coordenação de Estágio &amp; Administração ETEC Cuiabá
            </h1>
            <p class="text-sm text-white/80 mt-0.5">
              {{ auth.usuario()?.nome }} ({{ auth.usuario()?.email }}) · SECITECI / Governo de Mato Grosso
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" (click)="exportarRelatorioPdf()" class="btn bg-white text-[#1C4587] hover:bg-white/90 text-xs py-2 px-3">
              📄 Exportar Relatório PDF
            </button>
            <button type="button" (click)="exportarRelatorioCsv()" class="btn bg-[#1E7F4A] text-white hover:bg-[#17643a] text-xs py-2 px-3">
              📊 Exportar Planilha (CSV/Excel)
            </button>
          </div>
        </div>
      </div>

      <!-- Menu das 7 Telas do Painel da ETEC (Fila de aprovação, Empresas, Vagas, Alunos, Estágios, Relatórios, Configurações) -->
      <div class="bg-white border-b border-border sticky top-12 z-30">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto">
          @for (item of abas; track item.id) {
            <button
              type="button"
              (click)="abaAtiva.set(item.id)"
              class="whitespace-nowrap px-4 py-3.5 text-sm font-semibold border-b-[3px] transition-colors flex items-center gap-1.5"
              [ngClass]="abaAtiva() === item.id ? 'border-[#1C4587] text-[#1C4587]' : 'border-transparent text-muted-foreground hover:text-foreground'"
            >
              <span>{{ item.label }}</span>
              @if (item.id === 'fila' && totalPendentesFila() > 0) {
                <span class="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                  {{ totalPendentesFila() }}
                </span>
              }
            </button>
          }
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        @if (feedbackMsg()) {
          <div class="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 font-medium">
            {{ feedbackMsg() }}
          </div>
        }

        <!-- 1. TELA: FILA DE APROVAÇÃO (Empresas pendentes, Vagas pendentes e Denúncias) -->
        @if (abaAtiva() === 'fila') {
          <div class="space-y-8">
            <!-- Empresas Pendentes -->
            <div class="bg-white border border-border rounded-xl p-6 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <span class="eyebrow">PONTO DE APROVAÇÃO #1</span>
                  <h2 class="font-heading font-bold text-xl">
                    Empresas Aguardando Aprovação ({{ empresasPendentes().length }})
                  </h2>
                </div>
              </div>

              @if (empresasPendentes().length === 0) {
                <p class="text-sm text-muted-foreground">Nenhuma empresa aguardando na fila no momento.</p>
              } @else {
                <div class="space-y-4">
                  @for (e of empresasPendentes(); track e.id) {
                    <div class="p-5 rounded-xl border border-amber-300 bg-amber-50/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="badge bg-amber-200 text-amber-900">Pendente</span>
                          <span class="text-xs font-bold text-[#1C4587]">CNPJ: {{ e.cnpj }}</span>
                        </div>
                        <h3 class="font-heading font-bold text-lg mt-1">{{ e.nomeFantasia }} ({{ e.razaoSocial }})</h3>
                        <p class="text-xs text-muted-foreground mt-0.5">
                          Setor: {{ e.setor }} · Endereço: {{ e.endereco }} ({{ e.cidade }})
                        </p>
                        <p class="text-xs text-foreground mt-1">
                          Responsável: <strong>{{ e.responsavel }}</strong> · 📞 {{ e.telefone }} · ✉️ {{ e.emailContato }}
                        </p>
                      </div>

                      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                        <input
                          type="text"
                          [(ngModel)]="motivoEmpresa[e.id]"
                          placeholder="Motivo (se recusar/bloquear)..."
                          class="field text-xs py-2 sm:w-52"
                        />
                        <button type="button" (click)="moderarEmpresa(e.id, 'aprovar')" class="btn-verde text-xs py-2 px-4">
                          ✓ Aprovar Empresa
                        </button>
                        <button type="button" (click)="moderarEmpresa(e.id, 'recusar')" class="btn-outline text-xs py-2 px-3 text-red-700 border-red-200">
                          Recusar
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Vagas Pendentes -->
            <div class="bg-white border border-border rounded-xl p-6 shadow-sm">
              <div class="mb-4">
                <span class="eyebrow">PONTO DE APROVAÇÃO #2</span>
                <h2 class="font-heading font-bold text-xl">
                  Vagas Aguardando Aprovação ({{ vagasPendentes().length }})
                </h2>
              </div>

              @if (vagasPendentes().length === 0) {
                <p class="text-sm text-muted-foreground">Nenhuma vaga pendente na fila.</p>
              } @else {
                <div class="space-y-4">
                  @for (v of vagasPendentes(); track v.id) {
                    <div class="p-5 rounded-xl border border-[#1C4587]/25 bg-[#1C4587]/[0.02] space-y-3">
                      <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div class="flex flex-wrap items-center gap-2 mb-1">
                            <span class="badge bg-amber-100 text-amber-800">Aguardando Aprovação</span>
                            <span class="badge bg-[#1C4587]/10 text-[#1C4587]">{{ v.tipo }}</span>
                            @if (v.confidencial) {
                              <span class="badge bg-purple-100 text-[#5C2D91]">Confidencial ao público (Visível para ETEC: {{ v.empresaRealNome }})</span>
                            }
                          </div>
                          <h3 class="font-heading font-bold text-xl">{{ v.titulo }}</h3>
                          <p class="text-sm font-semibold text-foreground/80">
                            🏢 Empresa Real: {{ v.empresaRealNome }} (CNPJ {{ v.empresaCnpj }}) · 💰 {{ v.bolsa }} · ⏱️ {{ v.cargaHoraria }} ({{ v.turno }})
                          </p>
                          <div class="mt-2 flex flex-wrap gap-1.5">
                            @for (c of v.cursos; track c.id) {
                              <span class="text-xs px-2 py-0.5 rounded bg-white border border-border font-semibold text-[#1C4587]">
                                🎓 {{ c.nome }} (Mód. mín. {{ c.moduloMinimo }}º)
                              </span>
                            }
                          </div>
                        </div>
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs p-3 rounded-lg bg-white border border-border">
                        <div>
                          <strong class="block text-foreground">Atividades:</strong>
                          <p class="text-muted-foreground">{{ v.atividades }}</p>
                        </div>
                        <div>
                          <strong class="block text-foreground">Requisitos e Benefícios:</strong>
                          <p class="text-muted-foreground">{{ v.requisitos }} | Benefícios: {{ v.beneficios }}</p>
                        </div>
                      </div>

                      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                        <input
                          type="text"
                          [(ngModel)]="motivoVaga[v.id]"
                          placeholder="Escreva o motivo caso peça ajuste ou recuse..."
                          class="field text-xs py-2 sm:w-80"
                        />
                        <button type="button" (click)="moderarVaga(v.id, 'aprovar')" class="btn-verde text-xs py-2 px-4">
                          ✓ Aprovar e Publicar (Avisa Alunos)
                        </button>
                        <button type="button" (click)="moderarVaga(v.id, 'pedir_ajuste')" class="btn bg-amber-600 text-white hover:bg-amber-700 text-xs py-2 px-3">
                          Pedir Ajuste à Empresa
                        </button>
                        <button type="button" (click)="moderarVaga(v.id, 'recusar')" class="btn bg-red-600 text-white hover:bg-red-700 text-xs py-2 px-3">
                          Recusar Vaga
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Denúncias Recebidas na Fila da Coordenação -->
            <div class="bg-white border border-border rounded-xl p-6 shadow-sm">
              <span class="eyebrow">MÓDULO 6 · SEGURANÇA DO PORTAL</span>
              <h2 class="font-heading font-bold text-xl mb-4">Denúncias de Vagas ({{ denuncias().length }})</h2>
              @for (d of denuncias(); track d.id) {
                <div class="p-4 rounded-xl border border-border mb-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="badge" [ngClass]="d.situacao === 'pendente' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-800'">
                        {{ d.situacao.toUpperCase() }}
                      </span>
                      <span class="text-xs text-muted-foreground">{{ d.data }} · Denunciante: {{ d.denuncianteNome }}</span>
                    </div>
                    <h3 class="font-bold text-base mt-1">Vaga #{{ d.vagaId }}: {{ d.vagaTitulo }} (Empresa: {{ d.empresaNome }})</h3>
                    <p class="text-sm text-red-900 font-medium">Motivo: {{ d.motivo }}</p>
                    <p class="text-xs text-muted-foreground">{{ d.descricao }}</p>
                  </div>
                  @if (d.situacao === 'pendente') {
                    <div class="flex flex-wrap items-center gap-2 shrink-0">
                      <button type="button" (click)="resolverDenuncia(d.id, 'arquivada', false)" class="btn-outline text-xs py-1.5 px-3">
                        Improcedente / Arquivar
                      </button>
                      <button type="button" (click)="resolverDenuncia(d.id, 'procedente_bloqueada', true)" class="btn bg-red-600 text-white hover:bg-red-700 text-xs py-1.5 px-3">
                        Procedente: Remover Vaga e Bloquear Empresa
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- 2. TELA: EMPRESAS (Ver, editar, bloquear — Regra #9 tira todas as vagas do ar na hora — histórico) -->
        @if (abaAtiva() === 'empresas') {
          <div class="bg-white border border-border rounded-xl p-6 shadow-sm">
            <h2 class="font-heading font-bold text-2xl mb-4">Gestão de Empresas Parceiras ({{ empresas().length }})</h2>
            <div class="divide-y divide-border">
              @for (e of empresas(); track e.id) {
                <div class="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="font-heading font-bold text-lg">{{ e.nomeFantasia }}</h3>
                      <span class="badge"
                            [ngClass]="e.status === 'aprovada' ? 'bg-emerald-100 text-emerald-800' : e.status === 'bloqueada' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'">
                        {{ e.status.toUpperCase() }}
                      </span>
                      <span class="text-xs text-muted-foreground">CNPJ {{ e.cnpj }}</span>
                    </div>
                    <p class="text-xs text-muted-foreground mt-0.5">
                      {{ e.razaoSocial }} · {{ e.setor }} · {{ e.endereco }} ({{ e.cidade }})
                    </p>
                    <p class="text-xs text-foreground mt-1">
                      Responsável: {{ e.responsavel }} · {{ e.telefone }} · {{ e.emailContato }} ·
                      <strong>Histórico: {{ e.totalVagas }} vagas | {{ e.totalDenuncias }} denúncias</strong>
                    </p>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 shrink-0">
                    @if (e.status !== 'aprovada') {
                      <button type="button" (click)="moderarEmpresa(e.id, 'aprovar')" class="btn-verde text-xs py-1.5 px-3">
                        Aprovar / Desbloquear
                      </button>
                    }
                    @if (e.status !== 'bloqueada') {
                      <button type="button" (click)="moderarEmpresa(e.id, 'bloquear')" class="btn bg-red-600 text-white hover:bg-red-700 text-xs py-1.5 px-3">
                        🚫 Bloquear Empresa (Tira vagas do ar na hora)
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- 3. TELA: VAGAS (Editar, encerrar, destacar na Home + Cadastro direto pela Coordenação Fase 1 MVP) -->
        @if (abaAtiva() === 'vagas') {
          <div class="space-y-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 class="font-heading font-bold text-2xl">Todas as Vagas do Sistema ({{ vagas().length }})</h2>
              <button type="button" (click)="mostrarFormVagaDireta.set(!mostrarFormVagaDireta())" class="btn-verde text-sm">
                {{ mostrarFormVagaDireta() ? 'Fechar formulário' : '+ Cadastrar e Publicar Vaga Direta (Recebida por E-mail/WhatsApp)' }}
              </button>
            </div>

            @if (mostrarFormVagaDireta()) {
              <div class="bg-white border-2 border-[#1C4587] rounded-xl p-6 space-y-4">
                <h3 class="font-heading font-bold text-xl text-[#1C4587]">
                  Publicação Direta pela Coordenação de Estágio (Mural Moderado)
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-semibold uppercase mb-1">Empresa Parceira *</label>
                    <select [(ngModel)]="vagaDireta.empresa_id" class="field text-sm">
                      @for (e of empresas(); track e.id) {
                        <option [ngValue]="e.id">{{ e.nomeFantasia }} ({{ e.cnpj }})</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold uppercase mb-1">Título da Vaga *</label>
                    <input type="text" [(ngModel)]="vagaDireta.titulo" placeholder="Ex: Estágio Técnico em Redes" class="field text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold uppercase mb-1">Tipo *</label>
                    <select [(ngModel)]="vagaDireta.tipo" class="field text-sm">
                      <option value="Estágio não obrigatório">Estágio não obrigatório</option>
                      <option value="Estágio obrigatório">Estágio obrigatório</option>
                      <option value="CLT">CLT</option>
                      <option value="Jovem aprendiz">Jovem aprendiz</option>
                    </select>
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label class="block text-xs font-semibold uppercase mb-1">Curso Técnico *</label>
                    <select [(ngModel)]="vagaDireta.cursoUnicoId" class="field text-sm">
                      @for (c of cursos(); track c.id) {
                        <option [ngValue]="c.id">{{ c.nome }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold uppercase mb-1">Bolsa / Salário *</label>
                    <input type="text" [(ngModel)]="vagaDireta.bolsa" class="field text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold uppercase mb-1">Carga Horária (Lei 11.788) *</label>
                    <input type="text" [(ngModel)]="vagaDireta.carga_horaria" class="field text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold uppercase mb-1">Prazo (máx 60 dias) *</label>
                    <input type="date" [(ngModel)]="vagaDireta.prazo" class="field text-sm" />
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <textarea rows="2" [(ngModel)]="vagaDireta.atividades" placeholder="Atividades da vaga *" class="field text-sm"></textarea>
                  <textarea rows="2" [(ngModel)]="vagaDireta.requisitos" placeholder="Requisitos da vaga *" class="field text-sm"></textarea>
                </div>
                <div class="flex justify-end">
                  <button type="button" (click)="publicarVagaDireta()" class="btn-primary text-sm">
                    Publicar Vaga no Mural Agora
                  </button>
                </div>
              </div>
            }

            <div class="bg-white border border-border rounded-xl divide-y divide-border">
              @for (v of vagas(); track v.id) {
                <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                      <span class="badge bg-[#1C4587]/10 text-[#1C4587]">{{ v.status.toUpperCase() }}</span>
                      <span class="badge bg-muted text-foreground">{{ v.tipo }}</span>
                      @if (v.destaque) {
                        <span class="badge bg-amber-100 text-amber-900">★ Destaque na Home</span>
                      }
                      @if (v.confidencial) {
                        <span class="badge bg-purple-100 text-[#5C2D91]">Confidencial ao público</span>
                      }
                    </div>
                    <h3 class="font-heading font-bold text-lg">
                      <a [routerLink]="['/vagas', v.id]" class="hover:text-[#1C4587]">#{{ v.id }} — {{ v.titulo }}</a>
                    </h3>
                    <p class="text-xs text-muted-foreground">
                      Empresa Real (visível à ETEC): <strong>{{ v.empresaRealNome }}</strong> · {{ v.bolsa }} · {{ v.cargaHoraria }} · Prazo {{ v.prazo }} · {{ v.totalCandidatos }} candidato(s)
                    </p>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      (click)="moderarVaga(v.id, 'destacar')"
                      class="btn-outline text-xs py-1.5 px-3"
                    >
                      {{ v.destaque ? '☆ Remover destaque Home' : '★ Destacar na Home' }}
                    </button>
                    @if (v.status !== 'publicada') {
                      <button type="button" (click)="moderarVaga(v.id, 'aprovar')" class="btn-verde text-xs py-1.5 px-3">
                        Publicar
                      </button>
                    }
                    @if (v.status === 'publicada') {
                      <button type="button" (click)="moderarVaga(v.id, 'encerrar')" class="px-3 py-1.5 rounded border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50">
                        Encerrar Vaga
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- 4. TELA: ALUNOS (Importar lista da Secretaria via planilha CSV e marcar egressos) -->
        @if (abaAtiva() === 'alunos') {
          <div class="space-y-6">
            <!-- Importador de Planilha da Secretaria -->
            <div class="bg-white border border-border rounded-xl p-6 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="eyebrow">INTEGRAÇÃO COM O SISTEMA DA SECRETARIA</span>
                  <h2 class="font-heading font-bold text-xl">Importar Lista de Alunos Ativos e Egressos (Planilha CSV)</h2>
                  <p class="text-xs text-muted-foreground">
                    Formato: <code>matricula;cpf;nome;email_secretaria;curso_id;modulo;turno;data_nasc;egresso</code>
                  </p>
                </div>
                <button type="button" (click)="preencherCsvExemplo()" class="btn-outline text-xs py-1.5 px-3">
                  Carregar linhas de exemplo da Secretaria
                </button>
              </div>
              <textarea
                rows="3"
                [(ngModel)]="csvSecretaria"
                placeholder="2026301;77788899900;Ana Clara Souza;anaclara@aluno.etec.mt.gov.br;2;2;Manhã;2007-04-12;0"
                class="field font-mono text-xs"
              ></textarea>
              <div class="flex justify-end">
                <button type="button" (click)="importarPlanilhaSecretaria()" class="btn-primary text-sm">
                  📥 Importar Alunos da Secretaria
                </button>
              </div>
            </div>

            <!-- Lista de Alunos com Conta Ativa e Alternância de Egresso -->
            <div class="bg-white border border-border rounded-xl p-6">
              <h3 class="font-heading font-bold text-xl mb-4">Alunos e Egressos Cadastrados no Portal ({{ alunos().length }})</h3>
              <div class="divide-y divide-border">
                @for (a of alunos(); track a.id) {
                  <div class="py-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2">
                        <strong class="text-base">{{ a.nome }}</strong>
                        <span class="badge" [ngClass]="a.egresso ? 'bg-purple-100 text-[#5C2D91]' : 'bg-emerald-100 text-emerald-800'">
                          {{ a.egresso ? 'Egresso (Formado)' : 'Aluno Matriculado' }}
                        </span>
                        @if (a.menorDeIdade) {
                          <span class="badge bg-amber-100 text-amber-800">{{ a.idade }} anos (Menor &lt;18)</span>
                        }
                      </div>
                      <p class="text-xs text-muted-foreground mt-0.5">
                        Matrícula {{ a.matricula }} · CPF {{ a.cpf }} · 🎓 {{ a.cursoNome }} ({{ a.modulo }}º mód. · {{ a.turno }}) · {{ a.totalCandidaturas }} candidatura(s)
                      </p>
                    </div>
                    <button
                      type="button"
                      (click)="alternarEgresso(a.id)"
                      class="btn-outline text-xs py-1.5 px-3"
                    >
                      {{ a.egresso ? 'Reativar como Aluno Matriculado' : '🎓 Marcar como Egresso (Formado)' }}
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- Base Oficial da Secretaria (para conferência de Primeiro Acesso) -->
            <div class="bg-white border border-border rounded-xl p-6">
              <h3 class="font-heading font-bold text-lg mb-3">Base da Secretaria ETEC ({{ baseSecretaria().length }} matrículas)</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="border-b border-border text-muted-foreground uppercase">
                      <th class="py-2">Matrícula</th>
                      <th class="py-2">CPF</th>
                      <th class="py-2">Nome do Aluno</th>
                      <th class="py-2">Curso Técnico</th>
                      <th class="py-2">Módulo/Turno</th>
                      <th class="py-2">Primeiro Acesso</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    @for (s of baseSecretaria(); track s.matricula) {
                      <tr>
                        <td class="py-2 font-mono font-bold">{{ s.matricula }}</td>
                        <td class="py-2 font-mono">{{ s.cpf }}</td>
                        <td class="py-2 font-semibold">{{ s.nome }}</td>
                        <td class="py-2">{{ s.cursoNome }}</td>
                        <td class="py-2">{{ s.modulo }}º mód · {{ s.turno }}</td>
                        <td class="py-2">
                          <span class="badge" [ngClass]="s.contaAtivada ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'">
                            {{ s.contaAtivada ? 'Conta Ativada' : 'Aguardando 1º Acesso' }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- 5. TELA: ESTÁGIOS (Gerar Termo de Compromisso em PDF, registrar assinaturas e relatórios semestrais) -->
        @if (abaAtiva() === 'estagios') {
          <div class="space-y-4">
            <div>
              <span class="eyebrow">FASE 3 · GESTÃO DE ESTÁGIO (LEI FEDERAL Nº 11.788/2008)</span>
              <h2 class="font-heading font-bold text-2xl">
                Termos de Compromisso de Estágio, Assinaturas e Relatórios Semestrais
              </h2>
            </div>

            @for (es of estagios(); track es.id) {
              <div class="bg-white border border-border rounded-xl p-6 shadow-sm space-y-4">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                      <span class="badge bg-[#1C4587]/10 text-[#1C4587]">Estágio #{{ es.id }}</span>
                      <span class="badge"
                            [ngClass]="es.situacao === 'ativo' ? 'bg-emerald-100 text-emerald-800' : es.situacao === 'concluido' ? 'bg-blue-100 text-[#1C4587]' : 'bg-amber-100 text-amber-800'">
                        Situação: {{ es.situacao.toUpperCase().replace('_', ' ') }}
                      </span>
                      @if (es.menorDeIdade) {
                        <span class="badge bg-amber-100 text-amber-900">
                          ⚠️ Menor de 18 anos ({{ es.idade }} anos) — Exige assinatura do Responsável Legal ({{ es.responsavelNome }})
                        </span>
                      }
                    </div>
                    <h3 class="font-heading font-bold text-xl">{{ es.alunoNome }} (Matrícula {{ es.matricula }})</h3>
                    <p class="text-sm text-muted-foreground">
                      🎓 {{ es.cursoNome }} ({{ es.modulo }}º mód. · {{ es.turno }}) · 🏢 {{ es.empresaNome }} (CNPJ {{ es.empresaCnpj }})
                    </p>
                    <p class="text-xs text-foreground mt-1">
                      Vaga: <strong>{{ es.vagaTitulo }}</strong> · Jornada validada: <strong>{{ es.cargaHoraria }}</strong> · Bolsa: {{ es.bolsa }} · Vigência: {{ es.dataInicio }} a {{ es.dataFim }}
                    </p>
                  </div>

                  <button type="button" (click)="baixarTermoPdf(es.id)" class="btn-verde text-xs py-2.5 px-4">
                    📄 Gerar / Baixar Termo de Compromisso (PDF)
                  </button>
                </div>

                <!-- Controle de Assinaturas e Relatório Semestral -->
                <div class="p-4 rounded-xl bg-muted/60 border border-border grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  <div class="lg:col-span-7 flex flex-wrap items-center gap-4 text-xs font-semibold">
                    <span class="uppercase text-muted-foreground">Assinaturas do Termo:</span>
                    <label class="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" [(ngModel)]="es.assAluno" />
                      <span>1. Aluno(a)</span>
                    </label>
                    @if (es.menorDeIdade) {
                      <label class="flex items-center gap-1.5 cursor-pointer text-amber-900">
                        <input type="checkbox" [(ngModel)]="es.assResponsavel" />
                        <span>2. Responsável Legal (&lt;18)</span>
                      </label>
                    }
                    <label class="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" [(ngModel)]="es.assEmpresa" />
                      <span>3. Empresa Concedente</span>
                    </label>
                    <label class="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" [(ngModel)]="es.assEtec" />
                      <span>4. Coordenação ETEC</span>
                    </label>
                  </div>

                  <div class="lg:col-span-5 flex flex-wrap items-center justify-end gap-2">
                    <select [(ngModel)]="es.relatorioSemestralStatus" class="field py-1.5 px-2 text-xs w-44">
                      <option value="em_dia">Relatório 6 meses: Em dia</option>
                      <option value="pendente">Relatório 6 meses: Pendente</option>
                      <option value="entregue">Relatório 6 meses: Entregue</option>
                    </select>
                    <select [(ngModel)]="es.situacao" class="field py-1.5 px-2 text-xs w-36">
                      <option value="termo_pendente">Termo Pendente</option>
                      <option value="ativo">Estágio Ativo</option>
                      <option value="concluido">Concluído</option>
                    </select>
                    <button type="button" (click)="salvarEstagio(es)" class="btn-primary text-xs py-1.5 px-3">
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- 6. TELA: RELATÓRIOS E INDICADORES (Os 8 indicadores oficiais para prestação de contas à SECITECI) -->
        @if (abaAtiva() === 'relatorios') {
          <div class="space-y-6">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span class="eyebrow">PRESTAÇÃO DE CONTAS SECITECI / GOVERNO DE MATO GROSSO</span>
                <h2 class="font-heading font-bold text-2xl">Painel de Empregabilidade e Indicadores Oficiais</h2>
              </div>
              <div class="flex gap-2">
                <button type="button" (click)="exportarRelatorioCsv()" class="btn-outline text-xs py-2 px-3">
                  📊 Exportar Excel / CSV
                </button>
                <button type="button" (click)="exportarRelatorioPdf()" class="btn-primary text-xs py-2 px-3">
                  📄 Exportar Relatório PDF
                </button>
              </div>
            </div>

            <!-- 8 Cards dos Indicadores da Tabela de Relatórios -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="bg-white border border-border rounded-xl p-5">
                <span class="text-xs text-muted-foreground font-semibold uppercase">1. Vagas Abertas / Publicadas</span>
                <p class="text-3xl font-bold text-[#1C4587] mt-1">{{ relatorios()?.resumo?.vagasAbertas }} / {{ relatorios()?.resumo?.vagasPublicadas }}</p>
                <span class="text-xs text-muted-foreground">Procura do mercado por curso</span>
              </div>
              <div class="bg-white border border-border rounded-xl p-5">
                <span class="text-xs text-muted-foreground font-semibold uppercase">2. Candidaturas por Vaga</span>
                <p class="text-3xl font-bold text-[#2E6DA4] mt-1">{{ relatorios()?.resumo?.totalCandidaturas }}</p>
                <span class="text-xs text-muted-foreground">Participação discente ativa</span>
              </div>
              <div class="bg-white border-2 border-[#1E7F4A] rounded-xl p-5">
                <span class="text-xs text-[#1E7F4A] font-bold uppercase">3. Alunos Contratados (Empregabilidade)</span>
                <p class="text-3xl font-bold text-[#1E7F4A] mt-1">{{ relatorios()?.resumo?.alunosContratados }}</p>
                <span class="text-xs text-muted-foreground">Indicador principal SECITECI</span>
              </div>
              <div class="bg-white border border-border rounded-xl p-5">
                <span class="text-xs text-muted-foreground font-semibold uppercase">4. Taxa de Preenchimento</span>
                <p class="text-3xl font-bold text-[#5C2D91] mt-1">{{ relatorios()?.resumo?.taxaPreenchimento }}%</p>
                <span class="text-xs text-muted-foreground">Vagas preenchidas ÷ publicadas</span>
              </div>
              <div class="bg-white border border-border rounded-xl p-5">
                <span class="text-xs text-muted-foreground font-semibold uppercase">5. Tempo Médio até Aprovação</span>
                <p class="text-3xl font-bold text-foreground mt-1">{{ relatorios()?.resumo?.tempoMedioAprovacaoHoras }}h</p>
                <span class="text-xs text-muted-foreground">Agilidade da fila da Coordenação</span>
              </div>
              <div class="bg-white border border-border rounded-xl p-5">
                <span class="text-xs text-muted-foreground font-semibold uppercase">6. Empresas Parceiras Ativas</span>
                <p class="text-3xl font-bold text-[#1C4587] mt-1">{{ relatorios()?.resumo?.empresasAtivas }}</p>
                <span class="text-xs text-muted-foreground">Relação com o mercado de Cuiabá</span>
              </div>
              <div class="bg-white border border-border rounded-xl p-5">
                <span class="text-xs text-muted-foreground font-semibold uppercase">7. Estágios Ativos / Termos</span>
                <p class="text-3xl font-bold text-[#1E7F4A] mt-1">{{ relatorios()?.resumo?.estagiosAtivos }} <span class="text-sm font-normal text-muted-foreground">({{ relatorios()?.resumo?.termosPendentes }} pend.)</span></p>
                <span class="text-xs text-muted-foreground">Controle da Coordenação</span>
              </div>
              <div class="bg-white border border-border rounded-xl p-5">
                <span class="text-xs text-muted-foreground font-semibold uppercase">8. Denúncias Registradas</span>
                <p class="text-3xl font-bold text-amber-700 mt-1">{{ relatorios()?.resumo?.totalDenuncias }}</p>
                <span class="text-xs text-muted-foreground">Segurança e conformidade</span>
              </div>
            </div>

            <!-- Tabela de Empregabilidade por Curso Técnico -->
            <div class="bg-white border border-border rounded-xl p-6">
              <h3 class="font-heading font-bold text-xl mb-4">Recorte por Curso Técnico e Eixo Tecnológico</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead>
                    <tr class="border-b border-border text-xs uppercase text-muted-foreground">
                      <th class="py-2.5">Curso Técnico ETEC Cuiabá</th>
                      <th class="py-2.5">Eixo Tecnológico</th>
                      <th class="py-2.5">Vagas Abertas</th>
                      <th class="py-2.5">Candidaturas</th>
                      <th class="py-2.5">Alunos Contratados</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    @for (c of relatorios()?.porCurso; track c.curso) {
                      <tr>
                        <td class="py-3 font-semibold text-foreground">{{ c.curso }}</td>
                        <td class="py-3 text-muted-foreground">{{ c.eixo }}</td>
                        <td class="py-3 font-bold text-[#1C4587]">{{ c.vagas }}</td>
                        <td class="py-3">{{ c.candidaturas }}</td>
                        <td class="py-3">
                          <span class="badge bg-emerald-100 text-emerald-800 font-bold">{{ c.contratados }} contratado(s)</span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- 8. TELA: SITE INSTITUCIONAL (notícias, editais, agenda e Fale conosco) -->
        @if (abaAtiva() === 'institucional') {
          <app-gestao-institucional></app-gestao-institucional>
        }

        <!-- 7. TELA: CONFIGURAÇÕES E LOGS DE AUDITORIA (Administrador TI) -->
        @if (abaAtiva() === 'configuracoes') {
          <div class="space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <!-- Backup Seguro SQLite e Parâmetros -->
              <div class="lg:col-span-6 bg-white border border-border rounded-xl p-6 space-y-4">
                <span class="eyebrow">CUIDADOS COM O SQLITE (WAL + BACKUP SEGURO)</span>
                <h2 class="font-heading font-bold text-xl">Banco de Dados SQLite &amp; Parâmetros</h2>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  O banco roda em arquivo único com <code>PRAGMA journal_mode=WAL</code> e <code>busy_timeout=5000</code>.
                  O botão abaixo executa o comando nativo <code>VACUUM INTO</code> do SQLite para gerar uma cópia íntegra com o sistema no ar.
                </p>
                <button type="button" (click)="executarBackupSqlite()" class="btn-primary text-sm">
                  💾 Executar Backup Diário Seguro do SQLite Agora
                </button>
                <div class="divide-y divide-border pt-2 text-xs">
                  @for (cfg of configuracoes(); track cfg.chave) {
                    <div class="py-2 flex items-center justify-between gap-2">
                      <span class="text-muted-foreground">{{ cfg.descricao }}</span>
                      <code class="font-bold text-[#1C4587] bg-muted px-2 py-0.5 rounded">{{ cfg.valor }}</code>
                    </div>
                  }
                </div>
              </div>

              <!-- Adicionar Novo Curso Técnico -->
              <div class="lg:col-span-6 bg-white border border-border rounded-xl p-6 space-y-3">
                <span class="eyebrow">GESTÃO ACADÊMICA</span>
                <h2 class="font-heading font-bold text-xl">Cadastrar Novo Curso Técnico da ETEC</h2>
                <div>
                  <label class="block text-xs font-semibold uppercase mb-1">Nome do Curso Técnico</label>
                  <input type="text" [(ngModel)]="novoCurso.nome" placeholder="Ex: Técnico em Eletrotécnica" class="field text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase mb-1">Eixo Tecnológico</label>
                  <input type="text" [(ngModel)]="novoCurso.eixo" placeholder="Ex: Controle e Processos Industriais" class="field text-sm" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold uppercase mb-1">Duração (Módulos)</label>
                    <input type="number" [(ngModel)]="novoCurso.duracao_modulos" class="field text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold uppercase mb-1">Turno Padrão</label>
                    <select [(ngModel)]="novoCurso.turno_padrao" class="field text-sm">
                      <option value="Manhã">Manhã</option>
                      <option value="Tarde">Tarde</option>
                      <option value="Noite">Noite</option>
                    </select>
                  </div>
                </div>
                <button type="button" (click)="salvarNovoCurso()" class="btn-verde text-sm">
                  + Cadastrar Curso Técnico
                </button>
              </div>
            </div>

            <!-- Log de Auditoria Completo (Módulo 7 & LGPD) -->
            <div class="bg-white border border-border rounded-xl p-6">
              <span class="eyebrow">MÓDULO 7 · AUDITORIA E RASTREABILIDADE LGPD</span>
              <h2 class="font-heading font-bold text-xl mb-4">
                Registro de Auditoria (Quem aprovou, editou, recusou ou visualizou dados de aluno, e quando)
              </h2>
              <div class="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table class="w-full text-left text-xs">
                  <thead class="sticky top-0 bg-white border-b border-border uppercase text-muted-foreground">
                    <tr>
                      <th class="py-2">Data / Hora</th>
                      <th class="py-2">Usuário</th>
                      <th class="py-2">Perfil</th>
                      <th class="py-2">Ação Executada</th>
                      <th class="py-2">Alvo / Detalhes</th>
                      <th class="py-2">IP</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    @for (l of logs(); track l.id) {
                      <tr>
                        <td class="py-2 font-mono whitespace-nowrap">{{ l.data }}</td>
                        <td class="py-2 font-semibold">{{ l.usuarioNome }}</td>
                        <td class="py-2">
                          <span class="badge bg-muted text-foreground">{{ l.perfil }}</span>
                        </td>
                        <td class="py-2 font-mono font-bold text-[#1C4587]">{{ l.acao }}</td>
                        <td class="py-2 text-muted-foreground">{{ l.alvo }}</td>
                        <td class="py-2 font-mono text-muted-foreground">{{ l.ip }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class PainelEtecComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);

  abaAtiva = signal<AbaEtec>('fila');
  abas: { id: AbaEtec; label: string }[] = [
    { id: 'fila', label: 'Fila de aprovação' },
    { id: 'empresas', label: 'Empresas' },
    { id: 'vagas', label: 'Vagas' },
    { id: 'alunos', label: 'Alunos' },
    { id: 'estagios', label: 'Estágios' },
    { id: 'relatorios', label: 'Relatórios' },
    { id: 'institucional', label: 'Site institucional' },
    { id: 'configuracoes', label: 'Configurações' }
  ];

  empresas = signal<any[]>([]);
  vagas = signal<any[]>([]);
  alunos = signal<any[]>([]);
  baseSecretaria = signal<any[]>([]);
  estagios = signal<any[]>([]);
  denuncias = signal<any[]>([]);
  relatorios = signal<any>(null);
  logs = signal<any[]>([]);
  configuracoes = signal<any[]>([]);
  cursos = signal<any[]>([]);

  motivoEmpresa: Record<number, string> = {};
  motivoVaga: Record<number, string> = {};
  feedbackMsg = signal<string | null>(null);

  mostrarFormVagaDireta = signal(false);
  vagaDireta: any = {
    empresa_id: 1,
    titulo: '',
    tipo: 'Estágio não obrigatório',
    cursoUnicoId: 1,
    modulo_minimo: 1,
    atividades: '',
    requisitos: '',
    bolsa: 'R$ 1.100,00',
    beneficios: 'Auxílio-transporte e Seguro de Vida',
    carga_horaria: '6h/dia, 30h/semana',
    horas_dia: 6,
    horas_semana: 30,
    turno: 'Tarde',
    modalidade: 'Presencial',
    local: 'Cuiabá/MT',
    cidade: 'Cuiabá/MT',
    qtd_vagas: 1,
    prazo: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    forma_candidatura: 'Pelo sistema'
  };

  csvSecretaria = '';
  novoCurso = { nome: '', eixo: 'Informação e Comunicação', duracao_modulos: 3, turno_padrao: 'Noite' };

  ngOnInit() {
    this.carregarTudo();
    this.api.listarCursos().subscribe((c) => this.cursos.set(c));
  }

  carregarTudo() {
    this.api.getEtecDashboard().subscribe({
      next: (res) => {
        this.empresas.set(res.empresas || []);
        this.vagas.set(res.vagas || []);
        this.alunos.set(res.alunos || []);
        this.baseSecretaria.set(res.baseSecretaria || []);
        this.estagios.set(res.estagios || []);
        this.denuncias.set(res.denuncias || []);
        this.relatorios.set(res.relatorios || null);
        this.logs.set(res.logs || []);
        this.configuracoes.set(res.configuracoes || []);
      }
    });
  }

  empresasPendentes(): any[] {
    return this.empresas().filter((e) => e.status === 'pendente');
  }

  vagasPendentes(): any[] {
    return this.vagas().filter((v) => v.status === 'aguardando_aprovacao');
  }

  totalPendentesFila(): number {
    const denPend = this.denuncias().filter((d) => d.situacao === 'pendente').length;
    return this.empresasPendentes().length + this.vagasPendentes().length + denPend;
  }

  moderarEmpresa(id: number, acao: string) {
    const motivo = this.motivoEmpresa[id] || '';
    this.api.moderarEmpresa(id, acao, motivo).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem);
        this.carregarTudo();
      }
    });
  }

  moderarVaga(id: number, acao: string) {
    const motivo = this.motivoVaga[id] || '';
    this.api.moderarVaga(id, acao, motivo).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem);
        this.carregarTudo();
      }
    });
  }

  publicarVagaDireta() {
    const payload = {
      ...this.vagaDireta,
      cursos: [this.vagaDireta.cursoUnicoId]
    };
    this.api.publicarVagaDiretaEtec(payload).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem);
        this.mostrarFormVagaDireta.set(false);
        this.carregarTudo();
      },
      error: (err) => this.mostrarFeedback(err?.error?.mensagem || 'Verifique os campos obrigatórios da vaga.')
    });
  }

  alternarEgresso(alunoId: number) {
    this.api.alternarEgressoAluno(alunoId).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem);
        this.carregarTudo();
      }
    });
  }

  preencherCsvExemplo() {
    this.csvSecretaria =
      '2026301;77788899900;Ana Clara Arruda;anaclara@aluno.etec.mt.gov.br;2;2;Manhã;2007-04-12;0\n' +
      '2026302;88899900011;João Vitor Cuiabano;joaovitor@aluno.etec.mt.gov.br;1;3;Noite;2005-09-22;0';
  }

  importarPlanilhaSecretaria() {
    this.api.importarAlunosSecretaria(this.csvSecretaria).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem);
        this.csvSecretaria = '';
        this.carregarTudo();
      }
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
      this.mostrarFeedback('Termo de Compromisso de Estágio gerado em PDF com sucesso!');
    });
  }

  salvarEstagio(es: any) {
    this.api.atualizarEstagio(es.id, {
      assAluno: es.assAluno,
      assResponsavel: es.assResponsavel,
      assEmpresa: es.assEmpresa,
      assEtec: es.assEtec,
      menorDeIdade: es.menorDeIdade,
      relatorioSemestralStatus: es.relatorioSemestralStatus,
      situacao: es.situacao
    }).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem);
        this.carregarTudo();
      }
    });
  }

  resolverDenuncia(id: number, situacao: string, bloquearEmpresa: boolean) {
    this.api.resolverDenuncia(id, {
      situacao,
      parecer: bloquearEmpresa ? 'Irregularidade confirmada pela Coordenação de Estágio.' : 'Apuração concluída sem irregularidade.',
      bloquearEmpresa
    }).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem);
        this.carregarTudo();
      }
    });
  }

  exportarRelatorioCsv() {
    this.api.exportarRelatorioCsv().subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Relatorio_Empregabilidade_ETEC_Cuiaba.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  exportarRelatorioPdf() {
    this.api.exportarRelatorioPdf().subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Relatorio_Indicadores_SECITECI_ETEC_Cuiaba.pdf';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  executarBackupSqlite() {
    this.api.executarBackupSqlite().subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem);
        this.carregarTudo();
      }
    });
  }

  salvarNovoCurso() {
    this.api.criarCursoTecnico(this.novoCurso).subscribe({
      next: (res) => {
        this.mostrarFeedback(res.mensagem);
        this.novoCurso.nome = '';
        this.api.listarCursos().subscribe((c) => this.cursos.set(c));
        this.carregarTudo();
      }
    });
  }

  private mostrarFeedback(msg: string) {
    this.feedbackMsg.set(msg);
    setTimeout(() => this.feedbackMsg.set(null), 6000);
  }
}
