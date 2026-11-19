import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly base = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  // ─── Portal Público ───
  listarCursos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/public/cursos`);
  }

  listarVagas(filtros: Record<string, any> = {}): Observable<any[]> {
    let params = new HttpParams();
    Object.keys(filtros).forEach((k) => {
      if (filtros[k] !== null && filtros[k] !== undefined && filtros[k] !== '') {
        params = params.set(k, String(filtros[k]));
      }
    });
    return this.http.get<any[]>(`${this.base}/public/vagas`, { params });
  }

  detalheVaga(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/public/vagas/${id}`);
  }

  denunciarVaga(vagaId: number, payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/public/vagas/${vagaId}/denunciar`, payload);
  }

  cadastrarEmpresa(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/public/empresas/cadastro`, payload);
  }

  // ─── Site Institucional (notícias, editais, agenda, contato) ───
  private readonly inst = 'http://localhost:8080/api/institucional';

  private params(filtros: Record<string, any>): HttpParams {
    let p = new HttpParams();
    Object.keys(filtros).forEach((k) => {
      if (filtros[k] !== null && filtros[k] !== undefined && filtros[k] !== '') p = p.set(k, String(filtros[k]));
    });
    return p;
  }

  resumoInstitucional(): Observable<any> {
    return this.http.get<any>(`${this.inst}/resumo`);
  }

  listarNoticias(filtros: Record<string, any> = {}): Observable<any[]> {
    return this.http.get<any[]>(`${this.inst}/noticias`, { params: this.params(filtros) });
  }

  detalheNoticia(slug: string): Observable<any> {
    return this.http.get<any>(`${this.inst}/noticias/${encodeURIComponent(slug)}`);
  }

  listarEditais(filtros: Record<string, any> = {}): Observable<any[]> {
    return this.http.get<any[]>(`${this.inst}/editais`, { params: this.params(filtros) });
  }

  listarAgenda(periodo: '' | 'proximos' | 'passados' = ''): Observable<any[]> {
    return this.http.get<any[]>(`${this.inst}/agenda`, { params: this.params({ periodo }) });
  }

  enviarContato(payload: any): Observable<any> {
    return this.http.post<any>(`${this.inst}/contato`, payload);
  }

  getInstitucionalAdmin(): Observable<any> {
    return this.http.get<any>(`${this.inst}/admin`);
  }

  salvarInstitucional(tipo: 'noticias' | 'editais' | 'agenda', payload: any, id?: number): Observable<any> {
    return id
      ? this.http.put<any>(`${this.inst}/admin/${tipo}/${id}`, payload)
      : this.http.post<any>(`${this.inst}/admin/${tipo}`, payload);
  }

  excluirInstitucional(tipo: 'noticias' | 'editais' | 'agenda' | 'mensagens', id: number): Observable<any> {
    return this.http.delete<any>(`${this.inst}/admin/${tipo}/${id}`);
  }

  marcarMensagemLida(id: number, lida: boolean): Observable<any> {
    return this.http.put<any>(`${this.inst}/admin/mensagens/${id}/lida`, { lida });
  }

  // ─── Painel do Aluno / Egresso ───
  getAlunoDashboard(): Observable<any> {
    return this.http.get<any>(`${this.base}/aluno/dashboard`);
  }

  salvarCurriculo(payload: any): Observable<any> {
    return this.http.put<any>(`${this.base}/aluno/curriculo`, payload);
  }

  uploadCurriculoPdf(nomeArquivo: string, base64: string): Observable<any> {
    return this.http.post<any>(`${this.base}/aluno/curriculo/pdf`, { nomeArquivo, base64 });
  }

  baixarCurriculoPdf(alunoId: number): Observable<Blob> {
    return this.http.get(`${this.base}/aluno/curriculo/pdf/${alunoId}`, { responseType: 'blob' });
  }

  candidatarVaga(vagaId: number, payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/aluno/vagas/${vagaId}/candidatar`, payload);
  }

  desistirCandidatura(candidaturaId: number): Observable<any> {
    return this.http.post<any>(`${this.base}/aluno/candidaturas/${candidaturaId}/desistir`, {});
  }

  alternarVagaSalva(vagaId: number): Observable<any> {
    return this.http.post<any>(`${this.base}/aluno/vagas/${vagaId}/salvar`, {});
  }

  lerTodasNotificacoes(): Observable<any> {
    return this.http.put<any>(`${this.base}/aluno/notificacoes/ler-todas`, {});
  }

  exportarDadosLgpd(): Observable<any> {
    return this.http.get<any>(`${this.base}/aluno/lgpd/exportar`);
  }

  excluirContaLgpd(): Observable<any> {
    return this.http.delete<any>(`${this.base}/aluno/lgpd/excluir-conta`);
  }

  // ─── Painel da Empresa ───
  getEmpresaDashboard(): Observable<any> {
    return this.http.get<any>(`${this.base}/empresa/dashboard`);
  }

  criarVagaEmpresa(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/empresa/vagas`, payload);
  }

  editarVagaEmpresa(vagaId: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.base}/empresa/vagas/${vagaId}`, payload);
  }

  duplicarVagaEmpresa(vagaId: number): Observable<any> {
    return this.http.post<any>(`${this.base}/empresa/vagas/${vagaId}/duplicar`, {});
  }

  encerrarVagaEmpresa(vagaId: number, contratadosIds: number[]): Observable<any> {
    return this.http.post<any>(`${this.base}/empresa/vagas/${vagaId}/encerrar`, { contratadosIds });
  }

  listarCandidatosDaVaga(vagaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/empresa/vagas/${vagaId}/candidatos`);
  }

  atualizarStatusCandidatosLote(payload: any): Observable<any> {
    return this.http.put<any>(`${this.base}/empresa/candidaturas/status-lote`, payload);
  }

  atualizarDadosEmpresa(payload: any): Observable<any> {
    return this.http.put<any>(`${this.base}/empresa/dados`, payload);
  }

  adicionarUsuarioEmpresa(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/empresa/usuarios`, payload);
  }

  // ─── Painel da ETEC (Coordenação & Admin TI) ───
  getEtecDashboard(): Observable<any> {
    return this.http.get<any>(`${this.base}/etec/dashboard`);
  }

  moderarEmpresa(empresaId: number, acao: string, motivo: string = ''): Observable<any> {
    return this.http.put<any>(`${this.base}/etec/empresas/${empresaId}/moderar`, { acao, motivo });
  }

  moderarVaga(vagaId: number, acao: string, motivo: string = ''): Observable<any> {
    return this.http.put<any>(`${this.base}/etec/vagas/${vagaId}/moderar`, { acao, motivo });
  }

  publicarVagaDiretaEtec(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/etec/vagas`, payload);
  }

  alternarEgressoAluno(alunoId: number): Observable<any> {
    return this.http.put<any>(`${this.base}/etec/alunos/${alunoId}/egresso`, {});
  }

  importarAlunosSecretaria(csv: string): Observable<any> {
    return this.http.post<any>(`${this.base}/etec/alunos/importar`, { csv });
  }

  baixarTermoEstagioPdf(estagioId: number): Observable<Blob> {
    return this.http.get(`${this.base}/etec/estagios/${estagioId}/termo-pdf`, { responseType: 'blob' });
  }

  atualizarEstagio(estagioId: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.base}/etec/estagios/${estagioId}/atualizar`, payload);
  }

  resolverDenuncia(denunciaId: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.base}/etec/denuncias/${denunciaId}/resolver`, payload);
  }

  exportarRelatorioCsv(): Observable<Blob> {
    return this.http.get(`${this.base}/etec/relatorios/exportar-csv`, { responseType: 'blob' });
  }

  exportarRelatorioPdf(): Observable<Blob> {
    return this.http.get(`${this.base}/etec/relatorios/exportar-pdf`, { responseType: 'blob' });
  }

  executarBackupSqlite(): Observable<any> {
    return this.http.post<any>(`${this.base}/etec/admin/backup`, {});
  }

  criarCursoTecnico(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/etec/admin/cursos`, payload);
  }
}
