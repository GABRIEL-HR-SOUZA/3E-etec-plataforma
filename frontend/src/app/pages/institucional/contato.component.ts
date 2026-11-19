import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { PageHeroComponent } from '../../components/page-hero.component';
import { ApiService } from '../../core/api.service';
import { CONTATO } from '../../core/institucional-data';

@Component({
  selector: 'app-contato',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeroComponent],
  template: `
    <app-page-hero
      trilha="Fale conosco"
      eyebrow="ATENDIMENTO"
      titulo="Fale com a ETEC Cuiabá"
      subtitulo="Tire dúvidas sobre cursos, matrículas, documentos, estágio e parcerias. Sua mensagem chega à secretaria da escola."
    />

    <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-5 gap-10">
      <!-- Formulário -->
      <div class="lg:col-span-3">
        <h2 class="font-heading font-bold text-2xl mb-1">Envie uma mensagem</h2>
        <p class="text-sm text-muted-foreground mb-6">Campos com * são obrigatórios.</p>

        @if (protocolo()) {
          <div class="p-5 rounded-xl bg-emerald-50 border border-emerald-200" role="status">
            <p class="font-semibold text-emerald-900">Mensagem enviada com sucesso!</p>
            <p class="text-sm text-emerald-900 mt-1">Protocolo: <strong>{{ protocolo() }}</strong>. A secretaria responderá pelo e-mail informado.</p>
            <button type="button" (click)="protocolo.set(null)" class="btn-outline text-sm mt-4">Enviar outra mensagem</button>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="enviar()" novalidate class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="c-nome" class="block text-sm font-semibold mb-1">Nome completo *</label>
                <input id="c-nome" class="field" formControlName="nome" autocomplete="name" />
                @if (invalido('nome')) { <p class="text-xs text-red-700 mt-1">Informe seu nome (mín. 3 letras).</p> }
              </div>
              <div>
                <label for="c-email" class="block text-sm font-semibold mb-1">E-mail *</label>
                <input id="c-email" type="email" class="field" formControlName="email" autocomplete="email" />
                @if (invalido('email')) { <p class="text-xs text-red-700 mt-1">Informe um e-mail válido.</p> }
              </div>
              <div>
                <label for="c-tel" class="block text-sm font-semibold mb-1">Telefone / WhatsApp</label>
                <input id="c-tel" type="tel" class="field" formControlName="telefone" autocomplete="tel" placeholder="(65) 9 0000-0000" />
              </div>
              <div>
                <label for="c-assunto" class="block text-sm font-semibold mb-1">Assunto *</label>
                <select id="c-assunto" class="field" formControlName="assunto">
                  <option value="">Selecione…</option>
                  @for (a of assuntos; track a) { <option [value]="a">{{ a }}</option> }
                </select>
                @if (invalido('assunto')) { <p class="text-xs text-red-700 mt-1">Escolha um assunto.</p> }
              </div>
            </div>
            <div>
              <label for="c-msg" class="block text-sm font-semibold mb-1">Mensagem *</label>
              <textarea id="c-msg" rows="6" class="field" formControlName="mensagem" maxlength="3000"></textarea>
              <div class="flex justify-between text-xs mt-1">
                <span class="text-red-700">@if (invalido('mensagem')) { Escreva pelo menos 10 caracteres. }</span>
                <span class="text-muted-foreground">{{ form.value.mensagem?.length ?? 0 }}/3000</span>
              </div>
            </div>
            <label class="flex items-start gap-2 text-sm">
              <input type="checkbox" formControlName="consentimento" class="mt-1" />
              <span>Autorizo a ETEC Cuiabá a usar meus dados apenas para responder a esta mensagem (LGPD — Lei 13.709/2018). *</span>
            </label>
            @if (invalido('consentimento')) { <p class="text-xs text-red-700 -mt-2">É necessário autorizar para enviarmos a resposta.</p> }

            @if (erro()) {
              <p class="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800" role="alert">{{ erro() }}</p>
            }
            <button type="submit" class="btn-primary" [disabled]="enviando()">
              {{ enviando() ? 'Enviando…' : 'Enviar mensagem' }}
            </button>
          </form>
        }
      </div>

      <!-- Canais -->
      <aside class="lg:col-span-2 space-y-4">
        <div class="bg-white border border-border rounded-xl p-5 space-y-3 text-[15px]">
          <h2 class="font-heading font-bold text-lg">Canais de atendimento</h2>
          <p><span class="text-sm text-muted-foreground block">WhatsApp</span>
            <a [href]="c.whatsappLink" target="_blank" rel="noopener noreferrer" class="font-semibold text-[#1E7F4A] hover:underline">{{ c.whatsapp }}</a></p>
          <p><span class="text-sm text-muted-foreground block">Telefones</span>
            <a [href]="c.telefoneFixoLink" class="font-semibold hover:underline">{{ c.telefoneFixo }}</a> ·
            <a [href]="c.celular2Link" class="font-semibold hover:underline">{{ c.celular2 }}</a></p>
          <p><span class="text-sm text-muted-foreground block">E-mail</span>
            <a [href]="'mailto:' + c.email" class="font-semibold text-[#1C4587] hover:underline break-all">{{ c.email }}</a></p>
          <p><span class="text-sm text-muted-foreground block">Instagram</span>
            <a [href]="c.instagramLink" target="_blank" rel="noopener noreferrer" class="font-semibold text-[#1C4587] hover:underline">{{ c.instagram }}</a></p>
          <p><span class="text-sm text-muted-foreground block">Endereço</span>
            {{ c.endereco }}, {{ c.cidade }} · CEP {{ c.cep }}<br /><span class="text-sm text-muted-foreground">{{ c.referencia }}</span></p>
        </div>
        <div class="rounded-xl overflow-hidden border border-border bg-muted aspect-[4/3]">
          <iframe [src]="mapa" title="Mapa de localização da ETEC Cuiabá" class="w-full h-full" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
        <a [href]="c.mapaLink" target="_blank" rel="noopener noreferrer" class="text-sm font-semibold text-[#1C4587] hover:underline">Traçar rota no Google Maps ↗</a>
      </aside>
    </section>
  `
})
export class ContatoComponent {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  c = CONTATO;
  mapa = inject(DomSanitizer).bypassSecurityTrustResourceUrl(CONTATO.mapaEmbed);

  assuntos = ['Cursos técnicos e matrículas', 'Processo seletivo / editais', 'Documentos e declarações', 'Estágio e Portal de Vagas', 'Programa Mulheres Mil', 'Parcerias com empresas', 'Outro assunto'];

  form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    telefone: [''],
    assunto: ['', Validators.required],
    mensagem: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(3000)]],
    consentimento: [false, Validators.requiredTrue]
  });

  enviando = signal(false);
  erro = signal<string | null>(null);
  protocolo = signal<string | null>(null);

  invalido(campo: string): boolean {
    const ctrl = this.form.get(campo);
    return !!ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  enviar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.enviando.set(true);
    this.erro.set(null);
    this.api.enviarContato(this.form.getRawValue()).subscribe({
      next: (r) => {
        this.protocolo.set(r.protocolo);
        this.form.reset();
        this.enviando.set(false);
      },
      error: (e) => {
        this.erro.set(e?.error?.mensagem ?? 'Não foi possível enviar agora. Tente novamente ou fale pelo WhatsApp.');
        this.enviando.set(false);
      }
    });
  }
}
