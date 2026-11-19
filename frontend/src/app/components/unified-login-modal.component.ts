import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-unified-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (auth.modalAberto()) {
      <div
        class="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f2a52]/70 backdrop-blur-sm p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-acessar-titulo"
      >
        <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-border overflow-hidden my-8">
          <!-- Cabeçalho azul institucional ETEC -->
          <div class="bg-[#1C4587] text-white px-6 py-4 flex items-center justify-between">
            <div>
              <span class="text-[11px] uppercase tracking-wider font-semibold text-white/75 block">
                ETEC Cuiabá · SECITECI-MT
              </span>
              <h2 id="modal-acessar-titulo" class="font-heading font-bold text-xl">
                @if (auth.abaModal() === 'login') { Acessar o painel }
                @else if (auth.abaModal() === 'recuperar') { Recuperação de senha }
                @else { Primeiro acesso do aluno }
              </h2>
            </div>
            <button
              type="button"
              (click)="auth.fecharModalLogin()"
              class="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Fechar bloco de acesso"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6">
            @if (auth.mensagemContextualModal()) {
              <div class="mb-4 p-3 rounded-lg bg-[#1C4587]/10 border border-[#1C4587]/25 text-xs text-[#0f2a52] font-medium">
                {{ auth.mensagemContextualModal() }}
              </div>
            }

            @if (erro()) {
              <div class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium flex items-start gap-2">
                <svg class="w-5 h-5 shrink-0 text-red-600 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{{ erro() }}</span>
              </div>
            }

            @if (sucessoMsg()) {
              <div class="mb-4 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-medium">
                {{ sucessoMsg() }}
              </div>
            }

            <!-- ABA 1: LOGIN UNIFICADO -->
            @if (auth.abaModal() === 'login') {
              <form (ngSubmit)="submeterLogin()" class="space-y-4">
                <div>
                  <label for="campo-identificador" class="block text-sm font-semibold text-foreground mb-1.5">
                    Login, e-mail ou CPF
                  </label>
                  <input
                    id="campo-identificador"
                    type="text"
                    name="identificador"
                    [(ngModel)]="identificador"
                    (ngModelChange)="aoDigitarIdentificador($event)"
                    placeholder="Login (empresa), e-mail ou CPF"
                    autocomplete="username"
                    required
                    class="field"
                  />
                  <!-- Dica dinâmica abaixo do campo -->
                  @if (dicaDetectada()) {
                    <div class="mt-1.5 flex items-center gap-1.5 text-xs font-semibold"
                         [ngClass]="{
                           'text-[#1C4587]': tipoDetectado() === 'EMAIL' || tipoDetectado() === 'CPF',
                           'text-[#5C2D91]': tipoDetectado() === 'EMPRESA'
                         }">
                      <span class="w-2 h-2 rounded-full"
                            [ngClass]="{
                              'bg-[#1E7F4A]': tipoDetectado() === 'EMAIL' || tipoDetectado() === 'CPF',
                              'bg-[#5C2D91]': tipoDetectado() === 'EMPRESA'
                            }"></span>
                      <span>{{ dicaDetectada() }}</span>
                    </div>
                  }
                </div>

                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <label for="campo-senha" class="block text-sm font-semibold text-foreground">
                      Senha
                    </label>
                    <button
                      type="button"
                      (click)="alternarAba('recuperar')"
                      class="text-xs font-semibold text-[#1C4587] hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div class="relative">
                    <input
                      id="campo-senha"
                      [type]="mostrarSenha() ? 'text' : 'password'"
                      name="senha"
                      [(ngModel)]="senha"
                      placeholder="Digite sua senha"
                      autocomplete="current-password"
                      required
                      class="field pr-11"
                    />
                    <button
                      type="button"
                      (click)="mostrarSenha.set(!mostrarSenha())"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      [attr.aria-label]="mostrarSenha() ? 'Esconder senha' : 'Mostrar senha'"
                    >
                      @if (!mostrarSenha()) {
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      } @else {
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      }
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  [disabled]="carregando()"
                  class="w-full btn-primary py-3 text-base shadow-sm"
                >
                  @if (carregando()) { Autenticando... } @else { Entrar }
                </button>
              </form>

              <!-- Rodapé do bloco conforme especificação -->
              <div class="mt-5 pt-4 border-t border-border flex flex-col gap-2 text-sm">
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">É empresa e não tem conta?</span>
                  <button
                    type="button"
                    (click)="irParaCadastroEmpresa()"
                    class="font-semibold text-[#1C4587] hover:underline"
                  >
                    Cadastre-se
                  </button>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">Aluno matriculado na ETEC?</span>
                  <button
                    type="button"
                    (click)="alternarAba('primeiro-acesso')"
                    class="font-semibold text-[#1E7F4A] hover:underline"
                  >
                    Primeiro acesso do aluno
                  </button>
                </div>
              </div>

              <!-- Atalhos rápidos de demonstração para testar os 6 perfis -->
              <div class="mt-5 pt-3 border-t border-dashed border-border">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Acesso rápido para demonstração (senha: 123456)
                </p>
                <div class="grid grid-cols-2 gap-1.5 text-xs">
                  <button type="button" (click)="preencherDemo('11122233344')" class="px-2.5 py-1.5 rounded border border-border bg-muted/60 hover:bg-[#1C4587]/10 text-left font-medium">
                    🎓 Aluno (CPF)
                  </button>
                  <button type="button" (click)="preencherDemo('mariana.silva@aluno.etec.mt.gov.br')" class="px-2.5 py-1.5 rounded border border-border bg-muted/60 hover:bg-[#1C4587]/10 text-left font-medium">
                    🩺 Aluna Menor (&lt;18)
                  </button>
                  <button type="button" (click)="preencherDemo('egresso@etec.mt.gov.br')" class="px-2.5 py-1.5 rounded border border-border bg-muted/60 hover:bg-[#1C4587]/10 text-left font-medium">
                    🏅 Egresso (Formado)
                  </button>
                  <button type="button" (click)="preencherDemo('cuiabadigital')" class="px-2.5 py-1.5 rounded border border-border bg-muted/60 hover:bg-[#1C4587]/10 text-left font-medium">
                    🏢 Empresa (Login)
                  </button>
                  <button type="button" (click)="preencherDemo('coordenacao@secitec.mt.gov.br')" class="px-2.5 py-1.5 rounded border border-border bg-muted/60 hover:bg-[#1C4587]/10 text-left font-medium">
                    🏛️ Coordenação ETEC
                  </button>
                  <button type="button" (click)="preencherDemo('admin@secitec.mt.gov.br')" class="px-2.5 py-1.5 rounded border border-border bg-muted/60 hover:bg-[#1C4587]/10 text-left font-medium">
                    ⚙️ Admin (TI)
                  </button>
                </div>
              </div>
            }

            <!-- ABA 2: RECUPERAR SENHA (com e-mail mascarado jo***@gmail.com) -->
            @if (auth.abaModal() === 'recuperar') {
              <form (ngSubmit)="submeterRecuperacao()" class="space-y-4">
                <p class="text-sm text-muted-foreground">
                  Informe seu login, e-mail ou CPF. O sistema exibirá o e-mail mascarado cadastrado para envio do link de redefinição.
                </p>
                <div>
                  <label class="block text-sm font-semibold text-foreground mb-1.5">Login, e-mail ou CPF</label>
                  <input
                    type="text"
                    name="identificadorRec"
                    [(ngModel)]="identificador"
                    placeholder="Login (empresa), e-mail ou CPF"
                    required
                    class="field"
                  />
                </div>
                <button type="submit" [disabled]="carregando()" class="w-full btn-primary">
                  Enviar link de recuperação
                </button>
                <button type="button" (click)="alternarAba('login')" class="w-full btn-outline text-sm">
                  ← Voltar para o login
                </button>
              </form>
            }

            <!-- ABA 3: PRIMEIRO ACESSO DO ALUNO (CPF + Matrícula na base da Secretaria) -->
            @if (auth.abaModal() === 'primeiro-acesso') {
              <div class="space-y-4">
                <p class="text-sm text-muted-foreground">
                  Informe seu <strong>CPF</strong> e número de <strong>Matrícula</strong>. O sistema confere na lista oficial da Secretaria da ETEC Cuiabá.
                </p>
                <div class="p-2.5 rounded bg-muted text-xs text-muted-foreground">
                  💡 <strong>Teste com aluno da Secretaria:</strong> CPF <code>444.555.666-77</code> e Matrícula <code>2026205</code> (Lucas Oliveira Santos — Técnico em Agronegócio).
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold uppercase text-foreground mb-1">CPF do Aluno</label>
                    <input
                      type="text"
                      [(ngModel)]="primeiroAcessoCpf"
                      placeholder="000.000.000-00"
                      class="field"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold uppercase text-foreground mb-1">Nº de Matrícula</label>
                    <input
                      type="text"
                      [(ngModel)]="primeiroAcessoMatricula"
                      placeholder="Ex: 2026205"
                      class="field"
                    />
                  </div>
                </div>

                @if (!alunoConfirmadoSecretaria()) {
                  <button type="button" (click)="conferirNaSecretaria()" [disabled]="carregando()" class="w-full btn-primary">
                    Conferir na lista da Secretaria ETEC
                  </button>
                } @else {
                  <div class="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                    <p class="font-bold text-emerald-900">✓ Aluno confirmado: {{ dadosSecretaria()?.nome }}</p>
                    <p class="text-emerald-800">Curso: {{ dadosSecretaria()?.cursoNome }} ({{ dadosSecretaria()?.modulo }}º módulo · {{ dadosSecretaria()?.turno }})</p>
                    <p class="text-emerald-700">E-mail na secretaria: <strong>{{ dadosSecretaria()?.emailMascarado }}</strong></p>
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-foreground mb-1">Crie sua senha de acesso (mín. 6 caracteres)</label>
                    <input
                      type="password"
                      [(ngModel)]="primeiroAcessoSenha"
                      placeholder="Defina sua senha"
                      class="field"
                    />
                  </div>
                  <button type="button" (click)="ativarContaAluno()" [disabled]="carregando()" class="w-full btn-verde">
                    Criar senha e entrar no Painel do Aluno
                  </button>
                }

                <button type="button" (click)="alternarAba('login')" class="w-full btn-outline text-sm">
                  ← Voltar para o login
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class UnifiedLoginModalComponent {
  auth = inject(AuthService);
  router = inject(Router);

  identificador = '';
  senha = '';
  mostrarSenha = signal(false);
  dicaDetectada = signal('');
  tipoDetectado = signal<'EMAIL' | 'CPF' | 'EMPRESA' | 'VAZIO'>('VAZIO');

  carregando = signal(false);
  erro = signal<string | null>(null);
  sucessoMsg = signal<string | null>(null);

  // Primeiro acesso
  primeiroAcessoCpf = '444.555.666-77';
  primeiroAcessoMatricula = '2026205';
  primeiroAcessoSenha = '';
  alunoConfirmadoSecretaria = signal(false);
  dadosSecretaria = signal<any>(null);

  aoDigitarIdentificador(val: string) {
    this.erro.set(null);
    const res = this.auth.analisarEntradaUnificada(val);
    this.tipoDetectado.set(res.tipo);
    this.dicaDetectada.set(res.dica);
    if (res.tipo === 'CPF' && res.valorFormatado !== val) {
      setTimeout(() => {
        this.identificador = res.valorFormatado;
      });
    }
  }

  preencherDemo(loginOuCpfOuEmail: string) {
    this.identificador = loginOuCpfOuEmail;
    this.senha = '123456';
    this.aoDigitarIdentificador(loginOuCpfOuEmail);
    this.submeterLogin();
  }

  submeterLogin() {
    this.erro.set(null);
    this.sucessoMsg.set(null);
    if (!this.identificador.trim() || !this.senha.trim()) {
      this.erro.set('Login ou senha incorretos');
      return;
    }
    this.carregando.set(true);
    this.auth.login(this.identificador, this.senha).subscribe({
      next: () => {
        this.carregando.set(false);
        this.senha = '';
      },
      error: (err) => {
        this.carregando.set(false);
        // Regra de segurança: erro sempre genérico ("Login ou senha incorretos") ou aviso de bloqueio de 15 min
        this.erro.set(err?.error?.mensagem || 'Login ou senha incorretos');
      }
    });
  }

  submeterRecuperacao() {
    this.erro.set(null);
    this.sucessoMsg.set(null);
    if (!this.identificador.trim()) {
      this.erro.set('Informe seu login, e-mail ou CPF.');
      return;
    }
    this.carregando.set(true);
    this.auth.recuperarSenha(this.identificador).subscribe({
      next: (res) => {
        this.carregando.set(false);
        this.sucessoMsg.set(res.mensagem);
      },
      error: () => {
        this.carregando.set(false);
        this.sucessoMsg.set('Se houver conta associada, enviamos o link para jo***@gmail.com.');
      }
    });
  }

  conferirNaSecretaria() {
    this.erro.set(null);
    this.sucessoMsg.set(null);
    this.carregando.set(true);
    this.auth.conferirPrimeiroAcesso(this.primeiroAcessoCpf, this.primeiroAcessoMatricula).subscribe({
      next: (res) => {
        this.carregando.set(false);
        this.alunoConfirmadoSecretaria.set(true);
        this.dadosSecretaria.set(res);
      },
      error: (err) => {
        this.carregando.set(false);
        this.erro.set(err?.error?.mensagem || 'Não foi possível validar seus dados na secretaria.');
      }
    });
  }

  ativarContaAluno() {
    this.erro.set(null);
    if (this.primeiroAcessoSenha.length < 6) {
      this.erro.set('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    this.carregando.set(true);
    this.auth.ativarPrimeiroAcesso(this.primeiroAcessoCpf, this.primeiroAcessoMatricula, this.primeiroAcessoSenha).subscribe({
      next: () => {
        this.carregando.set(false);
      },
      error: (err) => {
        this.carregando.set(false);
        this.erro.set(err?.error?.mensagem || 'Erro ao ativar conta.');
      }
    });
  }

  alternarAba(aba: 'login' | 'recuperar' | 'primeiro-acesso') {
    this.erro.set(null);
    this.sucessoMsg.set(null);
    this.alunoConfirmadoSecretaria.set(false);
    this.auth.abaModal.set(aba);
  }

  irParaCadastroEmpresa() {
    this.auth.fecharModalLogin();
    this.router.navigateByUrl('/vagas/cadastro-empresa');
  }
}
