import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  perfil: 'ALUNO' | 'EGRESSO' | 'EMPRESA' | 'COORDENACAO' | 'ADMIN';
  alunoId?: number | null;
  empresaId?: number | null;
  cursoNome?: string | null;
  modulo?: number | null;
  egresso?: boolean;
  empresaNome?: string | null;
  empresaStatus?: string | null;
  sessaoMinutos?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly apiUrl = 'http://localhost:8080/api';

  readonly usuario = signal<UsuarioLogado | null>(this.carregarUsuarioSalvo());
  readonly token = signal<string | null>(localStorage.getItem('etec_vagas_token'));
  readonly modalAberto = signal<boolean>(false);
  readonly abaModal = signal<'login' | 'recuperar' | 'primeiro-acesso'>('login');
  readonly mensagemContextualModal = signal<string | null>(null);
  readonly rotaPosLogin = signal<string | null>(null);

  readonly logado = computed(() => !!this.usuario() && !!this.token());

  constructor(private http: HttpClient, private router: Router) {}

  private carregarUsuarioSalvo(): UsuarioLogado | null {
    try {
      const raw = localStorage.getItem('etec_vagas_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  abrirModalLogin(mensagem?: string, rotaDestino?: string, aba: 'login' | 'recuperar' | 'primeiro-acesso' = 'login') {
    this.mensagemContextualModal.set(mensagem ?? null);
    this.rotaPosLogin.set(rotaDestino ?? null);
    this.abaModal.set(aba);
    this.modalAberto.set(true);
  }

  fecharModalLogin() {
    this.modalAberto.set(false);
    this.mensagemContextualModal.set(null);
  }

  /**
   * Identifica automaticamente o tipo de entrada conforme a especificação:
   * - Contém @ -> E-mail de aluno ("Entrando como aluno (e-mail)")
   * - Só números, 11 dígitos -> CPF de aluno, com máscara 000.000.000-00 automática ("Entrando como aluno (CPF)")
   * - Qualquer outra coisa -> Login de empresa ("Entrando como empresa")
   */
  analisarEntradaUnificada(valor: string): { valorFormatado: string; tipo: 'EMAIL' | 'CPF' | 'EMPRESA' | 'VAZIO'; dica: string } {
    if (!valor || !valor.trim()) {
      return { valorFormatado: valor, tipo: 'VAZIO', dica: '' };
    }
    const v = valor.trim();
    if (v.includes('@')) {
      return {
        valorFormatado: v,
        tipo: 'EMAIL',
        dica: 'Entrando como aluno (e-mail)'
      };
    }

    const apenasDigitos = v.replace(/\D/g, '');
    const apenasDigitosEPontos = /^[0-9.\-]+$/.test(v);
    if (apenasDigitosEPontos && apenasDigitos.length === 11) {
      const formatado = `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3, 6)}.${apenasDigitos.slice(6, 9)}-${apenasDigitos.slice(9, 11)}`;
      return {
        valorFormatado: formatado,
        tipo: 'CPF',
        dica: 'Entrando como aluno (CPF)'
      };
    }

    return {
      valorFormatado: v,
      tipo: 'EMPRESA',
      dica: 'Entrando como empresa'
    };
  }

  login(identificador: string, senha: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { identificador, senha }).pipe(
      tap((res) => {
        if (res && res.sucesso && res.token && res.usuario) {
          localStorage.setItem('etec_vagas_token', res.token);
          localStorage.setItem('etec_vagas_user', JSON.stringify(res.usuario));
          this.token.set(res.token);
          this.usuario.set(res.usuario);
          this.fecharModalLogin();
          const destino = this.rotaPosLogin() || res.rotaPainel || '/';
          this.rotaPosLogin.set(null);
          this.router.navigateByUrl(destino);
        }
      })
    );
  }

  recuperarSenha(identificador: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/recuperar-senha`, { identificador });
  }

  conferirPrimeiroAcesso(cpf: string, matricula: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/primeiro-acesso/conferir`, { cpf, matricula });
  }

  ativarPrimeiroAcesso(cpf: string, matricula: string, senha: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/primeiro-acesso/ativar`, { cpf, matricula, senha }).pipe(
      tap((res) => {
        if (res && res.sucesso && res.token && res.usuario) {
          localStorage.setItem('etec_vagas_token', res.token);
          localStorage.setItem('etec_vagas_user', JSON.stringify(res.usuario));
          this.token.set(res.token);
          this.usuario.set(res.usuario);
          this.fecharModalLogin();
          this.router.navigateByUrl('/painel/aluno');
        }
      })
    );
  }

  rotaDoPainelAtual(): string {
    const u = this.usuario();
    if (!u) return '/';
    if (u.perfil === 'ALUNO' || u.perfil === 'EGRESSO') return '/painel/aluno';
    if (u.perfil === 'EMPRESA') return '/painel/empresa';
    return '/painel/etec';
  }

  logout() {
    localStorage.removeItem('etec_vagas_token');
    localStorage.removeItem('etec_vagas_user');
    this.token.set(null);
    this.usuario.set(null);
    this.router.navigateByUrl('/vagas');
  }
}
