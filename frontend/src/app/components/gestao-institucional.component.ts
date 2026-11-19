import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { STATUS_EDITAL, formatarData } from '../core/institucional-data';

type Secao = 'mensagens' | 'noticias' | 'editais' | 'agenda';
type TipoConteudo = 'noticias' | 'editais' | 'agenda';

const VAZIO: Record<TipoConteudo, () => any> = {
  noticias: () => ({ titulo: '', resumo: '', conteudo: '', categoria: 'Institucional', dataPublicacao: new Date().toISOString().slice(0, 10), autor: 'ETEC Cuiabá', fonteUrl: '', publicada: true }),
  editais: () => ({ numero: '', orgao: 'ETEC Cuiabá', titulo: '', descricao: '', categoria: 'Alunos', status: 'aberto', inscricaoInicio: '', inscricaoFim: '', documentoUrl: '', publicado: true }),
  agenda: () => ({ titulo: '', descricao: '', dataInicio: '', dataFim: '', horario: '', local: 'ETEC Cuiabá', linkUrl: '', publicado: true })
};

/** Aba "Site institucional" do Painel da ETEC: CRUD de notícias, editais e agenda + caixa do Fale Conosco. */
@Component({
  selector: 'app-gestao-institucional',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="flex flex-wrap gap-2 mb-6">
      @for (s of secoes; track s.id) {
        <button type="button" (click)="trocarSecao(s.id)" class="px-3.5 py-2 rounded-md text-sm font-semibold border transition-colors"
          [ngClass]="secao() === s.id ? 'bg-[#1C4587] text-white border-[#1C4587]' : 'bg-white border-border hover:border-[#1C4587]'">
          {{ s.label }}
          @if (s.id === 'mensagens' && naoLidas() > 0) {
            <span class="ml-1 px-1.5 rounded-full bg-amber-100 text-amber-900 text-xs">{{ naoLidas() }}</span>
          }
        </button>
      }
    </div>

    @if (msg()) {
      <div class="mb-4 p-3 rounded-lg text-sm font-medium" [ngClass]="msgErro() ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'">
        {{ msg() }}
      </div>
    }

    <!-- ── MENSAGENS DO FALE CONOSCO ── -->
    @if (secao() === 'mensagens') {
      <div class="space-y-3">
        @for (m of dados().mensagens; track m.id) {
          <div class="bg-white border rounded-lg p-4" [ngClass]="m.lida ? 'border-border' : 'border-amber-300 bg-amber-50/40'">
            <div class="flex flex-wrap justify-between gap-2">
              <div>
                <p class="font-semibold">{{ m.assunto }} @if (!m.lida) { <span class="badge bg-amber-100 text-amber-900 ml-1">Nova</span> }</p>
                <p class="text-sm text-muted-foreground">
                  {{ m.nome }} · <a [href]="'mailto:' + m.email + '?subject=' + resposta(m.assunto)" class="text-[#1C4587] hover:underline">{{ m.email }}</a>
                  @if (m.telefone) { · {{ m.telefone }} } · {{ m.criadoEm }}
                </p>
              </div>
              <div class="flex gap-2 shrink-0">
                <a [href]="'mailto:' + m.email + '?subject=' + resposta(m.assunto)" class="btn-primary text-xs py-1.5 px-3">Responder</a>
                <button type="button" (click)="alternarLida(m)" class="btn-outline text-xs py-1.5 px-3">{{ m.lida ? 'Marcar não lida' : 'Marcar lida' }}</button>
                <button type="button" (click)="excluir('mensagens', m.id)" class="btn-outline text-xs py-1.5 px-3 text-red-700">Excluir</button>
              </div>
            </div>
            <p class="text-sm mt-3 whitespace-pre-line">{{ m.mensagem }}</p>
          </div>
        } @empty {
          <p class="text-muted-foreground text-sm">Nenhuma mensagem recebida pelo formulário <a routerLink="/contato" class="underline">Fale conosco</a>.</p>
        }
      </div>
    }

    <!-- ── LISTAS DE CONTEÚDO ── -->
    @if (secao() !== 'mensagens') {
      @let tipo = tipoAtual();
      <div class="flex justify-between items-center mb-4">
        <p class="text-sm text-muted-foreground">{{ lista().length }} registro(s). Itens despublicados não aparecem no site.</p>
        <button type="button" (click)="novo()" class="btn-verde text-sm py-2">+ Novo</button>
      </div>

      @if (form()) {
        <form (ngSubmit)="salvar()" class="bg-white border-2 border-[#1C4587]/30 rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h3 class="md:col-span-2 font-heading font-bold text-lg">{{ editandoId() ? 'Editar' : 'Novo' }} {{ rotulo[tipo] }}</h3>
          @let f = form();

          @if (tipo === 'noticias') {
            <label class="md:col-span-2 text-sm font-semibold">Título *<input class="field mt-1" name="titulo" [(ngModel)]="f.titulo" required /></label>
            <label class="md:col-span-2 text-sm font-semibold">Resumo *<input class="field mt-1" name="resumo" [(ngModel)]="f.resumo" required /></label>
            <label class="md:col-span-2 text-sm font-semibold">Conteúdo * <span class="font-normal text-muted-foreground">(linha em branco separa parágrafos)</span>
              <textarea class="field mt-1" rows="7" name="conteudo" [(ngModel)]="f.conteudo" required></textarea></label>
            <label class="text-sm font-semibold">Categoria<input class="field mt-1" name="categoria" [(ngModel)]="f.categoria" list="cats" /></label>
            <datalist id="cats"><option value="Institucional"></option><option value="Processo seletivo"></option><option value="Eventos"></option><option value="Vida escolar"></option><option value="Estágio"></option></datalist>
            <label class="text-sm font-semibold">Data de publicação<input type="date" class="field mt-1" name="data" [(ngModel)]="f.dataPublicacao" /></label>
            <label class="text-sm font-semibold">Autor<input class="field mt-1" name="autor" [(ngModel)]="f.autor" /></label>
            <label class="text-sm font-semibold">Link da fonte (opcional)<input type="url" class="field mt-1" name="fonte" [(ngModel)]="f.fonteUrl" /></label>
            <label class="text-sm flex items-center gap-2"><input type="checkbox" name="pub" [(ngModel)]="f.publicada" /> Publicada no site</label>
          }

          @if (tipo === 'editais') {
            <label class="text-sm font-semibold">Número *<input class="field mt-1" name="numero" placeholder="01/2027" [(ngModel)]="f.numero" required /></label>
            <label class="text-sm font-semibold">Órgão<input class="field mt-1" name="orgao" [(ngModel)]="f.orgao" /></label>
            <label class="md:col-span-2 text-sm font-semibold">Título *<input class="field mt-1" name="titulo" [(ngModel)]="f.titulo" required /></label>
            <label class="md:col-span-2 text-sm font-semibold">Descrição *<textarea class="field mt-1" rows="3" name="descricao" [(ngModel)]="f.descricao" required></textarea></label>
            <label class="text-sm font-semibold">Categoria
              <select class="field mt-1" name="categoria" [(ngModel)]="f.categoria">
                <option>Alunos</option><option>FIC</option><option>Servidores</option><option>Eventos</option>
              </select></label>
            <label class="text-sm font-semibold">Status
              <select class="field mt-1" name="status" [(ngModel)]="f.status">
                <option value="aberto">Inscrições abertas</option><option value="em_andamento">Em andamento</option><option value="encerrado">Encerrado</option>
              </select></label>
            <label class="text-sm font-semibold">Início das inscrições<input type="date" class="field mt-1" name="ini" [(ngModel)]="f.inscricaoInicio" /></label>
            <label class="text-sm font-semibold">Fim das inscrições<input type="date" class="field mt-1" name="fim" [(ngModel)]="f.inscricaoFim" /></label>
            <label class="md:col-span-2 text-sm font-semibold">Link do documento (PDF/Drive)<input type="url" class="field mt-1" name="url" [(ngModel)]="f.documentoUrl" /></label>
            <label class="text-sm flex items-center gap-2"><input type="checkbox" name="pub" [(ngModel)]="f.publicado" /> Publicado no site</label>
          }

          @if (tipo === 'agenda') {
            <label class="md:col-span-2 text-sm font-semibold">Título *<input class="field mt-1" name="titulo" [(ngModel)]="f.titulo" required /></label>
            <label class="md:col-span-2 text-sm font-semibold">Descrição<textarea class="field mt-1" rows="2" name="descricao" [(ngModel)]="f.descricao"></textarea></label>
            <label class="text-sm font-semibold">Data de início *<input type="date" class="field mt-1" name="ini" [(ngModel)]="f.dataInicio" required /></label>
            <label class="text-sm font-semibold">Data de término<input type="date" class="field mt-1" name="fim" [(ngModel)]="f.dataFim" /></label>
            <label class="text-sm font-semibold">Horário<input class="field mt-1" name="horario" placeholder="19h" [(ngModel)]="f.horario" /></label>
            <label class="text-sm font-semibold">Local<input class="field mt-1" name="local" [(ngModel)]="f.local" /></label>
            <label class="md:col-span-2 text-sm font-semibold">Link (opcional)<input type="url" class="field mt-1" name="link" [(ngModel)]="f.linkUrl" /></label>
            <label class="text-sm flex items-center gap-2"><input type="checkbox" name="pub" [(ngModel)]="f.publicado" /> Publicado no site</label>
          }

          <div class="md:col-span-2 flex gap-2">
            <button type="submit" class="btn-primary text-sm" [disabled]="salvando()">{{ salvando() ? 'Salvando…' : 'Salvar' }}</button>
            <button type="button" (click)="form.set(null)" class="btn-outline text-sm">Cancelar</button>
          </div>
        </form>
      }

      <div class="bg-white border border-border rounded-xl overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr><th class="p-3">Título</th><th class="p-3">Data</th><th class="p-3">Situação</th><th class="p-3 text-right">Ações</th></tr>
          </thead>
          <tbody>
            @for (item of lista(); track item.id) {
              <tr class="border-t border-border">
                <td class="p-3">
                  @if (tipo === 'editais') { <span class="font-semibold">{{ item.numero }}</span> — }
                  {{ item.titulo }}
                </td>
                <td class="p-3 whitespace-nowrap">{{ data(item.dataPublicacao ?? item.dataInicio ?? item.inscricaoInicio) || '—' }}</td>
                <td class="p-3 whitespace-nowrap">
                  @if (tipo === 'editais') { <span [class]="'badge ' + st(item.status).classe">{{ st(item.status).label }}</span> }
                  @if (!(item.publicada ?? item.publicado)) { <span class="badge bg-red-100 text-red-800 ml-1">Oculto</span> }
                  @else if (tipo !== 'editais') { <span class="badge bg-emerald-100 text-emerald-800">Publicado</span> }
                </td>
                <td class="p-3 text-right whitespace-nowrap">
                  <button type="button" (click)="editar(item)" class="text-[#1C4587] font-semibold hover:underline mr-3">Editar</button>
                  <button type="button" (click)="excluir(tipo, item.id)" class="text-red-700 font-semibold hover:underline">Excluir</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="p-4 text-muted-foreground">Nenhum registro.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `
})
export class GestaoInstitucionalComponent implements OnInit {
  private api = inject(ApiService);

  secoes: { id: Secao; label: string }[] = [
    { id: 'mensagens', label: 'Fale conosco' },
    { id: 'noticias', label: 'Notícias' },
    { id: 'editais', label: 'Editais' },
    { id: 'agenda', label: 'Agenda' }
  ];
  rotulo: Record<TipoConteudo, string> = { noticias: 'notícia', editais: 'edital', agenda: 'evento' };

  secao = signal<Secao>('mensagens');
  dados = signal<any>({ noticias: [], editais: [], agenda: [], mensagens: [] });
  form = signal<any>(null);
  editandoId = signal<number | null>(null);
  salvando = signal(false);
  msg = signal<string | null>(null);
  msgErro = signal(false);

  tipoAtual = computed(() => this.secao() as TipoConteudo);
  lista = computed<any[]>(() => this.dados()[this.secao()] ?? []);
  naoLidas = computed(() => (this.dados().mensagens ?? []).filter((m: any) => !m.lida).length);

  ngOnInit() { this.carregar(); }

  carregar() {
    this.api.getInstitucionalAdmin().subscribe({
      next: (d) => this.dados.set(d),
      error: (e) => this.aviso(e?.error?.mensagem ?? 'Falha ao carregar conteúdo institucional.', true)
    });
  }

  trocarSecao(s: Secao) {
    this.secao.set(s);
    this.form.set(null);
    this.msg.set(null);
  }

  novo() {
    this.editandoId.set(null);
    this.form.set(VAZIO[this.tipoAtual()]());
  }

  editar(item: any) {
    const f = { ...VAZIO[this.tipoAtual()](), ...item };
    Object.keys(f).forEach((k) => { if (f[k] === null) f[k] = ''; });
    f.publicada = !!item.publicada; f.publicado = !!item.publicado;
    this.editandoId.set(item.id);
    this.form.set(f);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  salvar() {
    const f = this.form();
    // A API usa snake_case nos campos de entrada
    const payload: any = {};
    Object.keys(f).forEach((k) => (payload[k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())] = f[k]));
    this.salvando.set(true);
    this.api.salvarInstitucional(this.tipoAtual(), payload, this.editandoId() ?? undefined).subscribe({
      next: (r) => {
        this.salvando.set(false);
        this.form.set(null);
        this.aviso(r.mensagem);
        this.carregar();
      },
      error: (e) => {
        this.salvando.set(false);
        this.aviso(e?.error?.mensagem ?? 'Não foi possível salvar.', true);
      }
    });
  }

  excluir(tipo: TipoConteudo | 'mensagens', id: number) {
    if (!confirm('Excluir este registro definitivamente?')) return;
    this.api.excluirInstitucional(tipo, id).subscribe({
      next: (r) => { this.aviso(r.mensagem); this.carregar(); },
      error: (e) => this.aviso(e?.error?.mensagem ?? 'Não foi possível excluir.', true)
    });
  }

  alternarLida(m: any) {
    this.api.marcarMensagemLida(m.id, !m.lida).subscribe({
      next: () => this.carregar(),
      error: (e) => this.aviso(e?.error?.mensagem ?? 'Falha ao atualizar.', true)
    });
  }

  resposta(assunto: string) { return encodeURIComponent('Re: ' + assunto + ' — ETEC Cuiabá'); }
  st(s: string) { return STATUS_EDITAL[s] ?? STATUS_EDITAL['encerrado']; }
  data(d: string | null) { return d ? formatarData(d) : ''; }

  private aviso(texto: string, erro = false) {
    this.msg.set(texto);
    this.msgErro.set(erro);
  }
}
