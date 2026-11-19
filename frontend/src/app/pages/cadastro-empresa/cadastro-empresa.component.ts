import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-cadastro-empresa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="bg-muted/40 min-h-screen py-10">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <a routerLink="/vagas/empresas" class="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1C4587] hover:underline mb-6">
          ← Voltar para informações às empresas
        </a>

        <div class="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          <div class="bg-[#1C4587] text-white px-6 py-6">
            <span class="text-xs font-semibold uppercase tracking-wider text-white/75 block">
              CREDENCIAMENTO DE EMPRESA PARCEIRA · ETEC CUIABÁ
            </span>
            <h1 class="font-heading font-bold text-2xl sm:text-3xl mt-1">
              Cadastro de Empresa Concedente
            </h1>
            <p class="text-sm text-white/85 mt-1">
              Após o envio, a Coordenação de Estágio da ETEC Cuiabá analisa e aprova o cadastro para publicação de vagas.
            </p>
          </div>

          <div class="p-6 sm:p-8">
            @if (erroMsg()) {
              <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 font-medium">
                {{ erroMsg() }}
              </div>
            }

            @if (cadastroConcluido()) {
              <div class="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
                <div class="w-12 h-12 rounded-full bg-[#1E7F4A] text-white font-bold text-xl inline-flex items-center justify-center">
                  ✓
                </div>
                <h2 class="font-heading font-bold text-2xl text-emerald-950">
                  Empresa cadastrada e enviada para aprovação!
                </h2>
                <p class="text-sm text-emerald-900 max-w-xl mx-auto">
                  {{ mensagemSucesso() }}
                </p>
                <div class="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    (click)="auth.abrirModalLogin('Entre com o login recém-criado da sua empresa.', '/painel/empresa')"
                    class="btn-primary"
                  >
                    Acessar Painel da Empresa agora
                  </button>
                  <a routerLink="/vagas" class="btn-outline">Voltar ao mural de vagas</a>
                </div>
              </div>
            } @else {
              <form [formGroup]="form" (ngSubmit)="submeter()" class="space-y-5">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-semibold mb-1">CNPJ *</label>
                    <input type="text" formControlName="cnpj" placeholder="00.000.000/0001-00" class="field" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold mb-1">Setor de Atuação *</label>
                    <select formControlName="setor" class="field">
                      <option value="Tecnologia da Informação">Tecnologia da Informação</option>
                      <option value="Saúde e Atendimento Hospitalar">Saúde e Clínicas / Hospitais</option>
                      <option value="Agronegócio e Recursos Naturais">Agronegócio e Recursos Naturais</option>
                      <option value="Indústria e Segurança do Trabalho">Indústria, Engenharia e SST</option>
                      <option value="Comércio, Logística e Gestão">Comércio, Logística e Administração</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-semibold mb-1">Razão Social *</label>
                    <input type="text" formControlName="razao_social" placeholder="Razão Social conforme CNPJ" class="field" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold mb-1">Nome Fantasia *</label>
                    <input type="text" formControlName="nome_fantasia" placeholder="Como a empresa é conhecida" class="field" />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div class="sm:col-span-2">
                    <label class="block text-sm font-semibold mb-1">Endereço Comercial Completo *</label>
                    <input type="text" formControlName="endereco" placeholder="Av. / Rua, número, bairro" class="field" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold mb-1">Cidade / UF *</label>
                    <input type="text" formControlName="cidade" placeholder="Cuiabá/MT" class="field" />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-semibold mb-1">Responsável pelo RH / Estágios *</label>
                    <input type="text" formControlName="responsavel" placeholder="Nome completo do responsável" class="field" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold mb-1">Cargo do Responsável *</label>
                    <input type="text" formControlName="cargo" placeholder="Ex: Analista de RH, Sócio, Gerente" class="field" />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-semibold mb-1">Telefone / WhatsApp Comercial *</label>
                    <input type="text" formControlName="telefone" placeholder="(65) 99999-0000" class="field" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold mb-1">E-mail Corporativo *</label>
                    <input type="email" formControlName="email" placeholder="rh@suaempresa.com.br" class="field" />
                  </div>
                </div>

                <!-- Dados de Acesso Unificado -->
                <div class="p-4 rounded-lg bg-muted/60 border border-border space-y-4">
                  <h2 class="font-heading font-bold text-base text-[#1C4587]">
                    Credenciais para o Login Unificado (Botão "Acessar")
                  </h2>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-semibold mb-1">Login da Empresa * (deve conter letras)</label>
                      <input type="text" formControlName="login" placeholder="Ex: hospitalcuiaba" class="field" />
                      <span class="text-[11px] text-muted-foreground">Sem &#64; e com pelo menos uma letra para reconhecimento automático.</span>
                    </div>
                    <div>
                      <label class="block text-sm font-semibold mb-1">Senha de Acesso * (mín. 6 caracteres)</label>
                      <input type="password" formControlName="senha" placeholder="Digite uma senha segura" class="field" />
                    </div>
                  </div>
                </div>

                <!-- Aceite dos Termos -->
                <label class="flex items-start gap-2.5 text-sm cursor-pointer p-3.5 rounded-lg border border-border bg-white">
                  <input type="checkbox" formControlName="aceite_termos" class="mt-1 rounded border-input" />
                  <span>
                    Declaro que a empresa está ciente das regras da <strong>Lei Federal nº 11.788/2008 (Lei do Estágio)</strong>, da <strong>LGPD (Lei nº 13.709/2018)</strong> e da <strong>proibição absoluta de cobrar qualquer valor de candidatos</strong> (taxas, cursos ou kits), sob pena de bloqueio imediato.
                  </span>
                </label>

                <div class="flex items-center justify-end gap-3 pt-2">
                  <a routerLink="/vagas" class="btn-outline">Cancelar</a>
                  <button type="submit" [disabled]="enviando()" class="btn-verde">
                    @if (enviando()) { Enviando cadastro... } @else { Concluir Cadastro da Empresa }
                  </button>
                </div>
              </form>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class CadastroEmpresaComponent {
  fb = inject(FormBuilder);
  api = inject(ApiService);
  auth = inject(AuthService);

  enviando = signal(false);
  erroMsg = signal<string | null>(null);
  cadastroConcluido = signal(false);
  mensagemSucesso = signal('');

  form = this.fb.group({
    cnpj: ['', Validators.required],
    setor: ['Tecnologia da Informação', Validators.required],
    razao_social: ['', Validators.required],
    nome_fantasia: ['', Validators.required],
    endereco: ['', Validators.required],
    cidade: ['Cuiabá/MT', Validators.required],
    responsavel: ['', Validators.required],
    cargo: ['Analista de RH', Validators.required],
    telefone: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    login: ['', Validators.required],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    aceite_termos: [false, Validators.requiredTrue]
  });

  submeter() {
    this.erroMsg.set(null);
    if (this.form.invalid) {
      this.erroMsg.set('Preencha todos os campos obrigatórios e marque o aceite dos termos.');
      return;
    }
    this.enviando.set(true);
    this.api.cadastrarEmpresa(this.form.value).subscribe({
      next: (res) => {
        this.enviando.set(false);
        this.cadastroConcluido.set(true);
        this.mensagemSucesso.set(res.mensagem);
      },
      error: (err) => {
        this.enviando.set(false);
        this.erroMsg.set(err?.error?.mensagem || 'Não foi possível concluir o cadastro.');
      }
    });
  }
}
